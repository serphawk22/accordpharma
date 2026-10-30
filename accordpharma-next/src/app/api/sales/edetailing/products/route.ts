import { NextResponse } from 'next/server';
import { db } from '@/lib/store';

export async function GET() {
  const products = db.getDetailingProducts();
  return NextResponse.json({
    portfolio: products,
    total_therapeutic_lines: products.length,
    compliance_approved: true,
    valid_until: '2027-12-31',
  });
}
