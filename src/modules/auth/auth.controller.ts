import { Controller, Delete, Get, HttpCode, HttpStatus, Logger, Post, Query, Res, UploadedFile, UseInterceptors, UseGuards, Body, Patch } from '@nestjs/common';
import type { CookieOptions, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { FileInterceptor } from '@nestjs/platform-express';

import { AuthService } from './auth.service';
import { AuthGuard } from '@/shared/guards/auth.guard';
import { GetCurrentUser, type UserWithProfile } from '@/shared/decorators/get-current-user.decorator';
import { LoginWithGoogleDto } from './dtos/login-with-google.dto';
import { LoginWithDiscordDto } from './dtos/login-with-discord.dto';
import { LoginWithGithubDto } from './dtos/login-with-github.dto';
import { RequestEmailLoginDto } from './dtos/request-email-login.dto';
import { LoginWithEmailDto } from './dtos/login-with-email.dto';
import { ERROR_CODES } from '@/shared/constants/error-codes';
import { UserService } from '../user/user.service';
import { RateLimitGuard } from '@/shared/guards/ratelimit.guard';
import { RateLimit } from '@/shared/decorators/ratelimit.decorator';
import { AppException } from '@/shared/exceptions/app.exceptions';
import { UpdateUserDto } from '../user/dtos/update-user.dto';

@Controller('auth')
@UseGuards(RateLimitGuard)
@RateLimit({ limit: 30, window: 60, blockDuration: 300 })
export class AuthController {
  private cookieOptions: CookieOptions;
  private readonly logger = new Logger(AuthService.name);
  
  constructor(
    private readonly configService: ConfigService,
    private readonly authService: AuthService,
    private readonly userService: UserService,
  ) {
    this.cookieOptions = { 
      httpOnly: false,
      secure: this.configService.get<string>('NODE_ENV') === 'production',
      sameSite: 'lax',
      path: '/'
    };
  }
  
  private postMessage(type: 'SUCCESS_LOGIN' | 'ERROR_LOGIN', message: string = ''): string   {
    return `
      <!DOCTYPE html>
      <html>
        <body>
          <p>Redirecting...</p>
          
          <script>
            window.opener.postMessage(JSON.stringify({
              type: '${type}',
              message: '${message}'
            }), '${this.configService.get<string>('WEB_URL')}');

            window.close();
          </script>
        </body>
      </html>
    `
  }
  
  @Get('email/request')
  @HttpCode(HttpStatus.OK)
  async getEmailLoginUrl(@Query() query: RequestEmailLoginDto) {
    await this.authService.requestEmailLogin(query);
  }
  
  @Get('email/login')
  @HttpCode(HttpStatus.OK)
  async loginWithEmail(
    @Query() query: LoginWithEmailDto,
    @Res({ passthrough: true }) response: Response
  ) {
    const { accessToken, refreshToken } = await this.authService.loginWithEmail(query);
    
    response.cookie('trackgeek-access-token', accessToken, this.cookieOptions);
    response.cookie('trackgeek-refresh-token', refreshToken, this.cookieOptions);
    
    response.redirect(this.configService.get<string>('WEB_URL')!);
  }
  
  @Get('google/request')
  async getGoogleLoginUrl() {
    const url = await this.authService.requestGoogleLogin();
    
    return { url }
  }
  
  @Get('google/login')
  @HttpCode(HttpStatus.OK)
  async loginWithGoogle(
    @Query() query: LoginWithGoogleDto,
    @Res({ passthrough: true }) response: Response
  ) {
    try {
      const { accessToken, refreshToken } = await this.authService.loginWithGoogle(query);
      
      response.cookie('trackgeek-access-token', accessToken, this.cookieOptions);
      response.cookie('trackgeek-refresh-token', refreshToken, this.cookieOptions);
      
      response.send(this.postMessage('SUCCESS_LOGIN'));
    } catch (error) {
      this.logger.error(`Failed to login with Google: ${error?.stack ?? error?.message}`);
      
      response.send(this.postMessage('ERROR_LOGIN', error?.stack ?? error?.message));
    }
  }
  
  @Get('discord/request')
  async getDiscordLoginUrl() {
    const url = await this.authService.requestDiscordLogin();
    
    return { url }
  }
  
  @Get('discord/login')
  @HttpCode(HttpStatus.OK)
  async loginWithDiscord(
    @Query() query: LoginWithDiscordDto,
    @Res({ passthrough: true }) response: Response
  ) {
    try {
      const { accessToken, refreshToken } = await this.authService.loginWithDiscord(query);
      
      response.cookie('trackgeek-access-token', accessToken, this.cookieOptions);
      response.cookie('trackgeek-refresh-token', refreshToken, this.cookieOptions);
      
      response.send(this.postMessage('SUCCESS_LOGIN'));
    } catch (error) {
      this.logger.error(`Failed to login with Discord: ${error?.stack ?? error?.message}`);
      
      response.send(this.postMessage('ERROR_LOGIN', error?.stack ?? error?.message));
    }
  }
  
  @Get('github/request')
  async getGithubLoginUrl() {
    const url = await this.authService.requestGithubLogin();
    
    return { url }
  }
  
  @Get('github/login')
  @HttpCode(HttpStatus.OK)
  async loginWithGithub(
    @Query() query: LoginWithGithubDto,
    @Res({ passthrough: true }) response: Response
  ) {
    try {
      const { accessToken, refreshToken } = await this.authService.loginWithGithub(query);
      
      response.cookie('trackgeek-access-token', accessToken, this.cookieOptions);
      response.cookie('trackgeek-refresh-token', refreshToken, this.cookieOptions);
      
      response.send(this.postMessage('SUCCESS_LOGIN'));
    } catch (error) {
      this.logger.error(`Failed to login with Github: ${error?.stack ?? error?.message}`);
      
      response.send(this.postMessage('ERROR_LOGIN', error?.stack ?? error?.message));
    }
  }
  
  @Get('refresh')
  @HttpCode(HttpStatus.OK)
  async refreshTokens(
    @Res({ passthrough: true }) response: Response
  ) {
    const oldRefreshToken = response.req.cookies?.['trackgeek-refresh-token'] ?? null;
    
    const { accessToken, refreshToken } = await this.authService.refreshTokens(oldRefreshToken);
    
    response.cookie('trackgeek-access-token', accessToken, this.cookieOptions);
    response.cookie('trackgeek-refresh-token', refreshToken, this.cookieOptions);
  }
  
  @Get('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Res({ passthrough: true }) response: Response) {
    response.clearCookie('trackgeek-access-token', this.cookieOptions);
    response.clearCookie('trackgeek-refresh-token', this.cookieOptions);
  }
  
  @Get('me')
  @UseGuards(AuthGuard)
  async meGet(@GetCurrentUser() user: UserWithProfile) {
    return { user };
  }
  
  @Patch('me')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  async mePatch(
    @GetCurrentUser() user: UserWithProfile,
    @Body() body: UpdateUserDto,
  ) {
    await this.userService.updateUser(user.id, body);
  }
  
  @Post('me/avatar')
  @UseGuards(AuthGuard)
  @UseGuards(RateLimitGuard)
  @RateLimit({ limit: 4, window: 60, blockDuration: 300 })
  @UseInterceptors(FileInterceptor('file', {
    fileFilter: (_req, file, cb) => file.originalname.match(/\.(jpg|jpeg|png|gif)$/)
      ? cb(null, true)
      : cb(new AppException(ERROR_CODES.IMAGE_TYPE_NOT_SUPPORTED), false),
    limits: {
      fileSize: 1024 * 1024 * 5
    }
  }))
  @HttpCode(HttpStatus.OK)
  async meAvatarPost(
    @GetCurrentUser() user: UserWithProfile,
    @UploadedFile() file: Express.Multer.File
  ) {
    await this.userService.updateUserAvatar(user.id, file);
  }
  
  @Delete('me/avatar')
  @UseGuards(AuthGuard)
  async meAvatarDelete(@GetCurrentUser() user: UserWithProfile) {
    await this.userService.deleteUserAvatar(user.id);
  }
  
  @Post('me/banner')
  @UseGuards(AuthGuard)
  @UseGuards(RateLimitGuard)
  @RateLimit({ limit: 4, window: 60, blockDuration: 300 })
  @UseInterceptors(FileInterceptor('file', {
    fileFilter: (_req, file, cb) => file.originalname.match(/\.(jpg|jpeg|png|gif)$/)
      ? cb(null, true)
      : cb(new AppException(ERROR_CODES.IMAGE_TYPE_NOT_SUPPORTED), false),
    limits: {
      fileSize: 1024 * 1024 * 5
    }
  }))
  @HttpCode(HttpStatus.OK)
  async meBannerPost(
    @GetCurrentUser() user: UserWithProfile,
    @UploadedFile() file: Express.Multer.File
  ) {
    await this.userService.updateUserBanner(user.id, file);
  }
  
  @Delete('me/banner')
  @UseGuards(AuthGuard)
  async meBannerDelete(@GetCurrentUser() user: UserWithProfile) {
    await this.userService.deleteUserBanner(user.id);
  }
}
