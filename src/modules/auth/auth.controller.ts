import { Controller, Get, HttpCode, HttpStatus, Logger, Query, Res, UseGuards } from '@nestjs/common';
import type { CookieOptions, Response } from 'express';

import { AuthService } from './auth.service';
import { AuthGuard } from './auth.guard';
import { GetCurrentUser } from './decorators/get-current-user.decorator';
import { LoginWithGoogleDto } from './dtos/login-with-google.dto';
import { LoginWithDiscordDto } from './dtos/login-with-discord.dto';
import { LoginWithGithubDto } from './dtos/login-with-github.dto';
import { RequestEmailLoginDto } from './dtos/request-email-login.dto';
import { LoginWithEmailDto } from './dtos/login-with-email.dto';

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthService.name);
  
  constructor(private readonly authService: AuthService) {}
  
  private cookieOptions: CookieOptions = { 
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/'
  };
  
  private postMessage(type: 'SUCCESS_LOGIN' | 'ERROR_LOGIN', message: string = ''): string   {
    return `
      <!DOCTYPE html>
      <html>
        <body>
          <p>Redirecting...</p>
          
          <script>
            window.opener.postMessage(JSON.stringify({ type: '${type}', message: '${message}' }), '${process.env.WEB_URL}');

            window.close();
          </script>
        </body>
      </html>
    `
  }
  
  @Get('email/request')
  @HttpCode(HttpStatus.OK)
  async getEmailLoginUrl(
    @Query() query: RequestEmailLoginDto,
    @Res({ passthrough: true }) response: Response
  ) {
    await this.authService.generateEmailLoginUrl(query);
  }
  
  @Get('email/login')
  @HttpCode(HttpStatus.OK)
  async loginWithEmail(
    @Query() query: LoginWithEmailDto,
    @Res({ passthrough: true }) response: Response
  ) {
    const { accessToken, refreshToken } = await this.authService.loginWithEmail(query);
    
    response.cookie('accessToken', accessToken, this.cookieOptions);
    response.cookie('refreshToken', refreshToken, this.cookieOptions);
    
    response.redirect(process.env.WEB_URL!);
    response.end()
  }
  
  @Get('google/request')
  async getGoogleLoginUrl() {
    const url = await this.authService.generateGoogleLoginUrl();
    
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
      
      response.cookie('accessToken', accessToken, this.cookieOptions);
      response.cookie('refreshToken', refreshToken, this.cookieOptions);
      
      response.send(this.postMessage('SUCCESS_LOGIN'));
    } catch (error) {
      this.logger.error(`Failed to login with Google: ${error.message}`);
      
      response.send(this.postMessage('ERROR_LOGIN', error?.message));
    }
  }
  
  @Get('discord/request')
  async getDiscordLoginUrl() {
    const url = await this.authService.generateDiscordLoginUrl();
    
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
      
      response.cookie('accessToken', accessToken, this.cookieOptions);
      response.cookie('refreshToken', refreshToken, this.cookieOptions);
      
      response.send(this.postMessage('SUCCESS_LOGIN'));
    } catch (error) {
      this.logger.error(`Failed to login with Discord: ${error.message}`);
      
      response.send(this.postMessage('ERROR_LOGIN', error?.message));
    }
  }
  
  @Get('github/request')
  async getGithubLoginUrl() {
    const url = await this.authService.generateGithubLoginUrl();
    
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
      
      response.cookie('accessToken', accessToken, this.cookieOptions);
      response.cookie('refreshToken', refreshToken, this.cookieOptions);
      
      response.send(this.postMessage('SUCCESS_LOGIN'));
    } catch (error) {
      this.logger.error(`Failed to login with Github: ${error.message}`);
      
      response.send(this.postMessage('ERROR_LOGIN', error?.message));
    }
  }
  
  @Get('refresh')
  @HttpCode(HttpStatus.OK)
  async refreshTokens(
    @Res({ passthrough: true }) response: Response
  ) {
    const oldRefreshToken = response.req.cookies?.['refreshToken'] ?? null;
    
    const { accessToken, refreshToken } = await this.authService.refreshTokens(oldRefreshToken);
    
    response.cookie('accessToken', accessToken, this.cookieOptions);
    response.cookie('refreshToken', refreshToken, this.cookieOptions);
  }
  
  @Get('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Res({ passthrough: true }) response: Response) {
    response.clearCookie('accessToken', this.cookieOptions);
    response.clearCookie('refreshToken', this.cookieOptions);
  }
  
  @Get('me')
  @UseGuards(AuthGuard)
  async me(@GetCurrentUser() user: string) {
    return { user };
  }
}
