import { Test, TestingModule } from '@nestjs/testing';
import { UserRole } from '../../generated/prisma/enums.js';
import { UserController } from './user.controller.js';
import { UserService } from './user.service.js';

describe('UserController', () => {
  let controller: UserController;
  let service: {
    create: ReturnType<typeof vi.fn>;
    findAll: ReturnType<typeof vi.fn>;
    findOne: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    remove: ReturnType<typeof vi.fn>;
  };

  const mockSafeUser = {
    id: 'user-cuid-1',
    name: 'Admin User',
    email: 'admin@test.com',
    role: UserRole.ADMIN,
    isActive: true,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  };

  beforeEach(async () => {
    service = {
      create: vi.fn(),
      findAll: vi.fn(),
      findOne: vi.fn(),
      update: vi.fn(),
      remove: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
      providers: [
        {
          provide: UserService,
          useValue: service,
        },
      ],
    }).compile();

    controller = module.get<UserController>(UserController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('calls service.create and returns result', async () => {
      service.create.mockResolvedValue(mockSafeUser);

      const dto = {
        name: 'Admin User',
        email: 'admin@test.com',
        password: 'Test@1234',
        role: UserRole.ADMIN,
      };

      const result = await controller.create(dto);

      expect(service.create).toHaveBeenCalledWith(dto);
      expect(result).toEqual(mockSafeUser);
    });
  });

  describe('findAll', () => {
    it('calls service.findAll with query parameters', async () => {
      const paginatedResult = {
        data: [mockSafeUser],
        meta: {
          page: 1,
          limit: 10,
          total: 1,
          totalPages: 1,
        },
      };
      service.findAll.mockResolvedValue(paginatedResult);

      const result = await controller.findAll({ page: 1, limit: 10 });

      expect(service.findAll).toHaveBeenCalledWith(1, 10);
      expect(result).toEqual(paginatedResult);
    });
  });

  describe('findOne', () => {
    it('calls service.findOne with id param', async () => {
      service.findOne.mockResolvedValue(mockSafeUser);

      const result = await controller.findOne('user-cuid-1');

      expect(service.findOne).toHaveBeenCalledWith('user-cuid-1');
      expect(result).toEqual(mockSafeUser);
    });
  });

  describe('update', () => {
    it('calls service.update with id and body', async () => {
      const updatedUser = { ...mockSafeUser, name: 'New Name' };
      service.update.mockResolvedValue(updatedUser);

      const dto = { name: 'New Name' };
      const result = await controller.update('user-cuid-1', dto);

      expect(service.update).toHaveBeenCalledWith('user-cuid-1', dto);
      expect(result).toEqual(updatedUser);
    });
  });

  describe('remove', () => {
    it('calls service.remove with id', async () => {
      const deactivated = { ...mockSafeUser, isActive: false };
      service.remove.mockResolvedValue(deactivated);

      const result = await controller.remove('user-cuid-1');

      expect(service.remove).toHaveBeenCalledWith('user-cuid-1');
      expect(result).toEqual(deactivated);
    });
  });
});
