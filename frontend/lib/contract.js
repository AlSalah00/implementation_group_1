import { ethers } from "ethers";
import artifact     from '@/lib/CredentialRegistry.json';

export function getContractReadOnly() {
  const provider = new ethers.JsonRpcProvider(process.env.HARDHAT_RPC_URL || 'http://127.0.0.1:8545');
  return new ethers.Contract(artifact.contractAddress, artifact.abi, provider);
}

export function getContractWithSigner(signer) {
  return new ethers.Contract(artifact.contractAddress, artifact.abi, signer);
}

export const connectWallet = async ({ accountIndex = 2, useBrowserWallet = false } = {}) => {
  if (typeof window !== "undefined" && useBrowserWallet && window.ethereum) {
    const provider = new ethers.BrowserProvider(window.ethereum);
    try {
      await provider.send("eth_requestAccounts", []);
    } catch (err) {
      if (window.ethereum && typeof window.ethereum.request === 'function') {
        await window.ethereum.request({ method: 'eth_requestAccounts' });
      } else throw err;
    }
    const signer = await provider.getSigner();
    return { provider, signer };
  }

  const provider = new ethers.JsonRpcProvider(process.env.HARDHAT_RPC_URL || 'http://127.0.0.1:8545');
  const signer = await provider.getSigner(accountIndex);
  return { provider, signer };
};