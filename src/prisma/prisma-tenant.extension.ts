import { Prisma } from '@prisma/client';
import { getWorkshopContext } from './workshop-context';

const TENANT_SCOPED_MODELS = new Set([
  'jobs',
  'customers',
  'vehicles',
  'estimate_lines',
  'estimate_line_history',
  'quote_groups',
  'inspections',
  'inspection_sections',
  'inspection_items',
  'inspection_responses',
  'inspection_templates',
  'media_files',
  'deferred_work',
  'deferred_work_reminders',
  'notifications',
  'notification_templates',
  'audit_logs',
  'booking_import_templates',
  'settings',
  'labour_rates',
  'job_status_history',
  'vehicle_service_history',
  'approval_tokens',
  'authorisation_decisions',
  'integrations',
  'integration_events',
]);

const READ_OPS = new Set(['findMany', 'findFirst', 'count', 'aggregate', 'groupBy']);
const WRITE_OPS = new Set(['create', 'createMany', 'update', 'updateMany', 'delete', 'deleteMany']);

export const workshopTenantExtension = Prisma.defineExtension({
  name: 'workshopTenant',
  model: {
    $allModels: {
      $allOperations: {
        async $allArgs({ model, operation, args, query }: { model: string; operation: string; args: any; query: (args: any) => Promise<any> }) {
          if (!TENANT_SCOPED_MODELS.has(model)) {
            return query(args);
          }

          const { workshopId, isPlatformAdmin } = getWorkshopContext();

          // Platform admin without a specific workshop sees everything
          if (isPlatformAdmin && !workshopId) {
            return query(args);
          }

          // Non-admin without workshop should have been blocked by WorkshopGuard,
          // but as a safety net, return empty for reads and reject writes
          if (!workshopId) {
            if (READ_OPS.has(operation)) {
              // Return empty result set for reads
              if (operation === 'count') return 0;
              if (operation === 'aggregate') return { _count: 0 };
              if (operation === 'groupBy') return [];
              return [];
            }
            // For findUnique, let it proceed and we'll filter after
            if (operation === 'findUnique') {
              const result = await query(args);
              return result;
            }
            // Block writes without workshop context
            throw new Error(`Cannot perform ${operation} on ${model} without workshop context`);
          }

          if (operation === 'findUnique') {
            const result = await query(args);
            if (result && result.workshop_id && result.workshop_id !== workshopId) {
              return null;
            }
            return result;
          }

          if (READ_OPS.has(operation)) {
            const where = (args as any).where ?? {};
            (args as any).where = { ...where, workshop_id: workshopId };
            return query(args);
          }

          if (operation === 'create') {
            const data = (args as any).data ?? {};
            if (typeof data === 'object' && !data.workshop_id) {
              (args as any).data = { ...data, workshop_id: workshopId };
            }
            return query(args);
          }

          if (operation === 'createMany') {
            const data = (args as any).data ?? [];
            (args as any).data = data.map((item: any) =>
              item.workshop_id ? item : { ...item, workshop_id: workshopId },
            );
            return query(args);
          }

          if (operation === 'update' || operation === 'updateMany' || operation === 'delete' || operation === 'deleteMany') {
            const where = (args as any).where ?? {};
            (args as any).where = { ...where, workshop_id: workshopId };
            return query(args);
          }

          return query(args);
        },
      },
    },
  },
});