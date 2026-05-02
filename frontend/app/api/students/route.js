import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { ethers } from 'ethers';
import artifact from '@/lib/CredentialRegistry.json';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const wallet = searchParams.get('wallet');

    if (!wallet) {
      const [students] = await pool.query('SELECT id, name, wallet_address FROM students');
      return NextResponse.json({ success: true, data: students });
    }

    const [rows] = await pool.query(
      `SELECT c.*, i.name AS institution_name, i.wallet_address AS institution_wallet, s.name AS student_name, s.wallet_address AS student_wallet
      FROM credentials c
      JOIN institutions i ON c.institution_id = i.id
      JOIN students s ON c.student_id = s.id
      WHERE LOWER(s.wallet_address) = LOWER(?)`,
      [wallet]
    );

    const provider = new ethers.JsonRpcProvider(process.env.HARDHAT_RPC_URL || 'http://127.0.0.1:8545');
    const contract = new ethers.Contract(artifact.contractAddress, artifact.abi, provider);

    const enrichedData = await Promise.all(
      rows.map(async (row) => {
        try {
          const onChainData = await contract.verifyCredential(row.credential_id);
          return { ...row, on_chain_valid: onChainData[0] };
        } catch (err) { return { ...row, on_chain_valid: false }; }
      })
    );
    return NextResponse.json({ success: true, data: enrichedData });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to fetch student credentials' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { name, wallet_address } = await request.json();
    if (!wallet_address) return NextResponse.json({ success: false, error: 'wallet_address required' }, { status: 400 });

    const [rows] = await pool.query('SELECT id, name, wallet_address FROM students WHERE LOWER(wallet_address) = LOWER(?)', [wallet_address]);
    if (rows.length > 0) return NextResponse.json({ success: true, data: rows[0] });

    const [result] = await pool.query('INSERT INTO students (name, wallet_address) VALUES (?, ?)', [name || `Student ${wallet_address.substring(0,6)}`, wallet_address]);
    return NextResponse.json({ success: true, data: { id: result.insertId, name, wallet_address } }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to create student' }, { status: 500 });
  }
}