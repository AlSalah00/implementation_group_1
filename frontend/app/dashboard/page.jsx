"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { getAuthState, logout } from "@/lib/auth";
import { QRCodeSVG } from "qrcode.react";
import { connectWallet, getContractWithSigner } from "@/lib/contract";

export default function Dashboard() {
  const [credentials, setCredentials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [auth, setAuth] = useState(undefined);
  const [statusMsg, setStatusMsg] = useState("");
  const [showRevokeModal, setShowRevokeModal] = useState(false);
  const [revokeReason, setRevokeReason] = useState("");
  const [selectedCert, setSelectedCert] = useState(null);

  useEffect(() => {
    const authState = getAuthState();
    setAuth(authState);

    const loadCredentials = async () => {
      if (!authState) {
        setStatusMsg("Please login to access the dashboard.");
        setLoading(false);
        return;
      }

      try {
        if (authState.role === "student") {
          const data = await api.getStudentCredentials(authState.wallet);
          setCredentials(data || []);
        } else if (authState.role === "institution") {
          const data = await api.getInstitutionCredentials(authState.wallet);
          setCredentials(data || []);
        } else {
          setStatusMsg("Please login as a student or institution to access this dashboard.");
        }
      } catch (err) {
        console.error(err);
        setStatusMsg("Failed to load credentials.");
      } finally {
        setLoading(false);
      }
    };

    loadCredentials();
  }, []);

  const handleLogout = () => {
    logout();
    setAuth(null);
  };

  const openRevokeModal = (cert) => {
    setSelectedCert(cert);
    setRevokeReason("");
    setShowRevokeModal(true);
    setStatusMsg("");
  };

  const closeRevokeModal = () => {
    setShowRevokeModal(false);
    setSelectedCert(null);
    setRevokeReason("");
  };

  const submitRevoke = async () => {
    if (!revokeReason || !revokeReason.trim()) {
      setStatusMsg("Revocation cancelled: reason required.");
      return;
    }

    setStatusMsg("Preparing on-chain transaction...");
    setLoading(true);
    try {
      const { signer } = await connectWallet({ useBrowserWallet: true });
      const signerAddress = (await signer.getAddress()).toLowerCase();
      if (!auth || auth.role !== 'institution' || auth.wallet.toLowerCase() !== signerAddress) {
        throw new Error('Please connect the authorized registrar wallet in MetaMask before revoking.');
      }

      const contract = getContractWithSigner(signer);
      setStatusMsg("Sending revoke transaction on-chain...");
      const tx = await contract.revokeCredential(selectedCert.credential_id, revokeReason);
      await tx.wait();

      setStatusMsg("On-chain revoke confirmed. Updating database...");
      await api.revokeCredential(selectedCert.credential_id, revokeReason);

      setStatusMsg("Credential revoked successfully.");
      const data = await api.getInstitutionCredentials(auth.wallet);
      setCredentials(data || []);
      closeRevokeModal();
    } catch (err) {
      console.error(err);
      setStatusMsg(err.message || "Revocation failed.");
    } finally {
      setLoading(false);
    }
  };

  if (auth === undefined) {
    return <div className="font-serif text-xl uppercase tracking-widest text-center mt-20">Loading authentication state...</div>;
  }

  if (!auth) {
    return (
      <div className="max-w-2xl mx-auto text-center py-20">
        <h2 className="text-3xl font-serif mb-6">Dashboard</h2>
        <p className="text-gray-600 mb-8">Please login to view credentials.</p>
        <Link href="/login" className="px-8 py-4 bg-ink text-white uppercase tracking-widest text-sm font-bold hover:bg-accent transition">
          Login
        </Link>
      </div>
    );
  }

  if (loading) return <div className="font-serif text-xl uppercase tracking-widest text-center mt-20">Retrieving archives...</div>;

  const isInstitution = auth.role === 'institution';

  return (
    <div className="space-y-10">
      <header className="border-b-2 border-ink pb-6 text-center">
        <h1 className="text-4xl font-serif uppercase tracking-widest">{isInstitution ? 'Institution Dashboard' : 'Personal Dashboard'}</h1>
        <p className="text-sm font-mono mt-4 text-gray-600">WALLET: {auth.wallet}</p>
      </header>
      {statusMsg && <p className="text-center text-sm text-stamp uppercase tracking-widest">{statusMsg}</p>}

      {showRevokeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black opacity-50" onClick={closeRevokeModal} />
          <div className="relative bg-white border-2 border-ink p-6 rounded max-w-lg w-full z-10">
            <h2 className="text-2xl font-serif mb-2">Revoke Credential</h2>
            <p className="text-sm text-gray-600 mb-4">Credential: {selectedCert?.certificate_name} — {selectedCert?.credential_id}</p>
            <label className="block text-xs font-bold uppercase tracking-widest mb-2">Reason for revocation</label>
            <textarea value={revokeReason} onChange={(e) => setRevokeReason(e.target.value)} rows={4} className="w-full p-3 bg-transparent outline-none font-serif text-base border border-ink rounded mb-4" placeholder="Provide a brief reason for revocation" />
            <div className="flex justify-end gap-3">
              <button onClick={closeRevokeModal} className="px-4 py-2 border border-ink">Cancel</button>
              <button onClick={submitRevoke} disabled={!revokeReason.trim() || loading} className="px-4 py-2 bg-stamp text-white uppercase tracking-widest text-sm font-bold disabled:opacity-50">Confirm Revoke</button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {credentials.length === 0 ? (
          <p className="text-gray-500 italic font-serif col-span-2 text-center">No official records found.</p>
        ) : (
          credentials.map((cert) => (
            <div key={cert.credential_id || cert.id} className="bg-white border-2 border-ink p-8 shadow-document flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start border-b border-ink pb-4 mb-4">
                  <h3 className="text-2xl font-serif pr-4">{cert.certificate_name}</h3>
                  <span className={`text-xs font-bold uppercase tracking-widest px-2 py-1 border ${cert.on_chain_valid ? 'border-accent text-accent' : 'border-stamp text-stamp'}`}>
                    {cert.on_chain_valid ? 'Valid' : 'Revoked'}
                  </span>
                </div>
                <div className="space-y-2 text-sm font-sans mb-8">
                  <p><span className="font-bold uppercase tracking-widest text-gray-500 text-xs">Issued By:</span> <br/>{cert.institution_name}</p>
                  <p><span className="font-bold uppercase tracking-widest text-gray-500 text-xs">Issue Date:</span> <br/>{cert.issued_date}</p>
                  <p><span className="font-bold uppercase tracking-widest text-gray-500 text-xs">Student:</span> <br/>{cert.student_name || cert.student_wallet}</p>
                  <p><span className="font-bold uppercase tracking-widest text-gray-500 text-xs">Credential ID:</span> <br/>{cert.credential_id}</p>
                </div>
              </div>
              <div className="pt-6 border-t border-ink flex justify-between items-end">
                <p className="text-xs max-w-[60%] text-gray-500">Scan to share public verification link.</p>
                <div className="flex gap-3 items-center">
                  <div className="p-2 border border-ink">
                    <QRCodeSVG value={`${typeof window !== 'undefined' ? window.location.origin : ''}/verify?id=${cert.credential_id}`} size={72} level="H" />
                  </div>
                  {isInstitution && (
                    <button onClick={() => openRevokeModal(cert)} disabled={!cert.on_chain_valid || loading} className="px-6 py-3 bg-stamp text-white uppercase tracking-widest text-sm font-bold hover:opacity-90 transition disabled:opacity-40">
                      Revoke
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}