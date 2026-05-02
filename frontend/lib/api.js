export const api = {
  getCredentials: async () => {
    const response = await fetch("/api/credentials", {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Failed to fetch credentials");
    return result.data;
  },

  issueCredential: async (data) => {
    const response = await fetch("/api/credentials", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Failed to issue credential");
    return result;
  },

  getStudentCredentials: async (walletAddress) => {
    const response = await fetch(`/api/students?wallet=${walletAddress}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Failed to fetch student credentials");
    return result.data;
  },

  getInstitutionCredentials: async (walletAddress) => {
    const response = await fetch(`/api/credentials?institution_wallet=${encodeURIComponent(walletAddress)}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Failed to fetch institution credentials");
    return result.data;
  },

  getStudentList: async () => {
    const response = await fetch("/api/students", {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Failed to fetch students");
    return result.data;
  },

  getInstitutions: async () => {
    const response = await fetch("/api/institutions", {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Failed to fetch institutions");
    return result.data;
  },

  createInstitution: async (data) => {
    const response = await fetch("/api/institutions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Failed to create institution");
    return result.data;
  },

  authorizeInstitution: async (walletAddress, fundAmount = 0.05) => {
    const response = await fetch("/api/institutions/authorize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ wallet_address: walletAddress, fundAmount }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Failed to authorize institution");
    return result;
  },

  fundAccount: async (walletAddress, amountEth = 0.05) => {
    const response = await fetch("/api/accounts/fund", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ wallet_address: walletAddress, amount: amountEth }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Failed to fund account");
    return result;
  },

  createStudent: async (data) => {
    const response = await fetch("/api/students", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Failed to create student");
    return result.data;
  },

  revokeCredential: async (credentialId, reason) => {
    const url = `/api/credentials?credential_id=${encodeURIComponent(credentialId)}&reason=${encodeURIComponent(reason)}`;
    const response = await fetch(url, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Failed to revoke credential");
    return result;
  },

  setupInstitution: async () => {
    const response = await fetch("/api/credentials", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Failed to setup institution");
    return result;
  }
};