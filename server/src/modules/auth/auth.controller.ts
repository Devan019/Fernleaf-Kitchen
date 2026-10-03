import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ApiBearerAuth,
  ApiBody,
  ApiCookieAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { CookieOptions, Response } from 'express';
import { AuthService } from './auth.service.js';
import { CurrentUser } from './decorators/current-user.decorator.js';
import { LoginDto } from './dto/login.dto.js';
import { JwtAuthGuard } from './guards/jwt-auth.guard.js';
import type { AuthenticatedUser } from './types/authenticated-user.type.js';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Helper to derive cookie options depending on the environment.
   */
  private getCookieOptions(): CookieOptions {
    const isProduction =
      this.configService.get<string>('NODE_ENV') === 'production';
    const secureConfig = this.configService.get<string>('COOKIE_SECURE');
    const secure =
      secureConfig !== undefined ? secureConfig === 'true' : isProduction;
    const sameSiteConfig = this.configService.get<'lax' | 'strict' | 'none'>(
      'COOKIE_SAME_SITE',
    );
    const sameSite = sameSiteConfig || (isProduction ? 'none' : 'lax');

    return {
      httpOnly: true,
      secure,
      sameSite,
      path: '/',
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    };
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Log in staff member with email and password' })
  @ApiBody({ type: LoginDto })
  @ApiResponse({
    status: 200,
    description: 'Successfully authenticated. Sets HTTP-only auth cookie.',
    schema: {
      type: 'object',
      properties: {
        user: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'cmurx19sp0000gkfr3mfbzjr8' },
            email: { type: 'string', example: 'admin@test.com' },
            role: { type: 'string', example: 'ADMIN' },
            name: { type: 'string', example: 'Admin User' },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Validation failed.' })
  @ApiResponse({ status: 401, description: 'Invalid email or password.' })
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { user, token } = await this.authService.login(loginDto);
    res.cookie('token', token, this.getCookieOptions());

    return { user };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiCookieAuth('token')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current authenticated staff user profile' })
  @ApiResponse({
    status: 200,
    description: 'Current user profile.',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', example: 'cmurx19sp0000gkfr3mfbzjr8' },
        email: { type: 'string', example: 'admin@test.com' },
        role: { type: 'string', example: 'ADMIN' },
        name: { type: 'string', example: 'Admin User' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  getMe(@CurrentUser() user: AuthenticatedUser): AuthenticatedUser {
    return user;
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Log out staff member and clear auth cookie (idempotent)',
  })
  @ApiResponse({
    status: 200,
    description: 'Successfully logged out.',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Logged out successfully' },
      },
    },
  })
  logout(@Res({ passthrough: true }) res: Response) {
    const cookieOptions = this.getCookieOptions();
    // exclude maxAge when clearing cookie
    const { maxAge: _, ...clearOptions } = cookieOptions;
    res.clearCookie('token', clearOptions);

    return {
      message: 'Logged out successfully',
    };
  }
}
