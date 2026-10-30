import { NextResponse } from 'next/server';
import { db } from '@/lib/store';

export async function GET() {
  const orders = db.getOrders();
  return NextResponse.json({
    items: orders,
    total: orders.length,
    total_revenue: orders.reduce((sum, o) => sum + o.total_price, 0),
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body.account_id || !body.product_name || !body.quantity || !body.unit_price) {
      return NextResponse.json({ error: 'Missing order details' }, { status: 400 });
    }

    const account = db.getAccount(body.account_id);
    const newOrder = db.createOrder({
      account_id: body.account_id,
      account_name: account?.name || 'Customer Account',
      product_id: body.product_id || 'prod-custom',
      product_name: body.product_name,
      sku: body.sku || 'SKU-GEN',
      quantity: Number(body.quantity),
      unit_price: Number(body.unit_price),
      total_price: Number(body.quantity) * Number(body.unit_price),
      status: 'CONFIRMED',
    });

    return NextResponse.json(newOrder, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Failed to place commercial order' }, { status: 500 });
  }
}
