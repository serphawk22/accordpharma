import { NextResponse } from 'next/server';
import { db } from '@/lib/store';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const account = db.getAccount(id);
  if (!account) {
    return NextResponse.json({ error: 'Account not found' }, { status: 404 });
  }

  const formularies = db.getAccountFormularies(id);
  const contacts = db.hcps.filter((h) => h.account_id === id);
  const orders = db.orders.filter((o) => o.account_id === id);
  const activities = db.activities.filter((a) => a.account_id === id);
  const tasks = db.tasks.filter((t) => t.account_id === id);

  return NextResponse.json({
    account,
    formularies,
    contacts,
    orders,
    activities,
    tasks,
  });
}
