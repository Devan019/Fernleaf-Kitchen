import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { UserService } from './user.service.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { PaginationQueryDto } from './dto/pagination-query.dto.js';
import {
  PaginatedUsersResponse,
  UserResponse,
} from './types/user-response.type.js';

@ApiTags('users')
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new staff user' })
  @ApiResponse({ status: 201, description: 'User successfully created.' })
  @ApiResponse({ status: 400, description: 'Validation failed.' })
  @ApiResponse({ status: 409, description: 'Email already exists.' })
  create(@Body() createUserDto: CreateUserDto): Promise<UserResponse> {
    return this.userService.create(createUserDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get paginated list of staff users' })
  @ApiResponse({ status: 200, description: 'List of users with pagination metadata.' })
  @ApiResponse({ status: 400, description: 'Invalid pagination query parameters.' })
  findAll(
    @Query() paginationQuery: PaginationQueryDto,
  ): Promise<PaginatedUsersResponse> {
    return this.userService.findAll(
      paginationQuery.page,
      paginationQuery.limit,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'User details found.' })
  @ApiResponse({ status: 404, description: 'User not found.' })
  findOne(@Param('id') id: string): Promise<UserResponse> {
    return this.userService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update user by ID' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'User successfully updated.' })
  @ApiResponse({ status: 400, description: 'Validation failed.' })
  @ApiResponse({ status: 404, description: 'User not found.' })
  @ApiResponse({ status: 409, description: 'Email already exists.' })
  update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<UserResponse> {
    return this.userService.update(id, updateUserDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Deactivate / soft-delete a user' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'User successfully deactivated.' })
  @ApiResponse({ status: 404, description: 'User not found.' })
  remove(@Param('id') id: string): Promise<UserResponse> {
    return this.userService.remove(id);
  }
}
