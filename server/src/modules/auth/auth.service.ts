import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { verifyPassword } from '../../common/utils/index.js';
import { UserService } from '../user/user.service.js';
import { LoginDto } from './dto/login.dto.js';
import { AuthenticatedUser } from './types/authenticated-user.type.js';
import { JwtPayload } from './types/jwt-payload.type.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * Authenticate a staff user by email and password.
   * Generic 401 error is thrown if email not found, password mismatch, or user inactive.
   * Never exposes password hash or user existence clues.
   */
  async login(
    loginDto: LoginDto,
  ): Promise<{ user: AuthenticatedUser; token: string }> {
    const user = await this.userService.findByEmail(loginDto.email);

    // Reject unknown email with generic message
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Reject inactive account with generic message
    if (!user.isActive) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Verify password using Argon2
    const isPasswordValid = await verifyPassword(
      user.passwordHash,
      loginDto.password,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Construct minimal typed JWT payload
    const payload: JwtPayload = {
      sub: user.id,
      role: user.role,
    };

    const token = this.jwtService.sign(payload);

    // Safe user projection omitting passwordHash
    const safeUser: AuthenticatedUser = {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    };

    return {
      user: safeUser,
      token,
    };
  }

  /**
   * Helper to verify a JWT token and extract payload.
   */
  verifyToken(token: string): JwtPayload {
    return this.jwtService.verify<JwtPayload>(token);
  }
}
