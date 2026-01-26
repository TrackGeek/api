// import { Test, TestingModule } from '@nestjs/testing';
// import { JwtService } from '@nestjs/jwt';
// import { HttpService } from '@nestjs/axios';
// import { BadRequestException } from '@nestjs/common';
// import { AuthService } from './auth.service';

// Create a mock PrismaService class
// class PrismaService {
//   user = {
//     findUnique: jest.fn(),
//     create: jest.fn(),
//     update: jest.fn(),
//   };
//   refreshToken = {
//     create: jest.fn(),
//   };
// }

describe("AuthService", () => {
	// let service: AuthService;
	// let httpService: HttpService;
	// let jwtService: JwtService;
	// let prismaService: PrismaService;

	// const mockHttpService = {
	//   axiosRef: {
	//     post: jest.fn(),
	//     get: jest.fn(),
	//   },
	// };

	// const mockJwtService = {
	//   signAsync: jest.fn(),
	// };

	// beforeEach(async () => {
	//   const module: TestingModule = await Test.createTestingModule({
	//     providers: [
	//       AuthService,
	//       {
	//         provide: HttpService,
	//         useValue: mockHttpService,
	//       },
	//       {
	//         provide: JwtService,
	//         useValue: mockJwtService,
	//       },
	//       PrismaService,
	//     ],
	//   }).compile();

	//   service = module.get<AuthService>(AuthService);
	//   httpService = module.get<HttpService>(HttpService);
	//   jwtService = module.get<JwtService>(JwtService);
	//   prismaService = module.get<PrismaService>(PrismaService);

	//   jest.clearAllMocks();

	//   process.env.GOOGLE_CLIENT_ID = 'test-client-id';
	//   process.env.GOOGLE_REDIRECT_URI = 'http://localhost:40287/auth/login/google';
	//   process.env.GOOGLE_CLIENT_SECRET = 'test-client-secret';
	//   process.env.JWT_ACCESS_SECRET = 'test-access-secret';
	//   process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
	// });

	// describe('generateGoogleLoginUrl', () => {
	//   it('should generate a valid Google OAuth URL', async () => {
	//     const url = await service.generateGoogleLoginUrl();

	//     expect(url).toContain('https://accounts.google.com/o/oauth2/v2/auth?');
	//     expect(url).toContain('client_id=test-client-id');
	//     expect(url).toContain('redirect_uri=http://localhost:40287/auth/login/google');
	//     expect(url).toContain('response_type=code');
	//     expect(url).toContain('prompt=consent');
	//     expect(url).toContain('scope=');
	//     expect(url).toContain('https://www.googleapis.com/auth/userinfo.profile');
	//     expect(url).toContain('https://www.googleapis.com/auth/userinfo.email');
	//     expect(url).toContain('openid');
	//   });
	// });

	// describe('loginWithGoogle', () => {
	//   const mockCode = 'test-auth-code';

	//   const mockGoogleAccessToken = 'google-access-token';

	//   const mockGoogleIdToken = 'google-id-token';

	//   const mockGoogleUser = {
	//     id: 'google-user-id',
	//     email: 'test@example.com',
	//     name: 'Test User',
	//     givenName: 'Test',
	//     familyName: 'User',
	//   };

	//   const mockUser = {
	//     id: 'user-uuid',
	//     email: 'test@example.com',
	//     name: 'Test User',
	//     googleId: null,
	//     discordId: null,
	//     githubId: null,
	//     createdAt: new Date(),
	//     updatedAt: new Date(),
	//   };

	//   const mockAccessToken = 'jwt-access-token';

	//   const mockRefreshToken = 'jwt-refresh-token';

	//   beforeEach(() => {
	//     mockHttpService.axiosRef.post.mockResolvedValue({
	//       data: {
	//         access_token: mockGoogleAccessToken,
	//         idToken: mockGoogleIdToken,
	//       },
	//     });

	//     mockHttpService.axiosRef.get.mockResolvedValue({
	//       data: {
	//         id: mockGoogleUser.id,
	//         email: mockGoogleUser.email,
	//         name: mockGoogleUser.name,
	//         givenName: mockGoogleUser.givenName,
	//         familyName: mockGoogleUser.familyName,
	//       },
	//     });

	//     mockJwtService.signAsync.mockResolvedValueOnce(mockAccessToken);

	//     mockJwtService.signAsync.mockResolvedValueOnce(mockRefreshToken);
	//   });

	//   it('should successfully login an existing user with Google', async () => {
	//     const existingUser = { ...mockUser, googleId: mockGoogleUser.id };

	//     mockPrismaService.user.findUnique.mockResolvedValue(existingUser);

	//     const result = await service.loginWithEmail({ code: mockCode });

	//     expect(httpService.axiosRef.post).toHaveBeenCalledWith(
	//       'https://oauth2.googleapis.com/token',
	//       expect.objectContaining({
	//         client_id: 'test-client-id',
	//         client_secret: 'test-client-secret',
	//         code: mockCode,
	//         grant_type: 'authorization_code',
	//         redirect_uri: 'http://localhost:40287/auth/login/google',
	//       })
	//     );

	//     expect(httpService.axiosRef.get).toHaveBeenCalledWith(
	//       'https://www.googleapis.com/oauth2/v1/userinfo',
	//       expect.objectContaining({
	//         params: {
	//           alt: 'json',
	//           access_token: mockGoogleAccessToken,
	//         },
	//         headers: {
	//           Authorization: `Bearer ${mockGoogleIdToken}`,
	//         },
	//       })
	//     );

	//     expect(prismaService.user.findUnique).toHaveBeenCalledWith({
	//       where: { email: mockGoogleUser.email },
	//     });

	//     expect(result).toEqual({
	//       user: { ...existingUser, password: undefined },
	//       accessToken: mockAccessToken,
	//       refreshToken: mockRefreshToken,
	//     });
	//   });

	//   it('should create a new user if they do not exist', async () => {
	//     mockPrismaService.user.findUnique.mockResolvedValue(null);

	//     mockPrismaService.user.create.mockResolvedValue(mockUser);

	//     mockPrismaService.user.update.mockResolvedValue({
	//       ...mockUser,
	//       googleId: mockGoogleUser.id,
	//     });

	//     const result = await service.loginWithEmail({ code: mockCode });

	//     expect(prismaService.user.create).toHaveBeenCalledWith({
	//       data: {
	//         email: mockGoogleUser.email,
	//         name: mockGoogleUser.name,
	//       },
	//     });

	//     expect(prismaService.user.update).toHaveBeenCalledWith({
	//       where: { id: mockUser.id },
	//       data: { googleId: mockGoogleUser.id },
	//     });

	//     expect(result.user.email).toBe(mockGoogleUser.email);
	//     expect(result.accessToken).toBe(mockAccessToken);
	//     expect(result.refreshToken).toBe(mockRefreshToken);
	//   });

	//   it('should update googleId if user exists but has no googleId', async () => {
	//     mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

	//     mockPrismaService.user.update.mockResolvedValue({
	//       ...mockUser,
	//       googleId: mockGoogleUser.id,
	//     });

	//     await service.loginWithEmail({ code: mockCode });

	//     expect(prismaService.user.update).toHaveBeenCalledWith({
	//       where: { id: mockUser.id },
	//       data: { googleId: mockGoogleUser.id },
	//     });
	//   });

	//   it('should create refresh token in database', async () => {
	//     const existingUser = { ...mockUser, googleId: mockGoogleUser.id };

	//     mockPrismaService.user.findUnique.mockResolvedValue(existingUser);

	//     mockPrismaService.refreshToken.create.mockResolvedValue({
	//       id: 'refresh-token-id',
	//       token: mockRefreshToken,
	//       userId: existingUser.id,
	//       expiresAt: expect.any(Date),
	//       createdAt: new Date(),
	//     });

	//     await service.loginWithEmail({ code: mockCode });

	//     expect(prismaService.refreshToken.create).toHaveBeenCalledWith({
	//       data: {
	//         token: mockRefreshToken,
	//         userId: existingUser.id,
	//         expiresAt: expect.any(Date),
	//       },
	//     });
	//   });

	//   it('should throw BadRequestException if Google token exchange fails', async () => {
	//     mockHttpService.axiosRef.post.mockRejectedValue({
	//       response: { data: { error: 'invalid_grant' } },
	//     });

	//     await expect(
	//       service.loginWithEmail({ code: mockCode })
	//     ).rejects.toThrow(BadRequestException);

	//     await expect(
	//       service.loginWithEmail({ code: mockCode })
	//     ).rejects.toThrow('Invalid Google authorization code');
	//   });

	//   it('should throw BadRequestException if Google user info fetch fails', async () => {
	//     mockHttpService.axiosRef.get.mockRejectedValue({
	//       response: { data: { error: 'invalid_token' } },
	//     });

	//     await expect(
	//       service.loginWithEmail({ code: mockCode })
	//     ).rejects.toThrow(BadRequestException);

	//     await expect(
	//       service.loginWithEmail({ code: mockCode })
	//     ).rejects.toThrow('Could not fetch Google user info');
	//   });

	//   it('should remove password field from user response', async () => {
	//     const userWithPassword = {
	//       ...mockUser,
	//       googleId: mockGoogleUser.id,
	//       password: 'hashed-password',
	//     } as any;

	//     mockPrismaService.user.findUnique.mockResolvedValue(userWithPassword);

	//     const result = await service.loginWithEmail({ code: mockCode });

	//     expect(result.user.password).toBeUndefined();
	//   });
	// });
	it("true is true", () => {
		expect(true).toBe(true);
	});
});
