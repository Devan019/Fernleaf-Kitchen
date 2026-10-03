export enum Permission {
    // User management
    USER_CREATE = 'user:create',
    USER_READ = 'user:read',
    USER_UPDATE = 'user:update',
    USER_DELETE = 'user:delete',

    // Kitchen operations
    KITCHEN_READ = 'kitchen:read',
    KITCHEN_UPDATE = 'kitchen:update',

    // Dispatch operations
    DISPATCH_READ = 'dispatch:read',
    DISPATCH_UPDATE = 'dispatch:update',
    DISPATCH_ASSIGN_DRIVER = 'dispatch:assign_driver',

    // Delivery operations
    DELIVERY_READ_ALL = 'delivery:read_all',
    DELIVERY_TRACK = 'delivery:track',
    DELIVERY_READ_OWN = 'delivery:read_own',
    DELIVERY_UPDATE_OWN = 'delivery:update_own',
}
