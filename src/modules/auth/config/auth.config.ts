import crypto from "node:crypto";
import { customSession, lastLoginMethod, magicLink } from "better-auth/plugins";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { ConfigService } from "@nestjs/config";
import type { BetterAuthOptions } from "@better-auth/core";

import type { DatabaseService } from "@/shared/infra/database/database.service";
import type { UserService } from "@/modules/user/user.service";
import type { QueueService } from "@/shared/infra/queue/queue.service";
import type { ProfileService } from '@/modules/profile/profile.service';

interface AuthConfigParams {
	configService?: ConfigService;
	databaseService?: DatabaseService;
	userService?: UserService;
	profileService?: ProfileService;
	queueService?: QueueService;
}

export function getAuthConfig(params: AuthConfigParams) {
	const { configService, databaseService, userService, profileService, queueService } =
		params as Required<AuthConfigParams>;

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
		user: {
			additionalFields: {
				username: {
					type: "string",
					required: true,
				},
				profile: {
					type: "json",
				},
			},
		},
		plugins: [
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
					await queueService.toSendMagicLinkQueue({ email, url });
				},
			}),
		],
		advanced: {
			database: {
				generateId: () => crypto.randomUUID(),
			},
		},
		databaseHooks: {
			user: {
				create: {
					before: async (user) => {
						const name = userService.getName(user.name, user.email);
						const username = await userService.getUsername(user.email);

						return {
							data: {
								name,
								username
							}
						}
					},
					after: async (user) => {
						await profileService.createProfile({
							userId: user.id,
							avatarUrl: user.image,
						});
					}
				},
			},
		},
	} as BetterAuthOptions;
}
