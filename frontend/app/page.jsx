"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { getAuthState } from "@/lib/auth";

export default function Home() {
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const checkConnected = async () => {
      if (typeof window === "undefined") return;
      try {
        const auth = getAuthState();
        if (auth) {
          setIsConnected(true);
          return;
        }
      } catch (e) {}

      if (window.ethereum && window.ethereum.request) {
        try {
          const accounts = await window.ethereum.request({ method: "eth_accounts" });
          setIsConnected(Array.isArray(accounts) && accounts.length > 0);
        } catch (err) {
          // ignore
        }
      }
    };

    checkConnected();

    const handleAccountsChanged = (accounts) => setIsConnected(Array.isArray(accounts) && accounts.length > 0);
    if (window.ethereum && window.ethereum.on) window.ethereum.on("accountsChanged", handleAccountsChanged);
    return () => {
      if (window.ethereum && window.ethereum.removeListener) window.ethereum.removeListener("accountsChanged", handleAccountsChanged);
    };
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] text-center border-2 border-ink p-12 bg-white shadow-document">
      <h1 className="text-5xl font-serif font-bold uppercase tracking-widest mb-6 text-ink">
        Credential Registry
      </h1>
      <p className="text-lg text-gray-600 max-w-2xl font-serif mb-10 leading-relaxed">
        Verify and manage academic credentials on the blockchain. Institutions can issue tamper-proof records, while students can easily share and verify their achievements.
      </p>
      <div className="flex space-x-6">
        <Link href="/verify" className="px-8 py-4 bg-ink text-white text-sm font-bold tracking-widest uppercase hover:bg-accent transition">
          Verify a Record
        </Link>
        {!isConnected && (
          <Link href="/login" className="px-8 py-4 border-2 border-ink bg-transparent text-ink text-sm font-bold tracking-widest uppercase hover:bg-paper transition">
            Connect Wallet
          </Link>
        )}
      </div>
    </div>
  );
}