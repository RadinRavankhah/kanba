import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(_request: NextRequest, { params }: { params: { token: string } }) {
  try {
    const project = await getDb().server.getPublicProjectByToken(params.token);
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }
    return NextResponse.json({ data: project });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to load project' }, { status: 500 });
  }
}
