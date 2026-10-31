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
  const backendUrl = getBackendUrl();
  const rawToken = extractToken(request);
  const token = await getServerAuthToken(rawToken);
  const fallbackOpps = db.getOpportunities();

  try {
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${backendUrl}/api/v1/opportunities`, {
      headers,
      cache: 'no-store',
    });

    if (res.ok) {
      const dbOpps = await res.json();
      if (Array.isArray(dbOpps) && dbOpps.length > 0) {
        const mapped = dbOpps.map((o: any, idx: number) => {
          const match = fallbackOpps.find((f) => f.id === o.id || f.name.toLowerCase() === (o.name || '').toLowerCase());
          return {
            id: String(o.id),
            name: o.name,
            account_id: String(o.account_id),
            account_name: match?.account_name || 'Hospital Clinical Center',
            stage: (o.stage ? o.stage.toUpperCase() : 'PROSPECTING') as any,
            estimated_value: Number(o.estimated_value) || 250000,
            probability: Number(o.probability) || 50,
            expected_close_date: o.expected_close_date ? String(o.expected_close_date) : '2026-12-31',
            product_name: match?.product_name || 'CardioVas-XR 100mg',
            product_sku: match?.product_sku || 'CVX-100MG-100',
            decision_maker: match?.decision_maker || 'Chief Medical Officer',
            therapeutic_area: match?.therapeutic_area || 'Cardiovascular',
            territory: 'Territory West - California',
            rep_name: 'Marcus Vance',
            created_at: o.created_at || new Date().toISOString(),
          };
        });

        const dbIds = new Set(mapped.map((m) => m.id));
        const combined = [...mapped, ...fallbackOpps.filter((f) => !dbIds.has(f.id))];

        return NextResponse.json({
          items: combined,
          total: combined.length,
          source: 'postgresql',
        });
      }
    }
  } catch (err) {
    console.warn('Backend opportunities fetch error, falling back:', err);
  }

  return NextResponse.json({
    items: fallbackOpps,
    total: fallbackOpps.length,
    source: 'fallback',
  });
}

export async function POST(request: NextRequest) {
  const backendUrl = getBackendUrl();
  const rawToken = extractToken(request);
  const token = await getServerAuthToken(rawToken);

  try {
    const body = await request.json();
    if (!body.name) {
      return NextResponse.json({ error: 'Opportunity name is required' }, { status: 400 });
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    let backendAccountId = body.account_id;
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
        // Continue
      }
    }

    let createdRecord = null;
    let savedToDatabase = false;

    if (backendAccountId) {
      const stageLower = (body.stage || 'prospecting').toLowerCase();
      const res = await fetch(`${backendUrl}/api/v1/opportunities`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          account_id: backendAccountId,
          name: body.name,
          stage: stageLower,
          estimated_value: Number(body.estimated_value) || 250000,
          probability: Number(body.probability) || 50,
        }),
      });

      if (res.ok) {
        createdRecord = await res.json();
        savedToDatabase = true;
      }
    }

    const localSaved = db.addOpportunity({
      name: body.name,
      account_id: createdRecord?.account_id || body.account_id || 'acc-1',
      account_name: body.account_name || 'Hospital Clinical Center',
      stage: (body.stage || 'PROSPECTING') as any,
      estimated_value: Number(body.estimated_value) || 250000,
      probability: Number(body.probability) || 50,
      expected_close_date: body.expected_close_date || '2026-12-31',
      product_name: body.product_name || 'CardioVas-XR 100mg',
      product_sku: body.product_sku || 'CVX-100MG-100',
      decision_maker: body.decision_maker || 'Chief Medical Officer',
      therapeutic_area: body.therapeutic_area || 'Cardiovascular',
      territory: body.territory || 'Territory West - California',
      rep_name: body.rep_name || 'Marcus Vance',
    });

    return NextResponse.json(
      {
        ...localSaved,
        ...(createdRecord ? { id: String(createdRecord.id) } : {}),
        persisted_to_database: savedToDatabase,
      },
      { status: 201 }
    );
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to create opportunity' }, { status: 500 });
  }
}
