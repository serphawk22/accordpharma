import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/store';
import { getBackendUrl } from '@/lib/api';

function extractToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  const tokenCookie = request.cookies.get('accord_token')?.value;
  return tokenCookie || null;
}

export async function GET(request: NextRequest) {
  const backendUrl = getBackendUrl();
  const token = extractToken(request);
  const fallbackTasks = db.getTasks();

  try {
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${backendUrl}/api/v1/sales/tasks?limit=50`, {
      headers,
      cache: 'no-store',
    });

    if (res.ok) {
      const data = await res.json();
      const rawTasks = data.items || data;
      if (Array.isArray(rawTasks) && rawTasks.length > 0) {
        const mapped = rawTasks.map((t: any) => ({
          id: String(t.id),
          account_id: t.account_id ? String(t.account_id) : 'acc-1',
          account_name: t.account_name || 'Hospital Clinical Client',
          title: t.title,
          description: t.description || '',
          due_date: t.due_at ? t.due_at.split('T')[0] : 'Today, 5:00 PM',
          priority: t.priority === 'urgent' ? 'urgent' : t.priority === 'high' ? 'high' : 'medium',
          status: t.status === 'completed' ? 'completed' : 'pending',
          assigned_to_name: t.assigned_to_name || 'Marcus Vance',
          created_at: t.created_at || new Date().toISOString(),
        }));

        return NextResponse.json({
          items: mapped,
          total: mapped.length,
          pending_count: mapped.filter((t) => t.status !== 'completed').length,
          source: 'postgresql',
        });
      }
    }
  } catch (err) {
    console.warn('Backend tasks fetch error, using local dataset:', err);
  }

  return NextResponse.json({
    items: fallbackTasks,
    total: fallbackTasks.length,
    pending_count: fallbackTasks.filter((t) => t.status === 'pending').length,
    source: 'fallback',
  });
}

export async function POST(request: NextRequest) {
  const backendUrl = getBackendUrl();
  const token = extractToken(request);

  try {
    const body = await request.json();
    if (!body.title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    let backendAccountId = body.account_id;
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(backendAccountId || '');
    if (!isUuid && backendAccountId) {
      try {
        const accRes = await fetch(`${backendUrl}/api/v1/accounts`, { headers });
        if (accRes.ok) {
          const accs = await accRes.json();
          if (Array.isArray(accs) && accs.length > 0) {
            backendAccountId = accs[0].id;
          } else {
            backendAccountId = null;
          }
        }
      } catch {
        backendAccountId = null;
      }
    }

    let createdRecord = null;
    let savedToDatabase = false;

    const res = await fetch(`${backendUrl}/api/v1/sales/tasks`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        title: body.title,
        account_id: backendAccountId || null,
        priority: body.priority || 'high',
        kind: 'task',
        description: body.description || null,
      }),
    });

    if (res.ok) {
      createdRecord = await res.json();
      savedToDatabase = true;
    }

    const localItem = {
      id: createdRecord?.id || `task-${Date.now()}`,
      account_id: createdRecord?.account_id || body.account_id || 'acc-1',
      account_name: createdRecord?.account_name || 'Hospital Clinical Client',
      title: body.title,
      description: body.description || '',
      due_date: body.due_date || 'Today, 5:00 PM',
      priority: (body.priority || 'high') as any,
      status: 'pending' as const,
      assigned_to_name: 'Marcus Vance',
      created_at: new Date().toISOString(),
    };

    return NextResponse.json(
      {
        ...localItem,
        ...(createdRecord || {}),
        persisted_to_database: savedToDatabase,
      },
      { status: 201 }
    );
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to create task' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const backendUrl = getBackendUrl();
  const token = extractToken(request);

  try {
    const body = await request.json();
    if (!body.id) {
      return NextResponse.json({ error: 'Task ID required' }, { status: 400 });
    }

    let updatedFromDb = false;
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.id);
    if (isUuid) {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`${backendUrl}/api/v1/sales/tasks/${body.id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          status: body.status || 'completed',
        }),
      });

      if (res.ok) {
        updatedFromDb = true;
      }
    }

    const localCompleted = db.completeTask(body.id);
    return NextResponse.json({
      ...(localCompleted || { id: body.id, status: 'completed' }),
      persisted_to_database: updatedFromDb,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to update task' }, { status: 500 });
  }
}
