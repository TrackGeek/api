import type { BetterAuthOptions } from "@better-auth/core";
import { Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ActivityType } from "@prisma/generated/enums";
import * as bcrypt from "bcrypt";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { bearer, customSession, lastLoginMethod, magicLink, openAPI, twoFactor, username } from "better-auth/plugins";
import uuid from "uuid";
import type { StripeService } from "@/modules/payment/service/stripe.service";
import type { ProfileService } from "@/modules/profile/service/profile.service";
import type { UserService } from "@/modules/user/service/user.service";
import type { DatabaseService } from "@/shared/infra/database/database.service";
import type { QueueService } from "@/shared/infra/queue/queue.service";

interface AuthConfigParams {
  configService?: ConfigService;
  databaseService?: DatabaseService;
  userService?: UserService;
  profileService?: ProfileService;
  queueService?: QueueService;
  stripeService?: StripeService;
}

const logger = new Logger("BetterAuth");

export function getAuthConfig(params: AuthConfigParams) {
  const { configService, databaseService, userService, profileService, queueService, stripeService } =
    params as Required<AuthConfigParams>;

  const authLogLevel = configService.get<"debug" | "info" | "warn" | "error">("BETTER_AUTH_LOG_LEVEL") ?? "info";

  return {
    appName: "TrackGeek",
    logger: {
      level: authLogLevel,
      log: (level, message, ...args) => {
        if (level === "error") return logger.error(message, ...args);
        if (level === "warn") return logger.warn(message, ...args);
        if (level === "debug") return logger.debug(message, ...args);

        return logger.log(message, ...args);
      },
    },
    database: prismaAdapter(databaseService, {
      provider: "postgresql",
    }),
    basePath: "/auth",
    baseURL: configService.get<string>("BETTER_AUTH_URL"),
    secret: configService.get<string>("BETTER_AUTH_SECRET"),
    trustedOrigins: [
      configService.get<string>("WEB_URL"),
      "com.trackgeek.net.mobile.ios://auth/callback",
      "com.trackgeek.net.mobile.android://auth/callback",
      "trackgeek://auth/callback",
    ],
    advanced: {
      disableCSRFCheck: process.env.NODE_ENV !== "production",
      disableOriginCheck: process.env.NODE_ENV !== "production",
      database: {
        generateId: () => uuid.v7(),
      },
    },
    account: {
      accountLinking: {
        enabled: true,
        allowDifferentEmails: true,
        updateUserInfoOnLink: false,
        // https://github.com/TrackGeek/api/pull/43#discussion_r2875336763
        trustedProviders: [
          "google",
          "github",
          "discord",
          "twitch",
          "kick",
          "twitter",
          "tiktok",
          "roblox",
          "slack",
          "microsoft",
          "notion",
          "spotify",
          "email-password",
        ],
      },
    },
    user: {
      additionalFields: {
        tier: {
          type: "string",
          required: false,
        },
        tierStartedAt: {
          type: "string",
          required: false,
        },
        role: {
          type: "string",
          required: false,
        },
        profile: {
          type: "json",
          required: false,
        },
      },
      deleteUser: {
        enabled: true,
        deleteTokenExpiresIn: 60 * 60 * 3,
        sendDeleteAccountVerification: async ({ user, url }) => {
          await queueService.toDeleteAccountJob({
            name: userService.getName(user.name, user.email),
            email: user.email,
            url,
          });
        },
        beforeDelete: async (user) => {
          try {
            const subscription = await stripeService.getCurrentSubscription(user.id);

            if (subscription) {
              await stripeService.cancelCurrentSubscription(user.id);
            }
          } catch (error: any) {
            logger.error(`Failed to cancel subscription before deleting user | user=${user.id} error=${error.message}`);
          }
        },
      },
    },
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 8,
      resetPasswordTokenExpiresIn: 60 * 60 * 3,
      password: {
        hash: (password) => bcrypt.hash(password, 12),
        verify: ({ password, hash }) => bcrypt.compare(password, hash),
      },
      sendResetPassword: async ({ user, url }) => {
        await queueService.toResetPasswordJob({
          name: user.name,
          email: user.email,
          url,
        });
      },
    },
    socialProviders: {
      google: {
        clientId: configService.get<string>("GOOGLE_CLIENT_ID"),
        clientSecret: configService.get<string>("GOOGLE_CLIENT_SECRET"),
      },
      github: {
        clientId: configService.get<string>("GITHUB_CLIENT_ID"),
        clientSecret: configService.get<string>("GITHUB_CLIENT_SECRET"),
      },
      discord: {
        clientId: configService.get<string>("DISCORD_CLIENT_ID"),
        clientSecret: configService.get<string>("DISCORD_CLIENT_SECRET"),
      },
      twitch: {
        clientId: configService.get<string>("TWITCH_CLIENT_ID"),
        clientSecret: configService.get<string>("TWITCH_CLIENT_SECRET"),
      },
      kick: {
        clientId: configService.get<string>("KICK_CLIENT_ID"),
        clientSecret: configService.get<string>("KICK_CLIENT_SECRET"),
      },
      twitter: {
        clientId: configService.get<string>("TWITTER_CLIENT_ID"),
        clientSecret: configService.get<string>("TWITTER_CLIENT_SECRET"),
      },
      slack: {
        clientId: configService.get<string>("SLACK_CLIENT_ID"),
        clientSecret: configService.get<string>("SLACK_CLIENT_SECRET"),
        scope: ["openid", "profile", "email"],
      },
      microsoft: {
        clientId: configService.get<string>("MICROSOFT_CLIENT_ID"),
        clientSecret: configService.get<string>("MICROSOFT_CLIENT_SECRET"),
        tenantId: "common",
        authority: "https://login.microsoftonline.com",
        prompt: "select_account",
      },
      notion: {
        clientId: configService.get<string>("NOTION_CLIENT_ID"),
        clientSecret: configService.get<string>("NOTION_CLIENT_SECRET"),
      },
      spotify: {
        clientId: configService.get<string>("SPOTIFY_CLIENT_ID"),
        clientSecret: configService.get<string>("SPOTIFY_CLIENT_SECRET"),
      },
    },
    plugins: [
      openAPI({ path: "/docs" }),
      bearer(),
      username(),
      twoFactor({
        issuer: "TrackGeek",
        skipVerificationOnEnable: false,
        totpOptions: {
          digits: 6,
          period: 30,
        },
        backupCodeOptions: {
          amount: 10,
          length: 10,
          storeBackupCodes: "encrypted",
        },
      }),
      customSession(async (data) => {
        const user = await userService.getUserById(data.session.userId);

        return {
          session: data.session,
          user,
        };
      }),
      lastLoginMethod(),
      magicLink({
        sendMagicLink: async ({ email, url }) => {
          const user = await databaseService.user.findUnique({
            where: { email },
            select: { name: true },
          });

          await queueService.toMagicLinkJob({
            name: userService.getName(user?.name, email),
            email,
            url,
          });
        },
      }),
    ],
    databaseHooks: {
      user: {
        create: {
          before: async (user) => {
            const name = userService.getName(user.name, user.email);
            const username = await userService.getUsername(user.email);

            return {
              data: {
                name,
                username,
              },
            };
          },
          after: async (user) => {
            await profileService.createProfile({
              userId: user.id,
              avatarUrl: user.image,
            });

            await queueService.toActivityJob({
              type: ActivityType.AccountCreated,
              userId: user.id,
              metadata: {
                id: user.id,
                name: user.name,
              },
            });

            await queueService.toSystemNotificationJob({
              recipientIds: [user.id],
              metadata: {
                titleKey: "notifications:welcome.title",
                descriptionKey: "notifications:welcome.description",
              },
            });
          },
        },
      },
    },
  } as BetterAuthOptions;
}
