import crypto from 'node:crypto';
import { customSession, lastLoginMethod, magicLink } from 'better-auth/plugins';
import { prismaAdapter } from "better-auth/adapters/prisma";
import type { ConfigService } from '@nestjs/config';
import type { BetterAuthOptions } from "@better-auth/core";
import type { ResendService } from 'nestjs-resend';

import type { DatabaseService } from '../infra/database/database.service';
import type { UploadService } from '../infra/upload/upload.service';
import { extractNameFromEmail } from '../utils/email';

interface AuthConfigParams {
  configService?: ConfigService;
  databaseService?: DatabaseService;
  uploadService?: UploadService;
  resendService?: ResendService;
}

export function getAuthConfig(params: AuthConfigParams) {
  const { configService, databaseService, uploadService, resendService } = params as Required<AuthConfigParams>;
  
  return {
    appName: "TrackGeek",
    database: prismaAdapter(databaseService, {
      provider: "postgresql",
    }),
    basePath: "/auth",
    baseURL: configService.get<string>("BETTER_AUTH_URL"),
    secret: configService.get<string>("BETTER_AUTH_SECRET"),
    trustedOrigins: [configService.get<string>("WEB_URL")],
    socialProviders: {
      google: {
        prompt: "consent",
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
    },
    plugins: [
      customSession(async (data) => {
        const user = await databaseService.user.findUnique({
          where: { id: data.session.userId },
          include: { profile: true }
        });
        
        return {
          session: data.session,
          user,
        };
      }),
      lastLoginMethod(),
      magicLink({
        sendMagicLink: async ({ email, url }) => {
          await resendService.send({
            from: configService.get<string>("RESEND_FROM")!,
            to: email,
            subject: "Sign in to TrackGeek",
            html: `
              <body style="margin: 0; padding: 40px 20px; font-family: Arial, sans-serif; background-color: #1c1917;">
                <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #1c1917; border: 1px solid #ffffff1a; border-radius: 8px; padding: 60px 40px;">
                  <tr>
                    <td style="text-align: center;">
                      <h2 style="margin: 0 0 20px 0; color: #ffffff; font-size: 24px; font-weight: 500; line-height: 1.3;">
                        Hello, ${extractNameFromEmail(email)}!
                      </h2>
                      
                      <p style="margin: 0 0 30px 0; color: #a6a09b; font-size: 18px; line-height: 1.5;">Click the button below to securely sign in to your account:</p>
                    </td>
                  </tr>
                  <tr>
                    <td style="text-align: center; padding: 20px 0;">
                      <a href="${url}" style="display: inline-block; background-color: #10b981; color: #ffffff; font-size: 24px; font-weight: 600; padding: 20px; text-decoration: none; border-radius: 8px;">
                        Sign in to TrackGeek
                      </a>
                    </td>
                  </tr>
                  <tr>
                    <td style="text-align: center; padding-top: 20px;">
                      <p style="margin: 0; color: #a6a09b; font-size: 16px; line-height: 1.5;">
                        If you did not request this link, please ignore this email.
                      </p>
                    </td>
                  </tr>
                </table>
              </body>
            `,
          });
        }
      })
    ],
    advanced: {
      database: {
        generateId: () => crypto.randomUUID(),
      }
    },
    databaseHooks: {
      user: {
        create: {
          before: async (data) => {
            let existingUser = await databaseService.user.findUnique({
              where: { email: data.email }
            });
            
            if (existingUser) {
              return;
            }
            
            const emailPrefix = data.email.split('@')[0];

            let baseUsername = emailPrefix
              .toLowerCase()
              .replace(/[^a-z0-9]/g, '');

            const usernameExists = await databaseService.user.findUnique({
              where: { username: baseUsername }
            });

            const username = usernameExists
              ? `${baseUsername}${Math.floor(Math.random() * 10000)}`
              : baseUsername;

            const avatarUrl = data.image 
              ? await uploadService.uploadFromUrl(data.image) 
              : undefined;

            await databaseService.user.create({
              data: {
                id: data.id,
                email: data.email,
                name: data.name?.length > 0 ? data.name : extractNameFromEmail(data.email),
                username,
                emailVerified: data.emailVerified ?? false,
                profile: {
                  create: {
                    avatarUrl
                  }
                }
              },
              include: {
                profile: true
              }
            });
          }
        }
      }
    },
  } as BetterAuthOptions
}

// export const auth = betterAuth(getAuthConfig({
//   configService: new ConfigService(),
//   databaseService: {} as DatabaseService,
//   uploadService: {} as UploadService,
// }))