import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { ethers } from 'ethers';
import artifact from '@/lib/CredentialRegistry.json';

export async function POST(request) {
  try {
    const body = await request.json();
    const wallet = body.wallet_address;
    if (!wallet) return NextResponse.json({ success: false, error: 'wallet_address is required' }, { status: 400 });

    const adminKey = process.env.ADMIN_PRIVATE_KEY || process.env.ADMIN_PK || process.env.NEXT_PUBLIC_ADMIN_PRIVATE_KEY || null;
    if (!adminKey) {
      return NextResponse.json({ success: false, error: 'ADMIN_PRIVATE_KEY not configured on server. Set ADMIN_PRIVATE_KEY in environment or frontend/.env.local.' }, { status: 400 });
    }

    const provider = new ethers.JsonRpcProvider(process.env.HARDHAT_RPC_URL || 'http://127.0.0.1:8545');
    const readOnly = new ethers.Contract(artifact.contractAddress, artifact.abi, provider);

    let already = false;
    try { already = await readOnly.authorizedInstitutions(wallet); } catch (e) {}
    
    if (already) {
      await pool.query("UPDATE institutions SET status = 'authorized' WHERE LOWER(wallet_address) = LOWER(?)", [wallet]);
      return NextResponse.json({ success: true, message: 'Already authorized on-chain' });
    }

    const ownerWallet = new ethers.Wallet(adminKey, provider);
    const writeContract = new ethers.Contract(artifact.contractAddress, artifact.abi, ownerWallet);
    const tx = await writeContract.addInstitution(wallet);
    await tx.wait();

    // Update DB status
    const [existing] = await pool.query('SELECT id FROM institutions WHERE LOWER(wallet_address) = LOWER(?)', [wallet]);
    if (existing.length === 0) {
      await pool.query("INSERT INTO institutions (name, wallet_address, status) VALUES (?, ?, 'authorized')", [`Institution ${wallet.substring(0,6)}`, wallet]);
    } else {
      await pool.query("UPDATE institutions SET status = 'authorized' WHERE LOWER(wallet_address) = LOWER(?)", [wallet]);
    }

    return NextResponse.json({ success: true, message: 'Institution authorized', address: wallet, txHash: tx.hash });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message || 'Failed to authorize' }, { status: 500 });
  }
}