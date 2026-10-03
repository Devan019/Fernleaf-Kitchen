import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '../../../generated/prisma/enums.js';
import { ROLES_KEY } from '../decorators/roles.decorator.js';
import { AuthenticatedUser } from '../types/authenticated-user.type.js';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest<{ user?: AuthenticatedUser }>();

    if (!user || !user.role) {
      throw new ForbiddenException('Access denied: User has no valid role');
    }

    const hasRole = requiredRoles.includes(user.role);
    if (!hasRole) {
      throw new ForbiddenException(
        `Access denied: Required role(s) [${requiredRoles.join(', ')}] but user has role '${user.role}'`,
      );
    }

    return true;
  }
}
