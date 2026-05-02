"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAuthState, logout } from "@/lib/auth";

export default function Navbar() {
  const [auth, setAuth] = useState(null);

  useEffect(() => {
    setAuth(getAuthState());
    const handleAuthChange = () => setAuth(getAuthState());
    window.addEventListener("authChange", handleAuthChange);
    return () => window.removeEventListener("authChange", handleAuthChange);
  }, []);

  const router = useRouter();

  const handleLogout = () => {
    logout();
    setAuth(null);
    router.push('/');
  };

  return (
    <nav className="border-b-2 border-ink bg-paper text-ink p-6">
      <div className="container mx-auto flex justify-between items-center max-w-6xl">
        <Link href="/" className="text-2xl font-serif font-bold tracking-tight uppercase">
          Credential Registry
        </Link>
        <div className="space-x-6 text-sm font-semibold tracking-widest uppercase flex items-center">
          {auth?.role === 'institution' && (
            <Link href="/issue" className="hover:text-accent transition">Issue</Link>
          )}
          <Link href="/verify" className="hover:text-accent transition">Verify</Link>
          {(auth && (auth.role === 'student' || auth.role === 'institution' || auth.role === 'admin')) && (
            <Link href="/dashboard" className="hover:text-accent transition">Dashboard</Link>
          )}
          {auth ? (
            <div className="flex items-center gap-3">
              <div className="px-4 py-2 border border-ink bg-white text-xs font-mono">
                {auth.role === 'institution' ? 'Registrar' : auth.role === 'admin' ? 'Admin' : 'Student'} {auth.wallet.substring(0, 6)}...{auth.wallet.substring(auth.wallet.length - 4)}
              </div>
              <button onClick={handleLogout} className="px-4 py-2 bg-stamp text-white uppercase tracking-widest text-xs hover:bg-red-600 transition">
                Logout
              </button>
            </div>
          ) : (
            <Link href="/login" className="px-6 py-2 bg-ink text-white hover:bg-accent transition">Connect Wallet</Link>
          )}
        </div>
      </div>
    </nav>
  );
}