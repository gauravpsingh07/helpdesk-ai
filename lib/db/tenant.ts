import { prisma } from './client';

/**
 * Models that carry a `tenantId` column and therefore must never be queried
 * without a tenant constraint.
 */
const TENANT_MODELS = new Set([
  'User',
  'Document',
  'Chunk',
  'Ticket',
  'Message',
  'AiSuggestion',
  'AuditLog',
  'ApiKey',
]);

// Operations whose `where` clause we constrain to the active tenant. Thanks to
// Prisma's extended-unique-where (GA), tenantId can be added even to by-id ops.
const WHERE_OPS = new Set([
  'findUnique',
  'findUniqueOrThrow',
  'findFirst',
  'findFirstOrThrow',
  'findMany',
  'count',
  'aggregate',
  'groupBy',
  'update',
  'updateMany',
  'delete',
  'deleteMany',
]);

type LooseArgs = {
  where?: Record<string, unknown>;
  data?: Record<string, unknown> | Record<string, unknown>[];
  create?: Record<string, unknown>;
};

/**
 * Returns a Prisma client whose every query against a tenant-scoped model is
 * automatically constrained to `tenantId`. Isolation is enforced in exactly one
 * place, so an individual call site can't accidentally leak across tenants.
 */
export function getTenantDb(tenantId: string) {
  if (!tenantId) throw new Error('getTenantDb: tenantId is required');

  return prisma.$extends({
    name: 'tenant-scope',
    query: {
      $allModels: {
        $allOperations({ model, operation, args, query }) {
          if (!model || !TENANT_MODELS.has(model)) {
            return query(args);
          }
          const a = { ...(args as object) } as LooseArgs;

          if (operation === 'create') {
            a.data = { ...(a.data as Record<string, unknown>), tenantId };
          } else if (operation === 'createMany' || operation === 'createManyAndReturn') {
            a.data = Array.isArray(a.data)
              ? a.data.map((d) => ({ ...d, tenantId }))
              : { ...(a.data as Record<string, unknown>), tenantId };
          } else if (operation === 'upsert') {
            a.where = { ...a.where, tenantId };
            a.create = { ...a.create, tenantId };
          } else if (WHERE_OPS.has(operation)) {
            a.where = { ...a.where, tenantId };
          }

          return query(a as typeof args);
        },
      },
    },
  });
}

export type TenantDb = ReturnType<typeof getTenantDb>;
