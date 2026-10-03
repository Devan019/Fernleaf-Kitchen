export enum Permission {
  // User management
  USER_CREATE = 'user:create',
  USER_READ = 'user:read',
  USER_UPDATE = 'user:update',
  USER_DELETE = 'user:delete',

  // Kitchen operations
  KITCHEN_READ = 'kitchen:read',
  KITCHEN_UPDATE = 'kitchen:update',
  KITCHEN_FORCE_COMPLETE = 'kitchen:force_complete',

  // Dispatch operations
  DISPATCH_READ = 'dispatch:read',
  DISPATCH_UPDATE = 'dispatch:update',
  DISPATCH_ASSIGN_DRIVER = 'dispatch:assign_driver',

  // Delivery operations
  DELIVERY_READ_ALL = 'delivery:read_all',
  DELIVERY_TRACK = 'delivery:track',
  DELIVERY_READ_OWN = 'delivery:read_own',
  DELIVERY_UPDATE_OWN = 'delivery:update_own',

  // Catalogue operations
  CATALOGUE_READ = 'catalogue:read',
  CATALOGUE_CREATE = 'catalogue:create',
  CATALOGUE_UPDATE = 'catalogue:update',
  CATALOGUE_DELETE = 'catalogue:delete',
  CATALOGUE_MANAGE_REFERENCE_DATA = 'catalogue:manage_reference_data',
  CATALOGUE_MANAGE_OPTIONS = 'catalogue:manage_options',
  CATALOGUE_MANAGE_GROUPS = 'catalogue:manage_groups',
  CATALOGUE_MANAGE_IMAGES = 'catalogue:manage_images',

  // Menu operations
  MENU_READ = 'menu:read',
  MENU_CREATE = 'menu:create',
  MENU_UPDATE = 'menu:update',
  MENU_DELETE = 'menu:delete',
  MENU_MANAGE_VISIBILITY = 'menu:manage_visibility',
  MENU_PREVIEW = 'menu:preview',

  // Pricing operations
  PRICING_READ = 'pricing:read',
  PRICING_CREATE = 'pricing:create',
  PRICING_UPDATE = 'pricing:update',
  PRICING_DELETE = 'pricing:delete',

  // Company operations
  COMPANY_READ = 'company:read',
  COMPANY_CREATE = 'company:create',
  COMPANY_UPDATE = 'company:update',
  COMPANY_DELETE = 'company:delete',

  // Employee operations
  EMPLOYEE_READ = 'employee:read',
  EMPLOYEE_CREATE = 'employee:create',
  EMPLOYEE_UPDATE = 'employee:update',
  EMPLOYEE_DELETE = 'employee:delete',

  // Order operations
  ORDER_READ = 'order:read',
  ORDER_CREATE = 'order:create',
  ORDER_UPDATE = 'order:update',
  ORDER_CANCEL = 'order:cancel',
  ORDER_OVERRIDE = 'order:override',
  ORDER_CUTOFF_PROCESS = 'order:cutoff_process',

  // Billing operations
  BILLING_READ = 'billing:read',
  BILLING_CREATE = 'billing:create',
  BILLING_UPDATE = 'billing:update',
  BILLING_PAY = 'billing:pay',
  BILLING_ADJUST = 'billing:adjust',
}

