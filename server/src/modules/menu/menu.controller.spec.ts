import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { MenuController } from './menu.controller.js';
import { MenuService } from './menu.service.js';
describe('MenuController', () => {
  let controller: MenuController;
  let service: {
    createCategory: ReturnType<typeof vi.fn>;
    findCategories: ReturnType<typeof vi.fn>;
    findCategoryById: ReturnType<typeof vi.fn>;
    updateCategory: ReturnType<typeof vi.fn>;
    updateCategoryStatus: ReturnType<typeof vi.fn>;
    reorderCategories: ReturnType<typeof vi.fn>;
    addDishToCategory: ReturnType<typeof vi.fn>;
    removeDishFromCategory: ReturnType<typeof vi.fn>;
    reorderCategoryDishes: ReturnType<typeof vi.fn>;
    hideCategoryForCompany: ReturnType<typeof vi.fn>;
    unhideCategoryForCompany: ReturnType<typeof vi.fn>;
    hideDishForCompany: ReturnType<typeof vi.fn>;
    unhideDishForCompany: ReturnType<typeof vi.fn>;
    getEffectiveMenuForEmployee: ReturnType<typeof vi.fn>;
    getCategoryForEmployee: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    service = {
      createCategory: vi.fn(),
      findCategories: vi.fn(),
      findCategoryById: vi.fn(),
      updateCategory: vi.fn(),
      updateCategoryStatus: vi.fn(),
      reorderCategories: vi.fn(),
      addDishToCategory: vi.fn(),
      removeDishFromCategory: vi.fn(),
      reorderCategoryDishes: vi.fn(),
      hideCategoryForCompany: vi.fn(),
      unhideCategoryForCompany: vi.fn(),
      hideDishForCompany: vi.fn(),
      unhideDishForCompany: vi.fn(),
      getEffectiveMenuForEmployee: vi.fn(),
      getCategoryForEmployee: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [MenuController],
      providers: [
        {
          provide: MenuService,
          useValue: service,
        },
      ],
    }).compile();

    controller = module.get<MenuController>(MenuController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('Category Endpoints', () => {
    it('calls service.createCategory and returns result', async () => {
      const mockResult = {
        id: 'cat-1',
        name: 'Bowls',
        displayOrder: 1,
        isActive: true,
        isSecret: false,
        itemsCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      service.createCategory.mockResolvedValue(mockResult);

      const result = await controller.createCategory({
        name: 'Bowls',
        displayOrder: 1,
      });

      expect(service.createCategory).toHaveBeenCalledWith({
        name: 'Bowls',
        displayOrder: 1,
      });
      expect(result).toBe(mockResult);
    });

    it('calls service.findCategories with query params', async () => {
      const mockResult = {
        data: [],
        meta: { page: 1, limit: 20, total: 0, totalPages: 0 },
      };
      service.findCategories.mockResolvedValue(mockResult);

      const result = await controller.findCategories({ page: 1, limit: 20 });
      expect(service.findCategories).toHaveBeenCalled();
      expect(result).toBe(mockResult);
    });

    it('calls service.findCategoryById', async () => {
      service.findCategoryById.mockResolvedValue({ id: 'cat-1' });
      const result = await controller.findCategoryById('cat-1');
      expect(service.findCategoryById).toHaveBeenCalledWith('cat-1');
      expect(result).toEqual({ id: 'cat-1' });
    });

    it('calls service.updateCategory', async () => {
      service.updateCategory.mockResolvedValue({
        id: 'cat-1',
        name: 'Bowls',
      });
      const result = await controller.updateCategory('cat-1', {
        name: 'Bowls',
      });
      expect(service.updateCategory).toHaveBeenCalledWith('cat-1', {
        name: 'Bowls',
      });
      expect(result).toEqual({ id: 'cat-1', name: 'Bowls' });
    });

    it('calls service.updateCategoryStatus', async () => {
      service.updateCategoryStatus.mockResolvedValue({
        id: 'cat-1',
        isActive: false,
      });
      const result = await controller.updateCategoryStatus('cat-1', {
        isActive: false,
      });
      expect(service.updateCategoryStatus).toHaveBeenCalledWith('cat-1', {
        isActive: false,
      });
      expect(result).toEqual({ id: 'cat-1', isActive: false });
    });

    it('calls service.reorderCategories', async () => {
      service.reorderCategories.mockResolvedValue([]);
      const result = await controller.reorderCategories({
        categories: [{ categoryId: 'cat-1', displayOrder: 1 }],
      });
      expect(service.reorderCategories).toHaveBeenCalled();
      expect(result).toEqual([]);
    });
  });

  describe('Category Dish Endpoints', () => {
    it('calls service.addDishToCategory', async () => {
      service.addDishToCategory.mockResolvedValue({ id: 'cat-1', items: [] });
      const result = await controller.addDishToCategory('cat-1', {
        dishId: 'dish-1',
        displayOrder: 1,
      });
      expect(service.addDishToCategory).toHaveBeenCalledWith('cat-1', {
        dishId: 'dish-1',
        displayOrder: 1,
      });
      expect(result).toEqual({ id: 'cat-1', items: [] });
    });

    it('calls service.removeDishFromCategory', async () => {
      service.removeDishFromCategory.mockResolvedValue({ success: true });
      const result = await controller.removeDishFromCategory('cat-1', 'dish-1');
      expect(service.removeDishFromCategory).toHaveBeenCalledWith(
        'cat-1',
        'dish-1',
      );
      expect(result).toEqual({ success: true });
    });

    it('calls service.reorderCategoryDishes', async () => {
      service.reorderCategoryDishes.mockResolvedValue({
        id: 'cat-1',
        items: [],
      });
      const result = await controller.reorderCategoryDishes('cat-1', {
        items: [{ dishId: 'dish-1', displayOrder: 1 }],
      });
      expect(service.reorderCategoryDishes).toHaveBeenCalled();
      expect(result).toEqual({ id: 'cat-1', items: [] });
    });
  });

  describe('Company Hiding Endpoints', () => {
    it('calls service.hideCategoryForCompany', async () => {
      service.hideCategoryForCompany.mockResolvedValue({
        success: true,
        message: 'Hidden',
      });
      const result = await controller.hideCategoryForCompany('cat-1', 'comp-1');
      expect(service.hideCategoryForCompany).toHaveBeenCalledWith(
        'cat-1',
        'comp-1',
      );
      expect(result).toEqual({ success: true, message: 'Hidden' });
    });

    it('calls service.unhideCategoryForCompany', async () => {
      service.unhideCategoryForCompany.mockResolvedValue({
        success: true,
        message: 'Unhidden',
      });
      const result = await controller.unhideCategoryForCompany(
        'cat-1',
        'comp-1',
      );
      expect(service.unhideCategoryForCompany).toHaveBeenCalledWith(
        'cat-1',
        'comp-1',
      );
      expect(result).toEqual({ success: true, message: 'Unhidden' });
    });

    it('calls service.hideDishForCompany', async () => {
      service.hideDishForCompany.mockResolvedValue({
        success: true,
        message: 'Hidden',
      });
      const result = await controller.hideDishForCompany('dish-1', 'comp-1');
      expect(service.hideDishForCompany).toHaveBeenCalledWith(
        'dish-1',
        'comp-1',
      );
      expect(result).toEqual({ success: true, message: 'Hidden' });
    });

    it('calls service.unhideDishForCompany', async () => {
      service.unhideDishForCompany.mockResolvedValue({
        success: true,
        message: 'Unhidden',
      });
      const result = await controller.unhideDishForCompany('dish-1', 'comp-1');
      expect(service.unhideDishForCompany).toHaveBeenCalledWith(
        'dish-1',
        'comp-1',
      );
      expect(result).toEqual({ success: true, message: 'Unhidden' });
    });
  });

  describe('Employee Menu & Preview Endpoints', () => {
    it('getEmployeeMenu calls service.getEffectiveMenuForEmployee with employeeId', async () => {
      service.getEffectiveMenuForEmployee.mockResolvedValue({
        categories: [],
      });

      const result = await controller.getEmployeeMenu('emp-1');
      expect(service.getEffectiveMenuForEmployee).toHaveBeenCalledWith('emp-1');
      expect(result).toEqual({ categories: [] });
    });

    it('getEmployeeCategoryDirect calls service.getCategoryForEmployee', async () => {
      service.getCategoryForEmployee.mockResolvedValue({
        id: 'cat-1',
        name: 'Bowls',
        displayOrder: 1,
        items: [],
      });

      const result = await controller.getEmployeeCategoryDirect(
        'emp-1',
        'cat-1',
      );
      expect(service.getCategoryForEmployee).toHaveBeenCalledWith(
        'cat-1',
        'emp-1',
      );
      expect(result.id).toBe('cat-1');
    });

    it('previewEmployeeMenu calls getEffectiveMenuForEmployee with target employeeId', async () => {
      service.getEffectiveMenuForEmployee.mockResolvedValue({
        categories: [],
      });

      const result = await controller.previewEmployeeMenu('emp-target');
      expect(service.getEffectiveMenuForEmployee).toHaveBeenCalledWith(
        'emp-target',
      );
      expect(result).toEqual({ categories: [] });
    });

    it('previewEmployeeCategory calls getCategoryForEmployee with target employeeId', async () => {
      service.getCategoryForEmployee.mockResolvedValue({
        id: 'cat-1',
        name: 'Bowls',
        displayOrder: 1,
        items: [],
      });

      const result = await controller.previewEmployeeCategory(
        'emp-target',
        'cat-1',
      );
      expect(service.getCategoryForEmployee).toHaveBeenCalledWith(
        'cat-1',
        'emp-target',
      );
      expect(result.id).toBe('cat-1');
    });
  });
});
