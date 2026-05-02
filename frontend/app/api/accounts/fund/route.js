import { NextResponse } from 'next/server';
import { ethers } from 'ethers';

export async function POST(request) {
  try {
    const { wallet_address, amount } = await request.json();
    if (!wallet_address || !amount) return NextResponse.json({ success: false, error: 'wallet_address and amount are required' }, { status: 400 });

    const adminKey = process.env.ADMIN_PRIVATE_KEY || process.env.ADMIN_PK || process.env.NEXT_PUBLIC_ADMIN_PRIVATE_KEY || null;
    if (!adminKey) return NextResponse.json({ success: false, error: 'ADMIN_PRIVATE_KEY not configured on server' }, { status: 400 });

    const provider = new ethers.JsonRpcProvider(process.env.HARDHAT_RPC_URL || 'http://127.0.0.1:8545');
    const ownerWallet = new ethers.Wallet(adminKey, provider);

    const tx = await ownerWallet.sendTransaction({ to: wallet_address, value: ethers.parseEther(String(amount)) });
    await tx.wait();

    return NextResponse.json({ success: true, txHash: tx.hash });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to fund account' }, { status: 500 });
  }
}