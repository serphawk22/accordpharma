import { NextResponse } from 'next/server';
import { db } from '@/lib/store';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const hcp = db.getHCP(id);
  if (!hcp) {
    return NextResponse.json({ error: 'Healthcare professional not found' }, { status: 404 });
  }

  // Get physician detailing history and tasks
  const detailingActivities = db.activities.filter((a) => a.contact_id === id);
  const account = db.getAccount(hcp.account_id);
  const formularyAccess = db.getAccountFormularies(hcp.account_id);

  return NextResponse.json({
    hcp,
    account,
    detailing_history: detailingActivities,
    formulary_access: formularyAccess,
  });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const body = await request.json();
    const updated = db.updateHCP(id, body);
    if (!updated) {
      return NextResponse.json({ error: 'Healthcare professional not found' }, { status: 404 });
    }
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: 'Failed to update HCP' }, { status: 500 });
  }
}
