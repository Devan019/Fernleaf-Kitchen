import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  override handleRequest<TUser = any>(err: any, user: any, info: any): TUser {
    if (err || !user) {
      throw err || new UnauthorizedException(info?.message || 'Unauthorized');
    }
    return user;
  }
}
