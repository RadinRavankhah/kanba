import { getTokenFromStorage } from '@/lib/auth';
import type { UserStore } from '@/lib/db/store';

export interface DataResult<T> {
  data: T | null;
  error: Error | null;
}

type Unwrap<F> = F extends (...args: infer A) => Promise<infer R> ? (...args: A) => Promise<DataResult<R>> : never;

export type DataApi = { [K in keyof UserStore]: Unwrap<UserStore[K]> };

async function call<T>(method: string, args: unknown[]): Promise<DataResult<T>> {
  const token = getTokenFromStorage();
  if (!token) {
    return { data: null, error: new Error('Not authenticated') };
  }

  try {
    const res = await fetch(`/api/data/${method}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(args),
    });

    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { data: null, error: new Error(body.error || `Request failed (${res.status})`) };
    }
    return { data: body.data as T, error: null };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error : new Error('Network error') };
  }
}

export const api = new Proxy({} as DataApi, {
  get(_target, method: string) {
    return (...args: unknown[]) => call(method, args);
  },
});
