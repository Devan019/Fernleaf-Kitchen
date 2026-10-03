import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import type { Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UserService } from '../../user/user.service.js';
import { AuthenticatedUser } from '../types/authenticated-user.type.js';
import { JwtPayload } from '../types/jwt-payload.type.js';

/**
 * Extracts JWT token from either HTTP-only cookie 'token' or raw cookie header.
 */
export const cookieExtractor = (req: Request): string | null => {
  if (req?.cookies && typeof req.cookies['token'] === 'string') {
    return req.cookies['token'];
  }
  if (req?.headers?.cookie) {
    const rawCookies = req.headers.cookie.split(';');
    for (const cookie of rawCookies) {
      const [name, ...rest] = cookie.trim().split('=');
      if (name === 'token') {
        return decodeURIComponent(rest.join('='));
      }
    }
  }
  return null;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    configService: ConfigService,
    private readonly userService: UserService,
  ) {
    const secret = configService.get<string>('JWT_SECRET');
    if (!secret) {
      throw new Error('JWT_SECRET environment variable is not defined');
    }

    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        cookieExtractor,
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  /**
   * Validate the decoded JWT payload by verifying the current user state against the database.
   */
  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    if (!payload?.sub) {
      throw new UnauthorizedException('Invalid token payload');
    }

    try {
      const user = await this.userService.findOne(payload.sub);
      if (!user || !user.isActive) {
        throw new UnauthorizedException(
          'User account is inactive or not found',
        );
      }

      return {
        id: user.id,
        email: user.email,
        role: user.role,
        name: user.name,
      };
    } catch {
      throw new UnauthorizedException('User account is inactive or not found');
    }
  }
}
