import { NextResponse } from 'next/server';
import { db } from '@/lib/store';

export async function GET() {
  const accounts = db.getAccounts();
  return NextResponse.json({
    items: accounts,
    total: accounts.length,
    total_invoiced: accounts.reduce((sum, a) => sum + a.total_invoiced, 0),
    total_collected: accounts.reduce((sum, a) => sum + a.total_collected, 0),
  });
}
