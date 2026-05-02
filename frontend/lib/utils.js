import { ethers } from "ethers";

export const generateCertificateHash = (certificateName, issuedDate, studentWallet) => {
  const formattedDate = new Date(issuedDate).toISOString().split('T')[0];
  return ethers.keccak256(
    ethers.solidityPacked(
      ['string', 'string', 'address'],
      [certificateName, formattedDate, studentWallet]
    )
  );
};