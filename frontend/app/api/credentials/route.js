import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { ethers } from 'ethers';
import artifact from '@/lib/CredentialRegistry.json';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const institutionWallet = searchParams.get('institution_wallet');

    let sql = `
      SELECT c.*, i.name AS institution_name, i.wallet_address AS institution_wallet, s.name AS student_name, s.wallet_address AS student_wallet
      FROM credentials c JOIN institutions i ON c.institution_id = i.id JOIN students s ON c.student_id = s.id
    `;
    const params = [];
    if (institutionWallet) {
      sql += ` WHERE LOWER(i.wallet_address) = LOWER(?)`;
      params.push(institutionWallet);
    }

    const [rows] = await pool.query(sql, params);

    // If requested for a specific institution, enrich with on-chain validity
    if (institutionWallet && rows.length > 0) {
      const provider = new ethers.JsonRpcProvider(process.env.HARDHAT_RPC_URL || 'http://127.0.0.1:8545');
      const contract = new ethers.Contract(artifact.contractAddress, artifact.abi, provider);
      const enriched = await Promise.all(rows.map(async (row) => {
        try {
          const onChainData = await contract.verifyCredential(row.credential_id);
          return { ...row, on_chain_valid: onChainData[0] };
        } catch (err) {
          return { ...row, on_chain_valid: false };
        }
      }));
      return NextResponse.json({ success: true, data: enriched });
    }

    return NextResponse.json({ success: true, data: rows });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to fetch credentials' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { credential_id, institution_id, holder_name, student_wallet, certificate_name, issued_date, txHash } = await request.json();

    const [institutionRows] = await pool.query('SELECT id, wallet_address FROM institutions WHERE id = ?', [institution_id]);
    if (institutionRows.length === 0) return NextResponse.json({ success: false, error: 'Institution does not exist' }, { status: 400 });

    const provider = new ethers.JsonRpcProvider(process.env.HARDHAT_RPC_URL || 'http://127.0.0.1:8545');
    const readContract = new ethers.Contract(artifact.contractAddress, artifact.abi, provider);
    if (!(await readContract.authorizedInstitutions(institutionRows[0].wallet_address))) return NextResponse.json({ success: false, error: 'Institution not authorized' }, { status: 403 });

    let studentId;
    const [studentRows] = await pool.query('SELECT id FROM students WHERE LOWER(wallet_address) = LOWER(?)', [student_wallet]);
    
    if (studentRows.length > 0) {
      studentId = studentRows[0].id;
      await pool.query('UPDATE students SET name = ? WHERE id = ?', [holder_name, studentId]);
    } else {
      const [insertResult] = await pool.query(
        'INSERT INTO students (name, wallet_address) VALUES (?, ?)',
        [holder_name, student_wallet]
      );
      studentId = insertResult.insertId;
    }

    const dataHash = ethers.keccak256(ethers.solidityPacked(['string', 'string', 'address'], [certificate_name, new Date(issued_date).toISOString().split('T')[0], student_wallet]));

    const [result] = await pool.query(
      `INSERT INTO credentials (credential_id, institution_id, student_id, certificate_name, issued_date, status, data_hash, tx_hash) VALUES (?, ?, ?, ?, ?, 'active', ?, ?)`,
      [credential_id, institution_id, studentId, certificate_name, issued_date, dataHash, txHash || null]
    );
    return NextResponse.json({ success: true, data: result }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to create credential' }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const [result] = await pool.query(`UPDATE credentials SET status = 'revoked', revocation_reason = ? WHERE credential_id = ?`, [searchParams.get('reason'), searchParams.get('credential_id')]);
    if (result.affectedRows === 0) return NextResponse.json({ success: false, error: 'Credential not found' }, { status: 404 });
    return NextResponse.json({ success: true, message: 'Revoked successfully' });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to revoke' }, { status: 500 });
  }
}