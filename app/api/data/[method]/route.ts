import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { isUserMethod } from '@/lib/db/user-methods';
import { verifyToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest, { params }: { params: { method: string } }) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const payload = await verifyToken(authHeader.slice('Bearer '.length));
  if (!payload) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const method = params.method;
  if (!isUserMethod(method)) {
    return NextResponse.json({ error: 'Unknown method' }, { status: 404 });
  }

  try {
    const args = await request.json().catch(() => []);
    if (!Array.isArray(args)) {
      return NextResponse.json({ error: 'Arguments must be an array' }, { status: 400 });
    }

    const store = getDb().forUser(payload.userId) as unknown as Record<string, (...a: unknown[]) => Promise<unknown>>;
    const data = await store[method](...args);
    return NextResponse.json({ data: data ?? null });
  } catch (error: any) {
    const message = error?.message || 'Request failed';
    const status = /denied|not found/i.test(message) ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
