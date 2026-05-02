import { NextResponse } from 'next/server';

// Return the ADMIN_PRIVATE_KEY if it's set. No generation or persistence needed.
export async function GET() {
  try {
    const envKey = process.env.ADMIN_PRIVATE_KEY || process.env.ADMIN_PK || process.env.NEXT_PUBLIC_ADMIN_PRIVATE_KEY;
    if (envKey) return NextResponse.json({ success: true, privateKey: envKey });
    return NextResponse.json({ success: false, error: 'ADMIN_PRIVATE_KEY not configured on server' }, { status: 400 });
  } catch (err) {
    console.error('[API] owner-key error', err);
    return NextResponse.json({ success: false, error: err.message || 'Failed' }, { status: 500 });
  }
}
