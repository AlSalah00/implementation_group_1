import { connectWallet } from "@/lib/contract";
import { api } from "@/lib/api";
import { ethers } from "ethers";
import artifact from "@/lib/CredentialRegistry.json";

const AUTH_KEY = "credential_auth";

const emitAuthChange = () => {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("authChange"));
  }
};

export const getAuthState = () => {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(AUTH_KEY);
  return raw ? JSON.parse(raw) : null;
};

export const loginAsStudent = async (walletAddress, studentId) => {
  const auth = { role: "student", wallet: walletAddress.toLowerCase(), studentId, label: "Student" };
  window.localStorage.setItem(AUTH_KEY, JSON.stringify(auth));
  emitAuthChange(); return auth;
};

export const loginAsInstitution = async (walletAddress, institutionId = null) => {
  const auth = { role: "institution", wallet: walletAddress.toLowerCase(), institutionId, label: "Registrar" };
  window.localStorage.setItem(AUTH_KEY, JSON.stringify(auth));
  emitAuthChange(); return auth;
};

export const loginAsAdmin = async (walletAddress) => {
  const auth = { role: "admin", wallet: walletAddress.toLowerCase(), label: "Admin" };
  window.localStorage.setItem(AUTH_KEY, JSON.stringify(auth));
  emitAuthChange(); return auth;
};

export const logout = () => {
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(AUTH_KEY);
    emitAuthChange();
  }
};

export const loginWithMetaMask = async () => {
  if (typeof window === "undefined") throw new Error("MetaMask login must run in the browser");
  if (!window.ethereum) throw new Error("MetaMask not detected");

  const { signer, provider } = await connectWallet({ useBrowserWallet: true });
  const address = (await signer.getAddress()).toLowerCase();

  const readContract = new ethers.Contract(artifact.contractAddress, artifact.abi, provider);
  
  // Admin Check
  try {
    const ownerAddr = await readContract.owner();
    if (ownerAddr && ownerAddr.toLowerCase() === address) return await loginAsAdmin(address);
  } catch (err) {}

  // Institution Check
  let isAuthorized = false;
  try {
    isAuthorized = await readContract.authorizedInstitutions(address);
  } catch (err) {}

  if (isAuthorized) {
    try {
      const institutions = await api.getInstitutions();
      let matched = (institutions || []).find(i => i.wallet_address.toLowerCase() === address);
      if (!matched) {
        matched = await api.createInstitution({ wallet_address: address, name: `Institution ${address.substring(0,6)}` });
      }
      return await loginAsInstitution(address, matched.id);
    } catch (err) {
      return await loginAsInstitution(address, null);
    }
  }

  // Student Fallback
  try {
    const students = await api.getStudentList();
    let student = (students || []).find(s => s.wallet_address.toLowerCase() === address);
    if (!student) {
      student = await api.createStudent({ name: `Student ${address.substring(0,6)}`, wallet_address: address });
    }
    return await loginAsStudent(address, student ? student.id : null);
  } catch (err) {
    return await loginAsStudent(address, null);
  }
};