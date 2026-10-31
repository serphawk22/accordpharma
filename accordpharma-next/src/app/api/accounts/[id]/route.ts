import { NextResponse } from 'next/server';
import { db } from '@/lib/store';
import { getBackendUrl, getServerAuthToken } from '@/lib/api';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let account = db.getAccount(id);

  if (!account) {
    try {
      const backendUrl = getBackendUrl();
      const token = await getServerAuthToken();
      const headers: Record<string, string> = { Accept: 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`${backendUrl}/api/v1/accounts/${id}`, { headers });
      if (res.ok) {
        const item = await res.json();
        account = {
          id: String(item.id),
          name: item.name,
          account_type: (item.account_type ? item.account_type.toUpperCase() : 'HOSPITAL') as any,
          territory: item.territory || 'Territory West - California',
          owner_id: 'usr-1',
          owner_name: 'Marcus Vance',
          beds: 420,
          health_status: 'healthy',
          health_score: 95,
          total_invoiced: 210000,
          total_collected: 185000,
          open_deals_count: 2,
          created_at: item.created_at || new Date().toISOString(),
        };
      }
    } catch (err) {
      console.warn('Backend account detail fetch failed:', err);
    }
  }

  if (!account) {
    return NextResponse.json({ error: 'Account not found' }, { status: 404 });
  }

  const formularies = db.getAccountFormularies(id).length > 0 ? db.getAccountFormularies(id) : db.formularies.slice(0, 3);
  const contacts = db.hcps.filter((h) => h.account_id === id).length > 0 ? db.hcps.filter((h) => h.account_id === id) : db.hcps.slice(0, 2);
  const orders = db.orders.filter((o) => o.account_id === id).length > 0 ? db.orders.filter((o) => o.account_id === id) : db.orders.slice(0, 2);
  const activities = db.activities.filter((a) => a.account_id === id).length > 0 ? db.activities.filter((a) => a.account_id === id) : db.activities.slice(0, 3);
  const tasks = db.tasks.filter((t) => t.account_id === id).length > 0 ? db.tasks.filter((t) => t.account_id === id) : db.tasks.slice(0, 2);

  return NextResponse.json({
    account,
    formularies,
    contacts,
    orders,
    activities,
    tasks,
  });
}
