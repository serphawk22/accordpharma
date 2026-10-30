import { NextResponse } from 'next/server';
import { db } from '@/lib/store';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search')?.toLowerCase() || '';
  const tier = searchParams.get('tier') || '';
  const specialty = searchParams.get('specialty') || '';

  let list = db.getHCPs();

  if (search) {
    list = list.filter(
      (h) =>
        h.full_name.toLowerCase().includes(search) ||
        h.specialty.toLowerCase().includes(search) ||
        h.account_name.toLowerCase().includes(search) ||
        h.license_number.toLowerCase().includes(search)
    );
  }

  if (tier) {
    list = list.filter((h) => h.prescribing_tier === tier);
  }

  if (specialty) {
    list = list.filter((h) => h.specialty === specialty);
  }

  return NextResponse.json({
    items: list,
    total: list.length,
    kols_count: list.filter((h) => h.kol_status).length,
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body.full_name || !body.specialty || !body.account_id) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const account = db.getAccount(body.account_id);
    const created = db.addHCP({
      account_id: body.account_id,
      account_name: account?.name || 'Affiliated Health System',
      full_name: body.full_name,
      title: body.title || 'Attending Physician',
      specialty: body.specialty,
      license_number: body.license_number || `NPI-${Math.floor(1000000000 + Math.random() * 9000000000)}`,
      prescribing_tier: body.prescribing_tier || 'Tier 2 (Medium Decile)',
      kol_status: Boolean(body.kol_status),
      email: body.email || '',
      phone: body.phone || '',
      country: 'United States',
      territory: account?.territory || 'Territory West - Metro',
    });

    return NextResponse.json(created, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Failed to create HCP' }, { status: 500 });
  }
}
