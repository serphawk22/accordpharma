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
  const fallbackOrders = db.getOrders();

  try {
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${backendUrl}/api/v1/orders`, {
      headers,
      cache: 'no-store',
    });

    if (res.ok) {
      const backendOrders = await res.json();
      if (Array.isArray(backendOrders) && backendOrders.length > 0) {
        const mapped = backendOrders.map((o: any, idx: number) => {
          const item = o.items?.[0];
          const qty = item?.quantity || 100;
          const price = Number(item?.unit_price || 65.0);
          return {
            id: String(o.id),
            order_number: o.order_number || `ORD-2026-${1000 + idx}`,
            account_id: String(o.account_id),
            account_name: o.account_name || 'Institutional Hospital Client',
            product_id: item?.product_id ? String(item.product_id) : 'prod-cvx',
            product_name: item?.product_name || 'CardioVas-XR 100mg Extended-Release',
            sku: item?.sku || 'CVX-100MG-100',
            quantity: qty,
            unit_price: price,
            total_price: qty * price,
            status: o.status ? o.status.toUpperCase() : 'CONFIRMED',
            created_at: o.order_date || o.created_at || new Date().toISOString(),
          };
        });

        return NextResponse.json({
          items: mapped,
          total: mapped.length,
          total_revenue: mapped.reduce((sum, o) => sum + o.total_price, 0),
          source: 'postgresql',
        });
      }
    }
  } catch (err) {
    console.warn('Backend orders fetch error, falling back:', err);
  }

  return NextResponse.json({
    items: fallbackOrders,
    total: fallbackOrders.length,
    total_revenue: fallbackOrders.reduce((sum, o) => sum + o.total_price, 0),
    source: 'fallback',
  });
}

export async function POST(request: NextRequest) {
  const backendUrl = getBackendUrl();
  const token = extractToken(request);

  try {
    const body = await request.json();
    if (!body.product_name || !body.quantity || !body.unit_price) {
      return NextResponse.json({ error: 'Missing order details' }, { status: 400 });
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    let backendAccountId = body.account_id;
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(backendAccountId || '');
    let backendProductId = body.product_id;
    const isProdUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(backendProductId || '');

    // Resolve real account and product UUIDs from backend
    try {
      if (!isUuid) {
        const accRes = await fetch(`${backendUrl}/api/v1/accounts`, { headers });
        if (accRes.ok) {
          const accs = await accRes.json();
          if (Array.isArray(accs) && accs.length > 0) {
            backendAccountId = accs[0].id;
          }
        }
      }
      if (!isProdUuid) {
        const prodRes = await fetch(`${backendUrl}/api/v1/products`, { headers });
        if (prodRes.ok) {
          const prods = await prodRes.json();
          if (Array.isArray(prods) && prods.length > 0) {
            backendProductId = prods[0].id;
          }
        }
      }
    } catch {
      // Continue with provided IDs
    }

    let createdRecord = null;
    let savedToDatabase = false;

    if (backendAccountId && backendProductId) {
      const res = await fetch(`${backendUrl}/api/v1/orders`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          account_id: backendAccountId,
          items: [
            {
              product_id: backendProductId,
              quantity: Number(body.quantity),
              unit_price: Number(body.unit_price),
            },
          ],
        }),
      });

      if (res.ok) {
        createdRecord = await res.json();
        savedToDatabase = true;
      }
    }

    const account = db.getAccount(body.account_id);
    const localNewOrder = db.createOrder({
      account_id: createdRecord?.account_id || body.account_id || 'acc-1',
      account_name: account?.name || 'Customer Account',
      product_id: backendProductId || 'prod-custom',
      product_name: body.product_name,
      sku: body.sku || 'SKU-GEN',
      quantity: Number(body.quantity),
      unit_price: Number(body.unit_price),
      total_price: Number(body.quantity) * Number(body.unit_price),
      status: 'CONFIRMED',
    });

    return NextResponse.json(
      {
        ...localNewOrder,
        ...(createdRecord || {}),
        persisted_to_database: savedToDatabase,
      },
      { status: 201 }
    );
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to place commercial order' }, { status: 500 });
  }
}
