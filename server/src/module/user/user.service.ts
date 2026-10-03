import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import {
  calculatePagination,
  createPaginatedResponse,
  hashPassword,
  isPrismaError,
} from '../../common/utils/index.js';
import { Prisma } from '../../generated/prisma/client.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import {
  PaginatedUsersResponse,
  USER_SELECT,
  UserResponse,
} from './types/user-response.type.js';

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Hashes a plaintext password using Argon2id.
   * Delegates to the shared password utility.
   */
  async hashPassword(password: string): Promise<string> {
    return hashPassword(password);
  }

  /**
   * Create a new user with hashed password.
   */
  async create(createUserDto: CreateUserDto): Promise<UserResponse> {
    const passwordHash = await this.hashPassword(createUserDto.password);

    try {
      return await this.prisma.user.create({
        data: {
          name: createUserDto.name,
          email: createUserDto.email,
          passwordHash,
          role: createUserDto.role,
        },
        select: USER_SELECT,
      });
    } catch (error) {
      if (isPrismaError(error, 'P2002')) {
        throw new ConflictException(`User with email '${createUserDto.email}' already exists`);
      }
      throw error;
    }
  }

  /**
   * Find paginated users with server-side pagination.
   */
  async findAll(page = 1, limit = 20): Promise<PaginatedUsersResponse> {
    const { skip, take, safePage, safeLimit } = calculatePagination(page, limit);

    const [total, data] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.findMany({
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        select: USER_SELECT,
      }),
    ]);

    return createPaginatedResponse(data, total, safePage, safeLimit);
  }

  /**
   * Find a single user by ID.
   */
  async findOne(id: string): Promise<UserResponse> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: USER_SELECT,
    });

    if (!user) {
      throw new NotFoundException(`User with ID '${id}' not found`);
    }

    return user;
  }

  /**
   * Update an existing user.
   */
  async update(id: string, updateUserDto: UpdateUserDto): Promise<UserResponse> {
    const updateData: Prisma.UserUpdateInput = {};

    if (updateUserDto.name !== undefined) {
      updateData.name = updateUserDto.name;
    }

    if (updateUserDto.email !== undefined) {
      updateData.email = updateUserDto.email;
    }

    if (updateUserDto.role !== undefined) {
      updateData.role = updateUserDto.role;
    }

    if (updateUserDto.isActive !== undefined) {
      updateData.isActive = updateUserDto.isActive;
    }

    if (updateUserDto.password !== undefined) {
      updateData.passwordHash = await this.hashPassword(updateUserDto.password);
    }

    try {
      return await this.prisma.user.update({
        where: { id },
        data: updateData,
        select: USER_SELECT,
      });
    } catch (error) {
      if (isPrismaError(error, 'P2002')) {
        throw new ConflictException(
          `User with email '${updateUserDto.email}' already exists`,
        );
      }
      if (isPrismaError(error, 'P2025')) {
        throw new NotFoundException(`User with ID '${id}' not found`);
      }
      throw error;
    }
  }

  /**
   * Soft-delete / deactivate a user.
   */
  async remove(id: string): Promise<UserResponse> {
    try {
      return await this.prisma.user.update({
        where: { id },
        data: { isActive: false },
        select: USER_SELECT,
      });
    } catch (error) {
      if (isPrismaError(error, 'P2025')) {
        throw new NotFoundException(`User with ID '${id}' not found`);
      }
      throw error;
    }
  }
}
