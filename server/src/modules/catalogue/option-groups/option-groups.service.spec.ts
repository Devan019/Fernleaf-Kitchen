import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { OptionGroupsService } from './option-groups.service.js';
import { PrismaService } from '../../../common/prisma/prisma.service.js';

describe('OptionGroupsService', () => {
  let service: OptionGroupsService;
  let prisma: {
    dish: {
      findUnique: ReturnType<typeof vi.fn>;
    };
    optionGroup: {
      findUnique: ReturnType<typeof vi.fn>;
      findFirst: ReturnType<typeof vi.fn>;
      findMany: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
      delete: ReturnType<typeof vi.fn>;
    };
    option: {
      findUnique: ReturnType<typeof vi.fn>;
    };
    portionSize: {
      findUnique: ReturnType<typeof vi.fn>;
    };
    optionGroupOption: {
      findUnique: ReturnType<typeof vi.fn>;
      findFirst: ReturnType<typeof vi.fn>;
      findMany: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
      delete: ReturnType<typeof vi.fn>;
    };
    optionGroupPortion: {
      findUnique: ReturnType<typeof vi.fn>;
      findFirst: ReturnType<typeof vi.fn>;
      findMany: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
      delete: ReturnType<typeof vi.fn>;
    };
    $transaction: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    prisma = {
      dish: {
        findUnique: vi.fn(),
      },
      optionGroup: {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      option: {
        findUnique: vi.fn(),
      },
      portionSize: {
        findUnique: vi.fn(),
      },
      optionGroupOption: {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      optionGroupPortion: {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      $transaction: vi.fn((cb: (tx: unknown) => unknown) => cb(prisma)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OptionGroupsService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    service = module.get<OptionGroupsService>(OptionGroupsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should throw NotFoundException if dish does not exist', async () => {
      prisma.dish.findUnique.mockResolvedValueOnce(null);

      await expect(
        service.create('dish-none', { name: 'Group 1' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should create option group and auto-increment displayOrder', async () => {
      prisma.dish.findUnique.mockResolvedValueOnce({ id: 'dish-1' });
      prisma.optionGroup.findFirst.mockResolvedValueOnce({ displayOrder: 2 });
      prisma.optionGroup.create.mockResolvedValueOnce({ id: 'grp-1' });

      // mock findOne response
      const mockResponse = {
        id: 'grp-1',
        dishId: 'dish-1',
        name: 'Group 1',
        isRequired: false,
        displayOrder: 3,
        usesPortions: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        portions: [],
        options: [],
      };
      prisma.optionGroup.findUnique.mockResolvedValueOnce({
        ...mockResponse,
        optionGroupPortions: [],
        optionGroupOptions: [],
      });

      const result = await service.create('dish-1', { name: 'Group 1' });
      expect(result.id).toBe('grp-1');
      expect(prisma.optionGroup.create).toHaveBeenCalledWith({
        data: {
          dishId: 'dish-1',
          name: 'Group 1',
          isRequired: false,
          displayOrder: 3,
          usesPortions: false,
        },
      });
    });
  });

  describe('Portion Business Rules (Critical)', () => {
    it('should reject adding an option to a portion-enabled group if option lacks support for any portion in the group', async () => {
      // Group uses portions, has Regular ('p-reg') and Large ('p-large')
      prisma.optionGroup.findUnique.mockResolvedValueOnce({
        id: 'grp-1',
        name: 'Choose protein',
        usesPortions: true,
        optionGroupPortions: [
          { portionSizeId: 'p-reg', portionSize: { name: 'Regular' } },
          { portionSizeId: 'p-large', portionSize: { name: 'Large' } },
        ],
      });

      // Option Chickpeas only supports Regular ('p-reg')
      prisma.option.findUnique.mockResolvedValueOnce({
        id: 'opt-chickpeas',
        name: 'Chickpeas',
        isActive: true,
        optionPortions: [{ portionSizeId: 'p-reg' }],
      });

      prisma.optionGroupOption.findUnique.mockResolvedValueOnce(null);

      await expect(
        service.addOption('grp-1', { optionId: 'opt-chickpeas' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should allow adding an option to a portion-enabled group when all group portions are supported', async () => {
      prisma.optionGroup.findUnique.mockResolvedValueOnce({
        id: 'grp-1',
        name: 'Choose protein',
        usesPortions: true,
        optionGroupPortions: [
          { portionSizeId: 'p-reg', portionSize: { name: 'Regular' } },
          { portionSizeId: 'p-large', portionSize: { name: 'Large' } },
        ],
      });

      // Paneer supports both Regular and Large
      prisma.option.findUnique.mockResolvedValueOnce({
        id: 'opt-paneer',
        name: 'Paneer',
        isActive: true,
        optionPortions: [
          { portionSizeId: 'p-reg' },
          { portionSizeId: 'p-large' },
        ],
      });

      prisma.optionGroupOption.findUnique.mockResolvedValueOnce(null);
      prisma.optionGroupOption.findFirst.mockResolvedValueOnce({
        displayOrder: 1,
      });
      prisma.optionGroupOption.create.mockResolvedValueOnce({});

      // Mock findOne for updated group
      prisma.optionGroup.findUnique.mockResolvedValueOnce({
        id: 'grp-1',
        dishId: 'dish-1',
        name: 'Choose protein',
        isRequired: true,
        displayOrder: 1,
        usesPortions: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        optionGroupPortions: [],
        optionGroupOptions: [],
      });

      const result = await service.addOption('grp-1', {
        optionId: 'opt-paneer',
      });
      expect(result.id).toBe('grp-1');
    });

    it('should reject adding a portion size to a group if any option currently in the group does not support it', async () => {
      // Group has Chickpeas, which lacks Large ('p-large')
      prisma.optionGroup.findUnique.mockResolvedValueOnce({
        id: 'grp-1',
        name: 'Choose protein',
        usesPortions: true,
        optionGroupOptions: [
          {
            option: {
              id: 'opt-chickpeas',
              name: 'Chickpeas',
              optionPortions: [{ portionSizeId: 'p-reg' }], // missing p-large!
            },
          },
        ],
      });

      prisma.portionSize.findUnique.mockResolvedValueOnce({
        id: 'p-large',
        name: 'Large',
        isActive: true,
      });

      prisma.optionGroupPortion.findUnique.mockResolvedValueOnce(null);

      await expect(
        service.addPortion('grp-1', { portionSizeId: 'p-large' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject adding inactive portion size to a group', async () => {
      prisma.optionGroup.findUnique.mockResolvedValueOnce({
        id: 'grp-1',
        name: 'Choose protein',
        usesPortions: true,
        optionGroupOptions: [],
      });

      prisma.portionSize.findUnique.mockResolvedValueOnce({
        id: 'p-large',
        name: 'Large',
        isActive: false, // inactive!
      });

      await expect(
        service.addPortion('grp-1', { portionSizeId: 'p-large' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('Options management', () => {
    it('should reject duplicate option in group with ConflictException', async () => {
      prisma.optionGroup.findUnique.mockResolvedValueOnce({
        id: 'grp-1',
        usesPortions: false,
        optionGroupPortions: [],
      });

      prisma.option.findUnique.mockResolvedValueOnce({
        id: 'opt-1',
        name: 'Paneer',
        isActive: true,
        optionPortions: [],
      });

      prisma.optionGroupOption.findUnique.mockResolvedValueOnce({
        id: 'ogo-1',
      }); // already exists!

      await expect(
        service.addOption('grp-1', { optionId: 'opt-1' }),
      ).rejects.toThrow(ConflictException);
    });

    it('should reject adding inactive option to group', async () => {
      prisma.optionGroup.findUnique.mockResolvedValueOnce({
        id: 'grp-1',
        usesPortions: false,
        optionGroupPortions: [],
      });

      prisma.option.findUnique.mockResolvedValueOnce({
        id: 'opt-1',
        name: 'Paneer',
        isActive: false, // inactive!
        optionPortions: [],
      });

      await expect(
        service.addOption('grp-1', { optionId: 'opt-1' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reorder options in group with 2-step collision-free update', async () => {
      // Group mock for findOne
      const mockGroup = {
        id: 'grp-1',
        dishId: 'dish-1',
        name: 'Group',
        isRequired: false,
        displayOrder: 1,
        usesPortions: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        optionGroupPortions: [],
        optionGroupOptions: [],
      };
      prisma.optionGroup.findUnique.mockResolvedValue(mockGroup);

      prisma.optionGroupOption.findMany.mockResolvedValueOnce([
        { optionId: 'opt-1' },
        { optionId: 'opt-2' },
      ]);

      const result = await service.reorderOptions('grp-1', {
        orderedOptionIds: ['opt-2', 'opt-1'],
      });

      expect(result.id).toBe('grp-1');
      expect(prisma.$transaction).toHaveBeenCalled();
    });
  });
});
