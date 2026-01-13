import { PrismaService } from '@/infra/prisma/prisma.service';
import { CanActivate, ExecutionContext, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly prismaService: PrismaService,
  ) {}
  
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const authorization = context.switchToHttp().getRequest().headers['authorization'];
    
    if (!authorization) {
      throw new UnauthorizedException('No authorization header provided. ');
    }
    
    const token = authorization.replace('Bearer ', '');
      
    if (!token) {
      throw new UnauthorizedException('No token provided.');
    }
    
    try {
      const decoded = await this.jwtService.verifyAsync(token);
      const userId = decoded.userId;
      
      const user = await this.prismaService.user.findUnique({
        where: { id: userId },
        omit: {
          password: true,
        }
      });
      
      if (!user) {
        throw new NotFoundException('User not found.');
      }
      
      context.switchToHttp().getRequest().user = user;
      
      return true;
    } catch (error) {
      throw new UnauthorizedException()
    }
  }
}
