import type { DataProvider } from '@/lib/db/store';
import { postgresProvider } from '@/lib/db/providers/postgres';

export type { DataProvider, UserStore, ServerStore } from '@/lib/db/store';

const SUPPORTED_PROVIDERS = ['postgresql'] as const;

function createProvider(name: string): DataProvider {
  switch (name) {
    case 'postgresql':
      return postgresProvider;
    default:
      throw new Error(
        `Unsupported DATABASE_PROVIDER "${name}". Supported: ${SUPPORTED_PROVIDERS.join(', ')}`
      );
  }
}

let cached: DataProvider | null = null;

export function getDb(): DataProvider {
  if (!cached) {
    cached = createProvider(process.env.DATABASE_PROVIDER || 'postgresql');
  }
  return cached;
}
