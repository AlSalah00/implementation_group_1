"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { getAuthState } from "@/lib/auth";
import { connectWallet, getContractWithSigner } from "@/lib/contract";
import { generateCertificateHash } from "@/lib/utils";

const generateUUID = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for environments without randomUUID
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

export default function IssueCredential() {
  const [formData, setFormData] = useState({
    holder_name: "",
    student_wallet: "",
    institution_id: "",
    certificate_name: "",
    issued_date: "",
  });
  const [status, setStatus] = useState({ loading: false, msg: "", type: "" });
  const [institutions, setInstitutions] = useState([]);
  const [auth, setAuth] = useState(undefined);

  useEffect(() => {
    const authState = getAuthState();
    setAuth(authState);

    const loadData = async () => {
      try {
        if (authState && authState.role === 'institution') {
          const data = await api.getInstitutions();
          const matched = (data || []).find(i => i.wallet_address.toLowerCase() === authState.wallet.toLowerCase());
          if (matched) {
            setFormData((prev) => ({ ...prev, institution_id: matched.id }));
          } else {
            // create DB record for this institution if missing
            const created = await api.createInstitution({ wallet_address: authState.wallet, name: `Institution ${authState.wallet.substring(0,6)}` });
            setFormData((prev) => ({ ...prev, institution_id: created.id }));
          }
        }
      } catch (err) {
        console.error('Load institution error:', err);
        setStatus({ loading: false, msg: "Unable to resolve institution record.", type: "error" });
      }
    };

    loadData();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.holder_name.trim()) {
      setStatus({ loading: false, msg: "Please enter the holder name.", type: "error" });
      return;
    }

    if (!formData.student_wallet.trim()) {
      setStatus({ loading: false, msg: "Please enter the student wallet address.", type: "error" });
      return;
    }

    setStatus({ loading: true, msg: "Anchoring record to blockchain...", type: "info" });
    try {
      // Connect MetaMask and get signer
      const { signer } = await connectWallet({ useBrowserWallet: true });
      const signerAddress = (await signer.getAddress()).toLowerCase();

      // Ensure connected wallet matches authenticated institution
      if (!auth || auth.role !== 'institution' || auth.wallet.toLowerCase() !== signerAddress) {
        throw new Error('Please connect the authorized registrar wallet in MetaMask before issuing.');
      }

      const credential_id = generateUUID();

      // Compute data hash locally to pass to contract
      const formattedDate = new Date(formData.issued_date).toISOString().split('T')[0];
      const dataHash = generateCertificateHash(formData.certificate_name, formattedDate, formData.student_wallet);

      const contract = getContractWithSigner(signer);
      console.log('[UI] Issuing credential on-chain...');
      const tx = await contract.issueCredential(credential_id, formData.student_wallet, dataHash);
      await tx.wait();

      // Resolve institution_id if not already set (ensure DB record exists)
      let institutionId = formData.institution_id;
      if (!institutionId) {
        const institutions = await api.getInstitutions();
        const matched = (institutions || []).find(i => i.wallet_address.toLowerCase() === signerAddress);
        if (matched) institutionId = matched.id;
        else {
          const created = await api.createInstitution({ wallet_address: signerAddress, name: `Institution ${signerAddress.substring(0,6)}` });
          institutionId = created.id;
        }
      }

      // Save to DB (server-side) after successful on-chain issuance
      const payload = {
        credential_id,
        institution_id: Number(institutionId),
        holder_name: formData.holder_name,
        student_wallet: formData.student_wallet,
        certificate_name: formData.certificate_name,
        issued_date: formData.issued_date,
        txHash: tx.hash,
      };

      await api.issueCredential(payload);

      setStatus({ loading: false, msg: `Document recorded successfully. Ref: ${credential_id}`, type: "success" });
      setFormData((prev) => ({ ...prev, holder_name: "", student_wallet: "", certificate_name: "", issued_date: "" }));
    } catch (err) {
      setStatus({ loading: false, msg: err.message || "Execution failed.", type: "error" });
    }
  };


  if (auth === undefined) {
    return <div className="font-serif text-xl uppercase tracking-widest text-center mt-20">Checking authentication...</div>;
  }

  if (!auth || auth.role !== "institution") {
    return (
      <div className="max-w-2xl mx-auto text-center py-20">
        <h2 className="text-3xl font-serif mb-6">Issuance Access Restricted</h2>
        <p className="text-gray-600 mb-8">
          Only the authorized registrar wallet may issue certificates on-chain. Please login as the institution.
        </p>
        <Link href="/login" className="px-8 py-4 bg-ink text-white uppercase tracking-widest text-sm font-bold hover:bg-accent transition">
          Login as Registrar
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto bg-white border-2 border-ink p-10 shadow-document">
      <div className="border-b-2 border-ink pb-6 mb-8 text-center">
        <h2 className="text-3xl font-serif uppercase tracking-widest">Issuance Form</h2>
        <p className="text-xs uppercase tracking-widest text-gray-500 mt-2">
          Certificates are issued on-chain by the connected institution wallet.
        </p>
        <p className="text-xs uppercase tracking-widest text-gray-500 mt-2">
          Registrar wallet: {auth.wallet}
        </p>
      </div>
      {status.msg && (
        <div className={`p-4 mb-6 border-2 text-sm font-bold uppercase tracking-wide ${status.type === 'error' ? 'border-stamp text-stamp' : status.type === 'success' ? 'border-accent text-accent' : 'border-ink text-ink'}`}>
          {status.msg}
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 gap-8">
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest border-b border-ink mb-2">Issuer (connected wallet)</label>
            <input type="text" readOnly value={auth?.wallet || ""} className="w-full p-3 bg-transparent outline-none font-serif text-base border border-ink rounded" />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest border-b border-ink mb-2">Holder Name</label>
            <input type="text" required value={formData.holder_name} onChange={(e) => setFormData({ ...formData, holder_name: e.target.value })} placeholder="Full name of credential holder" className="w-full p-3 bg-transparent outline-none font-serif text-base" />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest border-b border-ink mb-2">Student Wallet Address</label>
            <input type="text" required value={formData.student_wallet} onChange={(e) => setFormData({ ...formData, student_wallet: e.target.value })} placeholder="0x..." className="w-full p-3 bg-transparent outline-none font-serif text-base" />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest border-b border-ink mb-2">Certificate Name</label>
            <input type="text" required value={formData.certificate_name} onChange={(e) => setFormData({ ...formData, certificate_name: e.target.value })} placeholder="e.g., Bachelor of Science in Computer Science" className="w-full p-3 bg-transparent outline-none font-serif text-base" />
          </div>
          <div className="grid grid-cols-1 gap-8">
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest border-b border-ink mb-2">Date of Issue</label>
              <input type="date" required value={formData.issued_date} onChange={(e) => setFormData({ ...formData, issued_date: e.target.value })} className="w-full p-3 bg-transparent outline-none font-serif text-base" />
            </div>
          </div>
        </div>
        <div className="pt-8 mt-8 border-t-2 border-ink flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <button type="submit" disabled={status.loading} className="px-8 py-4 bg-ink text-white uppercase tracking-widest text-sm font-bold hover:bg-accent transition disabled:opacity-50">
            {status.loading ? "Processing..." : "Authorize & Stamp"}
          </button>
        </div>
      </form>
    </div>
  );
}
