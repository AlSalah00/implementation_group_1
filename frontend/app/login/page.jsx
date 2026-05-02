"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { getAuthState, loginWithMetaMask, logout } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [status, setStatus] = useState({ loading: false, msg: "", type: "" });
  const [auth, setAuth] = useState(null);
  const [instName, setInstName] = useState("");
  const [authRequestSubmitted, setAuthRequestSubmitted] = useState(false);

  useEffect(() => {
    setAuth(getAuthState());
  }, []);

  const handleConnect = async () => {
    try {
      setStatus({ loading: true, msg: 'Connecting to MetaMask…', type: 'info' });
      const authResult = await loginWithMetaMask();
      setAuth(authResult);
      setStatus({ loading: false, msg: 'Connected.', type: 'success' });
      if (authResult.role === 'admin') router.push('/admin');
      else if (authResult.role === 'institution') router.push('/dashboard');
    } catch (err) {
      setStatus({ loading: false, msg: err.message || 'Connection failed.', type: 'error' });
    }
  };

  const handleLogout = () => {
    logout();
    setAuth(null);
    setStatus({ loading: false, msg: "Logged out successfully.", type: "success" });
  };

  const submitAuthRequest = async (e) => {
    e.preventDefault();
    setStatus({ loading: true, msg: 'Submitting request...', type: 'info' });
    try {
      await api.createInstitution({ name: instName, wallet_address: auth.wallet });
      setStatus({ loading: false, msg: 'Request submitted. Waiting for admin approval.', type: 'success' });
      setInstName("");
      setAuthRequestSubmitted(true);
    } catch (err) {
      setStatus({ loading: false, msg: err.message || 'Failed to submit request.', type: 'error' });
    }
  };

  return (
    <div className="max-w-4xl mx-auto bg-white border-2 border-ink p-10 shadow-document">
      <div className="border-b-2 border-ink pb-6 mb-8 text-center">
        <h1 className="text-4xl font-serif uppercase tracking-widest">Authentication Required</h1>
        <p className="text-sm text-gray-500 mt-3">Use MetaMask to authenticate. The system will detect your on-chain role.</p>
      </div>

      {status.msg && (
        <div className={`p-4 mb-6 border-2 text-sm font-bold uppercase tracking-wide ${status.type === 'error' ? 'border-stamp text-stamp' : status.type === 'success' ? 'border-accent text-accent' : 'border-ink text-ink'}`}>
          {status.msg}
        </div>
      )}

      {!auth ? (
        <div className="bg-paper border border-ink p-8 rounded-lg text-center">
          <h2 className="text-2xl font-serif uppercase tracking-widest mb-4">Connect Wallet</h2>
          <button onClick={handleConnect} disabled={status.loading} className="px-8 py-4 bg-ink text-white uppercase tracking-widest text-sm font-bold hover:bg-accent transition disabled:opacity-50">
            {status.loading ? 'Connecting…' : 'Connect MetaMask'}
          </button>
        </div>
      ) : (
        <div className="space-y-8">
          <div className="bg-paper border border-ink p-6 rounded-lg flex justify-between items-center">
            <div>
              <p className="text-sm uppercase tracking-widest text-gray-600">Authenticated as</p>
              <p className="text-xl font-serif mt-1">{auth.role.toUpperCase()} <span className="text-sm font-mono text-gray-500">({auth.wallet})</span></p>
            </div>
            <div className="flex gap-4">
              <button onClick={() => router.push(auth.role === 'admin' ? '/admin' : auth.role === 'institution' ? '/dashboard' : '/dashboard')} className="px-6 py-3 bg-ink text-white uppercase tracking-widest text-sm font-bold hover:bg-accent transition">Dashboard</button>
              <button onClick={handleLogout} className="px-6 py-3 border border-stamp text-stamp uppercase tracking-widest text-sm font-bold hover:bg-red-50 transition">Logout</button>
            </div>
          </div>

          {auth.role === 'student' && (
            <div className="border-2 border-ink p-8 bg-white">
              <h3 className="text-xl font-serif mb-4">Institution Registration</h3>
              <p className="text-sm text-gray-600 mb-6">Your wallet is not yet authorized as an institution. If you are a registered institution, submit a request below. The admin will review and authorize your wallet.</p>
              {!authRequestSubmitted ? (
                <form onSubmit={submitAuthRequest} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest mb-2">Wallet Address</label>
                    <input type="text" readOnly value={auth.wallet} className="w-full p-3 bg-gray-100 font-mono text-sm border border-gray-300" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest mb-2">Institution Name</label>
                    <input type="text" required value={instName} onChange={(e) => setInstName(e.target.value)} placeholder="e.g., University of Technology" className="w-full p-3 bg-transparent border border-ink outline-none font-serif" />
                  </div>
                  <button type="submit" disabled={status.loading} className="px-6 py-3 bg-ink text-white uppercase tracking-widest text-sm font-bold hover:bg-accent transition disabled:opacity-50">{status.loading ? 'Submitting…' : 'Submit Request'}</button>
                </form>
              ) : (
                <div className="p-4 bg-green-50 border border-accent text-accent">Request submitted. Waiting for admin approval.</div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}