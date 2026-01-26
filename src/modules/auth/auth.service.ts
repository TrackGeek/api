import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { URLSearchParams } from "node:url";

import { PrismaService } from "@/infra/prisma/prisma.service";
import { LoginWithGoogleDto } from "./dtos/login-with-google.dto";
import { HttpService } from "@nestjs/axios";
import { LoginWithDiscordDto } from "./dtos/login-with-discord.dto";
import { LoginWithGithubDto } from "./dtos/login-with-github.dto";
import { RequestEmailLoginDto } from "./dtos/request-email-login.dto";
import { ResendService } from "nestjs-resend/dist/resend.service";
import { LoginWithEmailDto } from "./dtos/login-with-email.dto";

@Injectable()
export class AuthService {
	private readonly logger = new Logger(AuthService.name);

	constructor(
		private readonly httpService: HttpService,
		private readonly jwtService: JwtService,
		private readonly prismaService: PrismaService,
		private readonly resendService: ResendService,
	) {}

	private async generateAccessToken(userId: string) {
		const accessToken = await this.jwtService.signAsync(
			{ userId },
			{
				secret: process.env.JWT_ACCESS_SECRET!,
				expiresIn: "1d",
			},
		);

		return accessToken;
	}

	private async generateRefreshToken(userId: string) {
		const refreshToken = await this.jwtService.signAsync(
			{ userId },
			{
				secret: process.env.JWT_REFRESH_SECRET!,
				expiresIn: "7d",
			},
		);

		await this.prismaService.refreshToken.create({
			data: {
				token: refreshToken,
				userId,
				expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
			},
		});

		return refreshToken;
	}

	private async createOrGetUser(email: string, name: string) {
		let user = await this.prismaService.user.findUnique({
			where: { email },
		});

		if (!user) {
			user = await this.prismaService.user.create({
				data: { email, name },
			});
		}

		return user;
	}

	private extractNameFromEmail(email: string): string {
		if (!email.includes("@")) return "";

		const name = email.split("@")[0].replace(/\./g, "");

		return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
	}

	async requestEmailLogin(emailLoginDto: RequestEmailLoginDto) {
		const { email } = emailLoginDto;

		const code = await this.jwtService.signAsync(
			{ email },
			{
				secret: process.env.JWT_ACCESS_SECRET!,
				expiresIn: "3h",
			},
		);

		const emailLoginUrl = `${process.env.API_URL}/auth/email/login?code=${code}`;

		await this.resendService.send({
			from: process.env.RESEND_FROM!,
			to: email,
			subject: "Sign in to TrackGeek",
			html: `
        <body style="margin: 0; padding: 40px 20px; font-family: Arial, sans-serif; background-color: #1c1917;">
          <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #1c1917; border: 1px solid #ffffff1a; border-radius: 8px; padding: 60px 40px;">
            <tr>
              <td style="text-align: center;">
                <h2 style="margin: 0 0 20px 0; color: #ffffff; font-size: 24px; font-weight: 500; line-height: 1.3;">
                  Hello, ${this.extractNameFromEmail(email)}!
                </h2>
                
                <p style="margin: 0 0 30px 0; color: #a6a09b; font-size: 18px; line-height: 1.5;">Click the button below to securely sign in to your account:</p>
              </td>
            </tr>
            <tr>
              <td style="text-align: center; padding: 20px 0;">
                <a href="${emailLoginUrl}" style="display: inline-block; background-color: #059669; color: #ffffff; font-size: 24px; font-weight: 600; padding: 20px; text-decoration: none; border-radius: 8px;">
                  Sign in to Track Geek
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

	async loginWithEmail(loginDto: LoginWithEmailDto) {
		const { code } = loginDto;

		try {
			const decoded = await this.jwtService.verifyAsync(code, {
				secret: process.env.JWT_ACCESS_SECRET!,
			});

			const email = decoded.email;

			const user = await this.createOrGetUser(
				email,
				this.extractNameFromEmail(email),
			);

			const accessToken = await this.generateAccessToken(user.id);
			const refreshToken = await this.generateRefreshToken(user.id);

			return {
				accessToken,
				refreshToken,
			};
		} catch (error) {
			this.logger.error(`Failed to login with Email: ${error.message}`);

			throw new BadRequestException("INVALID_OR_EXPIRED_EMAIL_LOGIN_CODE");
		}
	}

	async requestGoogleLogin() {
		const query = new URLSearchParams({
			client_id: process.env.GOOGLE_CLIENT_ID!,
			redirect_uri: process.env.GOOGLE_REDIRECT_URI!,
			response_type: "code",
			prompt: "consent",
			scope: [
				"https://www.googleapis.com/auth/userinfo.profile",
				"https://www.googleapis.com/auth/userinfo.email",
				"openid",
			].join(" "),
		});

		return decodeURI(
			`https://accounts.google.com/o/oauth2/v2/auth?${query.toString()}`,
		);
	}

	async loginWithGoogle(loginDto: LoginWithGoogleDto) {
		const { code } = loginDto;

		const googleTokenResponse = await this.httpService.axiosRef
			.post("https://oauth2.googleapis.com/token", {
				client_id: process.env.GOOGLE_CLIENT_ID!,
				client_secret: process.env.GOOGLE_CLIENT_SECRET!,
				code,
				grant_type: "authorization_code",
				redirect_uri: process.env.GOOGLE_REDIRECT_URI!,
			})
			.then((response) => ({
				accessToken: response.data.access_token,
				idToken: response.data.idToken,
			}))
			.catch((err) => {
				this.logger.error(
					"Error fetching Google tokens",
					err.response?.data ?? err.message,
				);

				return null;
			});

		if (!googleTokenResponse) {
			throw new BadRequestException("INVALID_GOOGLE_AUTHORIZATION_CODE");
		}

		const googleUserResponse = await this.httpService.axiosRef
			.get("https://www.googleapis.com/oauth2/v1/userinfo", {
				params: {
					alt: "json",
					access_token: googleTokenResponse.accessToken,
				},
				headers: {
					Authorization: `Bearer ${googleTokenResponse.idToken}`,
				},
			})
			.then((response) => ({
				id: response.data.id,
				email: response.data.email,
				name: response.data.name,
			}))
			.catch((err) => {
				this.logger.error(
					"Error fetching Google user info",
					err.response?.data ?? err.message,
				);

				return null;
			});

		if (!googleUserResponse) {
			throw new BadRequestException("COULD_NOT_FETCH_GOOGLE_USER_INFO");
		}

		const user = await this.createOrGetUser(
			googleUserResponse.email,
			googleUserResponse.name,
		);

		if (!user?.googleId) {
			await this.prismaService.user.update({
				where: { id: user.id },
				data: { googleId: googleUserResponse.id },
			});
		}

		const accessToken = await this.generateAccessToken(user.id);
		const refreshToken = await this.generateRefreshToken(user.id);

		return {
			accessToken,
			refreshToken,
		};
	}

	async requestDiscordLogin() {
		const query = new URLSearchParams({
			client_id: process.env.DISCORD_CLIENT_ID!,
			redirect_uri: process.env.DISCORD_REDIRECT_URI!,
			response_type: "code",
			scope: ["identify", "email", "openid"].join(" "),
		});

		return decodeURI(
			`https://discord.com/oauth2/authorize?${query.toString()}`,
		);
	}

	async loginWithDiscord(loginDto: LoginWithDiscordDto) {
		const { code } = loginDto;

		const discordTokenResponse = await this.httpService.axiosRef
			.post(
				"https://discord.com/api/v10/oauth2/token",
				new URLSearchParams({
					client_id: process.env.DISCORD_CLIENT_ID!,
					client_secret: process.env.DISCORD_CLIENT_SECRET!,
					code,
					grant_type: "authorization_code",
					redirect_uri: process.env.DISCORD_REDIRECT_URI!,
				}),
				{
					headers: {
						"Content-Type": "application/x-www-form-urlencoded",
					},
				},
			)
			.then((response) => ({
				accessToken: response.data.access_token,
			}))
			.catch((err) => {
				this.logger.error(
					"Error fetching Discord tokens",
					err.response?.data ?? err.message,
				);

				return null;
			});

		if (!discordTokenResponse) {
			throw new BadRequestException("INVALID_DISCORD_AUTHORIZATION_CODE");
		}

		const discordUserResponse = await this.httpService.axiosRef
			.get("https://discord.com/api/v10/users/@me", {
				headers: {
					Authorization: `Bearer ${discordTokenResponse.accessToken}`,
				},
			})
			.then((response) => ({
				id: response.data.id,
				email: response.data.email,
				name: response.data.username,
			}))
			.catch((err) => {
				this.logger.error(
					"Error fetching Discord user info",
					err.response?.data ?? err.message,
				);

				return null;
			});

		if (!discordUserResponse) {
			throw new BadRequestException("COULD_NOT_FETCH_DISCORD_USER_INFO");
		}

		const user = await this.createOrGetUser(
			discordUserResponse.email,
			discordUserResponse.name,
		);

		if (!user?.discordId) {
			await this.prismaService.user.update({
				where: { id: user.id },
				data: { discordId: discordUserResponse.id },
			});
		}

		const accessToken = await this.generateAccessToken(user.id);
		const refreshToken = await this.generateRefreshToken(user.id);

		return {
			accessToken,
			refreshToken,
		};
	}

	async requestGithubLogin() {
		const query = new URLSearchParams({
			client_id: process.env.GITHUB_CLIENT_ID!,
			redirect_uri: process.env.GITHUB_REDIRECT_URI!,
			prompt: "consent",
			scope: ["read:user", "user:email"].join(" "),
		});

		return decodeURI(
			`https://github.com/login/oauth/authorize?${query.toString()}`,
		);
	}

	async loginWithGithub(loginDto: LoginWithGithubDto) {
		const { code } = loginDto;

		const githubTokenResponse = await this.httpService.axiosRef
			.post(
				"https://github.com/login/oauth/access_token",
				{
					client_id: process.env.GITHUB_CLIENT_ID!,
					client_secret: process.env.GITHUB_CLIENT_SECRET!,
					code,
					redirect_uri: process.env.GITHUB_REDIRECT_URI!,
				},
				{
					headers: {
						Accept: "application/json",
						"X-GitHub-Api-Version": "2022-11-28",
					},
				},
			)
			.then((response) => ({
				accessToken: response.data.access_token,
			}))
			.catch((err) => {
				this.logger.error(
					"Error fetching GitHub tokens",
					err.response?.data ?? err.message,
				);

				return null;
			});

		if (!githubTokenResponse) {
			throw new BadRequestException("INVALID_GITHUB_AUTHORIZATION_CODE");
		}

		const githubUserResponse = await this.httpService.axiosRef
			.get("https://api.github.com/user", {
				headers: {
					Authorization: `Bearer ${githubTokenResponse.accessToken}`,
					Accept: "application/vnd.github+json",
					"X-GitHub-Api-Version": "2022-11-28",
				},
			})
			.then((response) => ({
				id: String(response.data.id),
				name: response.data.name,
			}))
			.catch((err) => {
				this.logger.error(
					"Error fetching GitHub user info",
					err.response?.data ?? err.message,
				);

				return null;
			});

		if (!githubUserResponse) {
			throw new BadRequestException("COULD_NOT_FETCH_GITHUB_USER_INFO");
		}

		const githubEmailResponse = await this.httpService.axiosRef
			.get("https://api.github.com/user/emails", {
				headers: {
					Authorization: `Bearer ${githubTokenResponse.accessToken}`,
					Accept: "application/vnd.github+json",
					"X-GitHub-Api-Version": "2022-11-28",
				},
			})
			.then((response) => {
				const primaryEmail =
					response.data.find((e: any) => e.primary)?.email ??
					response.data[0]?.email;

				return primaryEmail;
			})
			.catch((err) => {
				this.logger.error(
					"Error fetching GitHub emails",
					err.response?.data ?? err.message,
				);

				return null;
			});

		if (!githubEmailResponse) {
			throw new BadRequestException("COULD_NOT_FETCH_GITHUB_EMAIL");
		}

		const user = await this.createOrGetUser(
			githubEmailResponse,
			githubUserResponse.name,
		);

		if (!user?.githubId) {
			await this.prismaService.user.update({
				where: { id: user.id },
				data: { githubId: githubUserResponse.id },
			});
		}

		const accessToken = await this.generateAccessToken(user.id);
		const refreshToken = await this.generateRefreshToken(user.id);

		return {
			accessToken,
			refreshToken,
		};
	}

	async refreshTokens(oldRefreshToken: string) {
		const storedToken = await this.prismaService.refreshToken.findUnique({
			where: { token: oldRefreshToken },
		});

		if (!storedToken) {
			throw new BadRequestException("INVALID_REFRESH_TOKEN");
		}

		try {
			const decoded = await this.jwtService.verifyAsync(oldRefreshToken, {
				secret: process.env.JWT_REFRESH_SECRET!,
			});

			const userId = decoded.userId;

			const newAccessToken = await this.generateAccessToken(userId);
			const newRefreshToken = await this.generateRefreshToken(userId);

			await this.prismaService.refreshToken.delete({
				where: { token: oldRefreshToken },
			});

			return {
				accessToken: newAccessToken,
				refreshToken: newRefreshToken,
			};
		} catch (error) {
			throw new BadRequestException("INVALID_REFRESH_TOKEN");
		}
	}
}
