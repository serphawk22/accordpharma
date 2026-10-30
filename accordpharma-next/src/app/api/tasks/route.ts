import { NextResponse } from 'next/server';
import { db } from '@/lib/store';

export async function GET() {
  const tasks = db.getTasks();
  return NextResponse.json({
    items: tasks,
    total: tasks.length,
    pending_count: tasks.filter((t) => t.status === 'pending').length,
  });
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    if (!body.id) {
      return NextResponse.json({ error: 'Task ID required' }, { status: 400 });
    }
    const completed = db.completeTask(body.id);
    return NextResponse.json(completed);
  } catch {
    return NextResponse.json({ error: 'Failed to update task' }, { status: 500 });
  }
}
