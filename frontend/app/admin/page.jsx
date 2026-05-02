"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { connectWallet } from "@/lib/contract";
import { getAuthState } from "@/lib/auth";

export default function AdminPage() {
  const [institutions, setInstitutions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(null);
  const [status, setStatus] = useState("");

  useEffect(() => {
    refresh();
    const a = getAuthState();
    if (a?.wallet) setConnected(a.wallet);
  }, []);

  const refresh = async () => {
    setLoading(true);
    try {
      const inst = await api.getInstitutions();
      setInstitutions(inst || []);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const handleConnect = async () => {
    try {
      const { signer } = await connectWallet({ useBrowserWallet: true });
      const address = await signer.getAddress();
      setConnected(address);
      setStatus('Connected ' + address);
    } catch (err) {
      setStatus('Connect failed: ' + (err?.message || err));
    }
  };

  const ensureOnChain = async (wallet) => {
    setStatus('Authorizing ' + wallet + ' ...');
    try {
      const res = await api.authorizeInstitution(wallet, 0); // Auth only
      setStatus(res.message || 'Authorized');
      await refresh();
    } catch (err) {
      setStatus('Authorize failed: ' + (err?.message || err));
    }
  };

  const fund = async (wallet) => {
    setStatus('Funding ' + wallet + ' ...');
    try {
      const res = await api.fundAccount(wallet, 0.5);
      setStatus('Fund tx ' + res.txHash);
    } catch (err) {
      setStatus('Fund failed: ' + (err?.message || err));
    }
  };

  const pendingInsts = institutions.filter(i => i.status === 'pending');
  const authInsts = institutions.filter(i => i.status === 'authorized');

  return (
    <div className="max-w-4xl mx-auto py-10">
      <header className="mb-8">
        <h1 className="text-3xl font-serif uppercase">Admin Dashboard</h1>
        <p className="text-sm text-gray-600">Review pending requests and fund authorized registrars.</p>
      </header>

      <div className="mb-8 p-4 border border-ink bg-white">
        {!connected ? (
          <button onClick={handleConnect} className="px-4 py-2 bg-ink text-white">Connect MetaMask</button>
        ) : (
          <div className="text-sm">Admin Connected: <span className="font-mono">{connected}</span></div>
        )}
        <div className="mt-2 text-sm text-gray-600">{status}</div>
      </div>

      <section className="mb-10">
        <h2 className="text-xl font-serif mb-4 text-stamp">Pending Authorizations</h2>
        <div className="space-y-4">
          {loading ? <div>Loading...</div> : pendingInsts.length === 0 ? <div className="text-gray-500 italic">No pending requests</div> : pendingInsts.map(inst => (
            <div key={inst.id} className="p-4 border-2 border-stamp bg-white flex justify-between items-center">
              <div>
                <div className="font-bold">{inst.name}</div>
                <div className="text-xs text-gray-600 font-mono">{inst.wallet_address}</div>
              </div>
              <button onClick={() => ensureOnChain(inst.wallet_address)} className="px-4 py-2 bg-stamp text-white font-bold uppercase tracking-widest text-xs hover:bg-red-700 transition">Authorize on-chain</button>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-xl font-serif mb-4 text-accent">Authorized Registrars</h2>
        <div className="space-y-4">
          {loading ? <div>Loading...</div> : authInsts.length === 0 ? <div className="text-gray-500 italic">No authorized institutions</div> : authInsts.map(inst => (
            <div key={inst.id} className="p-4 border-2 border-accent bg-white flex justify-between items-center">
              <div>
                <div className="font-bold">{inst.name}</div>
                <div className="text-xs text-gray-600 font-mono">{inst.wallet_address}</div>
              </div>
              <button onClick={() => fund(inst.wallet_address)} className="px-4 py-2 border-2 border-accent text-accent font-bold uppercase tracking-widest text-xs hover:bg-accent hover:text-white transition">Fund 0.5 ETH</button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}