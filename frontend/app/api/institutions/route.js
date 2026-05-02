import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET() {
  try {
    const [rows] = await pool.query('SELECT id, name, wallet_address, status FROM institutions');
    return NextResponse.json({ success: true, data: rows });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to fetch institutions' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { name, wallet_address } = body;
    if (!wallet_address) return NextResponse.json({ success: false, error: 'wallet_address required' }, { status: 400 });

    const [rows] = await pool.query('SELECT id, name, wallet_address, status FROM institutions WHERE LOWER(wallet_address) = LOWER(?)', [wallet_address]);
    if (rows.length > 0) return NextResponse.json({ success: true, data: rows[0] });

    const displayName = name || `Institution ${wallet_address.substring(0,6)}`;
    const [result] = await pool.query('INSERT INTO institutions (name, wallet_address, status) VALUES (?, ?, ?)', [displayName, wallet_address, 'pending']);
    return NextResponse.json({ success: true, data: { id: result.insertId, name: displayName, wallet_address, status: 'pending' } }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to create institution' }, { status: 500 });
  }
}