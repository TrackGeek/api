import crypto from "node:crypto";
import { customSession, lastLoginMethod, magicLink } from "better-auth/plugins";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { ConfigService } from "@nestjs/config";
import type { BetterAuthOptions } from "@better-auth/core";

import { DatabaseService } from "@/shared/infra/database/database.service";
import { UserService } from "@/modules/user/user.service";
import { QueueService } from "@/shared/infra/queue/queue.service";

interface AuthConfigParams {
	configService?: ConfigService;
	databaseService?: DatabaseService;
	userService?: UserService;
	queueService?: QueueService;
}

export function getAuthConfig(params: AuthConfigParams) {
	const { configService, databaseService, userService, queueService } =
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
				const user = await userService.getUserById(data.session.userId);

				return {
					session: data.session,
					user,
				};
			}),
			lastLoginMethod(),
			magicLink({
				sendMagicLink: async ({ email, url }) => {
					await queueService.sendMagicLinkQueue({ email, url });
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
					before: async ({ email, emailVerified, name, image }) => {
						await userService.createUser({
							email,
							emailVerified,
							name,
							image,
						});

						return false;
					},
				},
				update: {
					before: async ({ id, name, image }) => {
						await userService.updateUser({
							id: id!,
							name,
							image,
						});

						return false;
					},
				},
			},
		},
	} as BetterAuthOptions;
}
