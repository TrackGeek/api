import crypto from "node:crypto";
import type { BetterAuthOptions } from "@better-auth/core";
import { ConfigService } from "@nestjs/config";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { bearer, customSession, lastLoginMethod, magicLink, openAPI, username } from "better-auth/plugins";
import type { ProfileService } from "@/modules/profile/profile.service";
import type { UserService } from "@/modules/user/user.service";
import type { DatabaseService } from "@/shared/infra/database/database.service";
import type { QueueService } from "@/shared/infra/queue/queue.service";
import { Logger } from '@nestjs/common';

interface AuthConfigParams {
  configService?: ConfigService;
  databaseService?: DatabaseService;
  userService?: UserService;
  profileService?: ProfileService;
  queueService?: QueueService;
}

const logger = new Logger("BetterAuth");

export function getAuthConfig(params: AuthConfigParams) {
  const { configService, databaseService, userService, profileService, queueService } =
    params as Required<AuthConfigParams>;

  return {
    appName: "TrackGeek",
    logger: {
      level: "debug",
      log: (level, message, ...args) => logger.log(`[${level}] ${message}`, ...args),
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
      database: {
        generateId: () => crypto.randomUUID(),
      },
    },
    account: {
      accountLinking: {
        enabled: true,
        updateUserInfoOnLink: false,
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
          "email-password"
        ],
      },
    },
    user: {
      additionalFields: {
        profile: {
          type: "json",
        },
      },
    },
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 8,
      resetPasswordTokenExpiresIn: 60 * 60 * 3, // 3 hours
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
        tenantId: 'common', 
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
          await queueService.toMagicLinkJob({ email, url });
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
          },
        },
      },
    },
  } as BetterAuthOptions;
}
