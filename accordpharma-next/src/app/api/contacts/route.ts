import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/store';
import { getBackendUrl, getServerAuthToken } from '@/lib/api';

function extractToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  const tokenCookie = request.cookies.get('accord_token')?.value;
  return tokenCookie || null;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search')?.toLowerCase() || '';
  const tier = searchParams.get('tier') || '';
  const specialty = searchParams.get('specialty') || '';

  const backendUrl = getBackendUrl();
  const rawToken = extractToken(request);
  const token = await getServerAuthToken(rawToken);
  const fallbackList = db.getHCPs();

  try {
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const backendQuery = search ? `?search=${encodeURIComponent(search)}` : '';
    const res = await fetch(`${backendUrl}/api/v1/contacts${backendQuery}`, {
      headers,
      cache: 'no-store',
    });

    if (res.ok) {
      const backendContacts = await res.json();
      if (Array.isArray(backendContacts) && backendContacts.length > 0) {
        let mapped = backendContacts.map((c: any) => ({
          id: String(c.id),
          account_id: String(c.account_id),
          account_name: c.account_name || 'Partner Health System',
          full_name: c.full_name,
          title: c.title || 'Attending Physician',
          specialty: c.specialty || 'General Medicine',
          license_number: c.license_number || 'NPI-1000000000',
          prescribing_tier: c.prescribing_tier || 'Tier 2 (High-Volume)',
          kol_status: Boolean(c.kol_status),
          email: c.email || '',
          phone: c.phone || '',
          country: c.country || 'United States',
          territory: c.territory || 'Territory West - California',
          last_interaction_at: c.last_interaction_at || new Date().toISOString(),
          interactions_count: c.interactions_count ?? 1,
          status: c.status || 'ACTIVE',
        }));

        if (tier) {
          mapped = mapped.filter((h) => h.prescribing_tier === tier);
        }
        if (specialty) {
          mapped = mapped.filter((h) => h.specialty === specialty);
        }

        return NextResponse.json({
          items: mapped,
          total: mapped.length,
          kols_count: mapped.filter((h) => h.kol_status).length,
          source: 'postgresql',
        });
      }
    }
  } catch (err) {
    console.warn('Backend contacts fetch error, falling back:', err);
  }

  // Fallback to local in-memory dataset
  let list = fallbackList;
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
    source: 'fallback',
  });
}

export async function POST(request: NextRequest) {
  const backendUrl = getBackendUrl();
  const rawToken = extractToken(request);
  const token = await getServerAuthToken(rawToken);

  try {
    const body = await request.json();
    if (!body.full_name || !body.specialty) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    let backendAccountId = body.account_id;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    // If account_id is not a valid UUID (e.g., 'acc-1'), lookup a real account from the backend
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(backendAccountId || '');
    if (!isUuid) {
      try {
        const accRes = await fetch(`${backendUrl}/api/v1/accounts`, { headers });
        if (accRes.ok) {
          const accs = await accRes.json();
          if (Array.isArray(accs) && accs.length > 0) {
            backendAccountId = accs[0].id;
          }
        }
      } catch {
        // Continue with current ID
      }
    }

    let createdRecord = null;
    let savedToDatabase = false;

    if (backendAccountId) {
      const res = await fetch(`${backendUrl}/api/v1/contacts`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          account_id: backendAccountId,
          full_name: body.full_name,
          email: body.email || null,
          phone: body.phone || null,
          title: body.title || 'Attending Physician',
          specialty: body.specialty,
          license_number: body.license_number || `NPI-${Math.floor(1000000000 + Math.random() * 9000000000)}`,
          country: 'US',
        }),
      });

      if (res.ok) {
        createdRecord = await res.json();
        savedToDatabase = true;
      }
    }

    const localAccount = db.getAccount(body.account_id);
    const localSaved = db.addHCP({
      account_id: createdRecord?.account_id || body.account_id,
      account_name: createdRecord?.account_name || localAccount?.name || 'Affiliated Health System',
      full_name: body.full_name,
      title: body.title || 'Attending Physician',
      specialty: body.specialty,
      license_number: body.license_number || createdRecord?.license_number || `NPI-${Math.floor(1000000000 + Math.random() * 9000000000)}`,
      prescribing_tier: body.prescribing_tier || createdRecord?.prescribing_tier || 'Tier 2 (Medium Decile)',
      kol_status: Boolean(body.kol_status ?? createdRecord?.kol_status),
      email: body.email || '',
      phone: body.phone || '',
      country: 'United States',
      territory: localAccount?.territory || 'Territory West - California',
    });

    return NextResponse.json(
      {
        ...localSaved,
        ...(createdRecord || {}),
        persisted_to_database: savedToDatabase,
      },
      { status: 201 }
    );
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to create HCP contact' }, { status: 500 });
  }
}
