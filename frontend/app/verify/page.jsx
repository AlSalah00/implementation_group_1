"use client";
import { useState } from "react";
import { api } from "@/lib/api";
import { getContractReadOnly } from "@/lib/contract";

export default function Verify() {
  const [certId, setCertId] = useState("");
  const [status, setStatus] = useState({ loading: false, result: null, data: null });

  const handleVerify = async (e) => {
    e.preventDefault();
    setStatus({ loading: true, result: null, data: null });
    try {
      const allCerts = await api.getCredentials();
      const dbCert = allCerts.find(c => c.credential_id === certId.trim());
      if (!dbCert) {
        return setStatus({
          loading: false,
          result: "ERROR",
          data: { error: "This credential ID was not found in our records. Please check the ID and try again." }
        });
      }

      const contract = getContractReadOnly();
      const [isValid] = await contract.verifyCredential(certId.trim());

      if (!isValid) {
        return setStatus({ loading: false, result: "REVOKED", data: dbCert });
      }

      setStatus({ loading: false, result: "VALID", data: dbCert });

    } catch (err) {
      setStatus({
        loading: false,
        result: "ERROR",
        data: { error: "Unable to verify credential. Please try again later." }
      });
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="text-center mb-10">
        <h1 className="text-4xl font-serif uppercase tracking-widest mb-4">Verification Portal</h1>
      </div>
      <form onSubmit={handleVerify} className="flex border-2 border-ink bg-white shadow-document mb-12">
        <input type="text" value={certId} onChange={(e) => setCertId(e.target.value)} placeholder="Credential Reference ID" required className="flex-grow p-4 text-lg font-serif outline-none bg-transparent" />
        <button type="submit" className="bg-ink text-white px-8 uppercase tracking-widest font-bold hover:bg-accent transition">
          {status.loading ? "Scanning..." : "Verify"}
        </button>
      </form>

      {status.result === "ERROR" && <div className="bg-white border-2 border-stamp text-stamp p-6 font-bold uppercase tracking-widest text-center shadow-document">{status.data.error}</div>}

      {status.result && status.result !== "ERROR" && (
        <div className="bg-white border-2 border-ink p-8 shadow-document">
          <div className="border-b border-ink pb-4 mb-6 flex justify-between items-end">
            <h3 className="text-2xl font-serif">Record Assessment</h3>
            <span className={`px-4 py-1 text-sm font-bold uppercase tracking-widest border-2 ${status.result === 'VALID' ? 'border-accent text-accent' : 'border-stamp text-stamp'}`}>
              STATUS: {status.result}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-y-6 gap-x-12 font-serif">
            <div><p className="text-xs font-sans font-bold uppercase tracking-widest text-gray-500">Name</p><p className="text-xl">{status.data.student_name}</p></div>
            <div><p className="text-xs font-sans font-bold uppercase tracking-widest text-gray-500">Institution</p><p className="text-xl">{status.data.institution_name}</p></div>
            <div className="col-span-2"><p className="text-xs font-sans font-bold uppercase tracking-widest text-gray-500">Qualification</p><p className="text-xl">{status.data.certificate_name}</p></div>
            <div><p className="text-xs font-sans font-bold uppercase tracking-widest text-gray-500">Conferred Date</p><p className="text-xl">{status.data.issued_date}</p></div>
          </div>
          {status.result === 'NOT FOUND' && <p className="mt-8 pt-6 border-t border-ink text-stamp font-bold text-sm uppercase">This credential doesn't exist.</p>}
          {status.result === 'REVOKED' && (
            <p className="mt-8 pt-6 border-t border-ink text-stamp font-bold text-sm uppercase">
              Notice: This credential was revoked by {status.data.institution_name}.
              {status.data.revocation_reason ? ` Reason: ${status.data.revocation_reason}` : ""}
            </p>
          )}
        </div>
      )}
    </div>
  );
}