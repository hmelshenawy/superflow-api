/**
 * SuperFlow Permission Definitions
 *
 * Each permission is a `category:action` string. The @RequirePermission()
 * decorator and PermissionsGuard use these to control endpoint access.
 *
 * The `admin` role always passes every permission check, regardless of the
 * permissions array in its role record.
 */

// ─── Jobs ───────────────────────────────────────────────
export const JOBS_READ = 'jobs:read';
export const JOBS_CREATE = 'jobs:create';
export const JOBS_UPDATE = 'jobs:update';
export const JOBS_DELETE = 'jobs:delete';
export const JOBS_ASSIGN = 'jobs:assign';
export const JOBS_TRANSITION = 'jobs:transition';

// ─── Estimates ──────────────────────────────────────────
export const ESTIMATES_READ = 'estimates:read';
export const ESTIMATES_CREATE = 'estimates:create';
export const ESTIMATES_UPDATE = 'estimates:update';
export const ESTIMATES_DELETE = 'estimates:delete';

// ─── Inspections ────────────────────────────────────────
export const INSPECTIONS_READ = 'inspections:read';
export const INSPECTIONS_CREATE = 'inspections:create';
export const INSPECTIONS_SUBMIT = 'inspections:submit';
export const INSPECTIONS_REOPEN = 'inspections:reopen';

// ─── Customers ──────────────────────────────────────────
export const CUSTOMERS_READ = 'customers:read';
export const CUSTOMERS_CREATE = 'customers:create';
export const CUSTOMERS_UPDATE = 'customers:update';
export const CUSTOMERS_DELETE = 'customers:delete';

// ─── Vehicles ────────────────────────────────────────────
export const VEHICLES_READ = 'vehicles:read';
export const VEHICLES_CREATE = 'vehicles:create';
export const VEHICLES_UPDATE = 'vehicles:update';

// ─── Media ──────────────────────────────────────────────
export const MEDIA_UPLOAD = 'media:upload';
export const MEDIA_DELETE = 'media:delete';

// ─── Authorisation (portal / approval) ───────────────────
export const AUTH_REQUEST = 'auth:request';
export const AUTH_STATUS = 'auth:status';

// ─── Deferred Work ──────────────────────────────────────
export const DEFERRED_READ = 'deferred:read';
export const DEFERRED_MANAGE = 'deferred:manage';
export const DEFERRED_BOOK = 'deferred:book';

// ─── Booking Import ─────────────────────────────────────
export const IMPORT_PARSE = 'import:parse';
export const IMPORT_RUN = 'import:run';

// ─── Admin ──────────────────────────────────────────────
export const ADMIN_SETTINGS = 'admin:settings';
export const ADMIN_SETTINGS_EDIT = 'admin:settings:edit';
export const ADMIN_ROLES = 'admin:roles';
export const ADMIN_USERS = 'admin:users';
export const ADMIN_USERS_CREATE = 'admin:users:create';
export const ADMIN_USERS_DELETE = 'admin:users:delete';
export const ADMIN_AUDIT = 'admin:audit';
export const ADMIN_INTEGRATIONS = 'admin:integrations';
export const ADMIN_TEMPLATES = 'admin:templates';
export const ADMIN_LABOUR_RATES = 'admin:labour-rates';
export const ADMIN_STATS = 'admin:stats';
export const ADMIN_BILLING = 'admin:billing';

// ─── Workshops (platform_admin) ────────────────────────
export const WORKSHOPS_READ = 'workshops:read';
export const WORKSHOPS_CREATE = 'workshops:create';
export const WORKSHOPS_UPDATE = 'workshops:update';
export const WORKSHOPS_DELETE = 'workshops:delete';
export const WORKSHOPS_ASSIGN_USERS = 'workshops:assign-users';

// ─── Priority / Insights ────────────────────────────────
export const PRIORITY_READ = 'priority:read';
export const INSIGHTS_DASHBOARD = 'insights:dashboard';

// ─── Blockers ───────────────────────────────────────────
export const BLOCKERS_READ = 'blockers:read';
export const BLOCKERS_MANAGE = 'blockers:manage';

// ─── Parts & Stock ──────────────────────────────────────
export const PARTS_READ = 'parts:read';
export const PARTS_CREATE = 'parts:create';
export const PARTS_UPDATE = 'parts:update';
export const PARTS_DELETE = 'parts:delete';
export const SUPPLIERS_READ = 'suppliers:read';
export const SUPPLIERS_CREATE = 'suppliers:create';
export const SUPPLIERS_UPDATE = 'suppliers:update';
export const WAREHOUSES_READ = 'warehouses:read';
export const WAREHOUSES_CREATE = 'warehouses:create';
export const WAREHOUSES_UPDATE = 'warehouses:update';
export const STOCK_ADJUST = 'stock:adjust';
export const STOCK_TRANSFER = 'stock:transfer';
export const PURCHASE_ORDERS_READ = 'purchase_orders:read';
export const PURCHASE_ORDERS_CREATE = 'purchase_orders:create';
export const PURCHASE_ORDERS_UPDATE = 'purchase_orders:update';
export const JOB_PARTS_READ = 'job_parts:read';
export const JOB_PARTS_RESERVE = 'job_parts:reserve';
export const JOB_PARTS_CONSUME = 'job_parts:consume';
export const JOB_PARTS_RETURN = 'job_parts:return';
export const STOCK_ANALYTICS = 'stock:analytics';

/**
 * Complete list of all defined permissions. Used for validation in role CRUD.
 */
export const ALL_PERMISSIONS: string[] = [
  JOBS_READ, JOBS_CREATE, JOBS_UPDATE, JOBS_DELETE, JOBS_ASSIGN, JOBS_TRANSITION,
  ESTIMATES_READ, ESTIMATES_CREATE, ESTIMATES_UPDATE, ESTIMATES_DELETE,
  INSPECTIONS_READ, INSPECTIONS_CREATE, INSPECTIONS_SUBMIT, INSPECTIONS_REOPEN,
  CUSTOMERS_READ, CUSTOMERS_CREATE, CUSTOMERS_UPDATE, CUSTOMERS_DELETE,
  VEHICLES_READ, VEHICLES_CREATE, VEHICLES_UPDATE,
  MEDIA_UPLOAD, MEDIA_DELETE,
  AUTH_REQUEST, AUTH_STATUS,
  DEFERRED_READ, DEFERRED_MANAGE, DEFERRED_BOOK,
  IMPORT_PARSE, IMPORT_RUN,
  ADMIN_SETTINGS, ADMIN_SETTINGS_EDIT, ADMIN_ROLES,
  ADMIN_USERS, ADMIN_USERS_CREATE, ADMIN_USERS_DELETE,
  ADMIN_AUDIT, ADMIN_INTEGRATIONS, ADMIN_TEMPLATES,
  ADMIN_LABOUR_RATES, ADMIN_STATS, ADMIN_BILLING,
  WORKSHOPS_READ, WORKSHOPS_CREATE, WORKSHOPS_UPDATE, WORKSHOPS_DELETE, WORKSHOPS_ASSIGN_USERS,
  PRIORITY_READ, INSIGHTS_DASHBOARD,
  BLOCKERS_READ, BLOCKERS_MANAGE,
  PARTS_READ, PARTS_CREATE, PARTS_UPDATE, PARTS_DELETE,
  SUPPLIERS_READ, SUPPLIERS_CREATE, SUPPLIERS_UPDATE,
  WAREHOUSES_READ, WAREHOUSES_CREATE, WAREHOUSES_UPDATE,
  STOCK_ADJUST, STOCK_TRANSFER, STOCK_ANALYTICS,
  PURCHASE_ORDERS_READ, PURCHASE_ORDERS_CREATE, PURCHASE_ORDERS_UPDATE,
  JOB_PARTS_READ, JOB_PARTS_RESERVE, JOB_PARTS_CONSUME, JOB_PARTS_RETURN,
];

/**
 * Default role templates with their permission arrays.
 * Used by the seed script and as a reference in the admin UI.
 */
export const DEFAULT_ROLES: Record<string, { name: string; description: string; permissions: string[] }> = {
  platform_admin: {
    name: 'platform_admin',
    description: 'Platform administrator — manages workshops and cross-workshop user assignments',
    permissions: [
      WORKSHOPS_READ, WORKSHOPS_CREATE, WORKSHOPS_UPDATE, WORKSHOPS_DELETE, WORKSHOPS_ASSIGN_USERS,
      ADMIN_SETTINGS, ADMIN_SETTINGS_EDIT, ADMIN_ROLES,
      ADMIN_USERS, ADMIN_USERS_CREATE, ADMIN_USERS_DELETE,
      ADMIN_AUDIT, ADMIN_INTEGRATIONS, ADMIN_TEMPLATES,
      ADMIN_LABOUR_RATES, ADMIN_STATS, ADMIN_BILLING,
    ],
  },
  admin: {
    name: 'admin',
    description: 'Full system access — can do everything',
    permissions: [...ALL_PERMISSIONS],
  },
  manager: {
    name: 'manager',
    description: 'Near-full access — can manage all operations except deleting users and viewing audit logs',
    permissions: [
      JOBS_READ, JOBS_CREATE, JOBS_UPDATE, JOBS_DELETE, JOBS_ASSIGN, JOBS_TRANSITION,
      ESTIMATES_READ, ESTIMATES_CREATE, ESTIMATES_UPDATE, ESTIMATES_DELETE,
      INSPECTIONS_READ, INSPECTIONS_CREATE, INSPECTIONS_SUBMIT,
      CUSTOMERS_READ, CUSTOMERS_CREATE, CUSTOMERS_UPDATE,
      VEHICLES_READ, VEHICLES_CREATE, VEHICLES_UPDATE,
      MEDIA_UPLOAD, MEDIA_DELETE,
      AUTH_REQUEST, AUTH_STATUS,
      DEFERRED_READ, DEFERRED_MANAGE, DEFERRED_BOOK,
      IMPORT_PARSE, IMPORT_RUN,
      ADMIN_SETTINGS, ADMIN_SETTINGS_EDIT, ADMIN_ROLES,
      ADMIN_USERS, ADMIN_USERS_CREATE,
      ADMIN_INTEGRATIONS, ADMIN_TEMPLATES, ADMIN_LABOUR_RATES, ADMIN_STATS,
      PRIORITY_READ, INSIGHTS_DASHBOARD,
      BLOCKERS_READ, BLOCKERS_MANAGE,
      PARTS_READ, PARTS_CREATE, PARTS_UPDATE,
      SUPPLIERS_READ, SUPPLIERS_CREATE, SUPPLIERS_UPDATE,
      WAREHOUSES_READ, WAREHOUSES_CREATE, WAREHOUSES_UPDATE,
      STOCK_ADJUST, STOCK_TRANSFER, STOCK_ANALYTICS,
      PURCHASE_ORDERS_READ, PURCHASE_ORDERS_CREATE, PURCHASE_ORDERS_UPDATE,
      JOB_PARTS_READ, JOB_PARTS_RESERVE, JOB_PARTS_CONSUME, JOB_PARTS_RETURN,
    ],
  },
  service_advisor: {
    name: 'service_advisor',
    description: 'Front-office advisor — manages customers, estimates, authorisations, and job flow',
    permissions: [
      JOBS_READ, JOBS_CREATE, JOBS_UPDATE, JOBS_TRANSITION,
      ESTIMATES_READ, ESTIMATES_CREATE, ESTIMATES_UPDATE,
      INSPECTIONS_READ, INSPECTIONS_CREATE, INSPECTIONS_SUBMIT,
      CUSTOMERS_READ, CUSTOMERS_CREATE, CUSTOMERS_UPDATE,
      VEHICLES_READ, VEHICLES_CREATE, VEHICLES_UPDATE,
      MEDIA_UPLOAD,
      AUTH_REQUEST, AUTH_STATUS,
      DEFERRED_READ, DEFERRED_MANAGE, DEFERRED_BOOK,
      ADMIN_SETTINGS,
      PRIORITY_READ, INSIGHTS_DASHBOARD,
      BLOCKERS_READ, BLOCKERS_MANAGE,
      PARTS_READ,
      SUPPLIERS_READ,
      WAREHOUSES_READ,
      JOB_PARTS_READ, JOB_PARTS_RESERVE, JOB_PARTS_CONSUME, JOB_PARTS_RETURN,
      PURCHASE_ORDERS_READ,
    ],
  },
  workshop_teamleader: {
    name: 'workshop_teamleader',
    description: 'Workshop floor leader — manages job assignments, inspections, estimates, and workshop flow',
    permissions: [
      JOBS_READ, JOBS_UPDATE, JOBS_ASSIGN, JOBS_TRANSITION,
      ESTIMATES_READ, ESTIMATES_CREATE, ESTIMATES_UPDATE,
      INSPECTIONS_READ, INSPECTIONS_CREATE, INSPECTIONS_SUBMIT, INSPECTIONS_REOPEN,
      CUSTOMERS_READ, VEHICLES_READ,
      MEDIA_UPLOAD,
      AUTH_STATUS,
      DEFERRED_READ,
      PRIORITY_READ, INSIGHTS_DASHBOARD,
      BLOCKERS_READ, BLOCKERS_MANAGE,
      PARTS_READ,
      WAREHOUSES_READ,
      JOB_PARTS_READ, JOB_PARTS_RESERVE, JOB_PARTS_CONSUME, JOB_PARTS_RETURN,
    ],
  },
  technician: {
    name: 'technician',
    description: 'Workshop technician — works on assigned jobs, performs inspections',
    permissions: [
      JOBS_READ, JOBS_TRANSITION,
      ESTIMATES_READ,
      INSPECTIONS_READ, INSPECTIONS_CREATE, INSPECTIONS_SUBMIT,
      CUSTOMERS_READ, VEHICLES_READ,
      MEDIA_UPLOAD,
      AUTH_STATUS,
      DEFERRED_READ,
      BLOCKERS_READ,
      PARTS_READ,
      WAREHOUSES_READ,
      JOB_PARTS_READ,
    ],
  },
  receptionist: {
    name: 'receptionist',
    description: 'Front desk — books customers and vehicles, imports bookings, views basic job status',
    permissions: [
      JOBS_READ, JOBS_CREATE,
      CUSTOMERS_READ, CUSTOMERS_CREATE, CUSTOMERS_UPDATE,
      VEHICLES_READ, VEHICLES_CREATE,
      IMPORT_PARSE, IMPORT_RUN,
    ],
  },
};