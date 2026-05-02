require("dotenv").config();
const hre = require("hardhat");
const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const customKey = process.env.DEPLOYER_PRIVATE_KEY || process.env.ADMIN_PRIVATE_KEY || process.env.PRIVATE_KEY;
  let deployer;

  if (customKey) {
    const wallet = new ethers.Wallet(customKey, ethers.provider);
    deployer = wallet;

    console.log("Using custom deployer wallet:", deployer.address);

    const bal = await ethers.provider.getBalance(deployer.address);

    if (bal < ethers.parseEther("1")) {
      try {
        const signers = await ethers.getSigners();
        const funder = signers[0];
        console.log("Funding deployer from Hardhat account:", funder.address);
        const tx = await funder.sendTransaction({ to: deployer.address, value: ethers.parseEther("10") });
        await tx.wait();
        console.log("Fund tx:", tx.hash);
      } catch (e) {
        console.warn('Failed to auto-fund custom deployer:', e?.message || e);
      }
    }
    const balance = await ethers.provider.getBalance(deployer.address);
    console.log("Deployer balance:", ethers.formatEther(balance), "ETH\n");
  } else {
    const signers = await ethers.getSigners();
    deployer = signers[0];
    console.log("Deploying with account:", deployer.address);
    const balance = await ethers.provider.getBalance(deployer.address);
    console.log("Account balance:       ", ethers.formatEther(balance), "ETH\n");
  }

  const ContractFactory = await ethers.getContractFactory("CredentialRegistry", deployer);
  const contract = await ContractFactory.deploy();
  await contract.waitForDeployment();
  const contractAddress = await contract.getAddress();
  console.log("CredentialRegistry deployed to:", contractAddress);

  const artifact = await hre.artifacts.readArtifact("CredentialRegistry");


  const exportData = {
    network:         hre.network.name,
    contractAddress: contractAddress,
    deployedBy:      deployer.address,
    deployedAt:      new Date().toISOString(),
    abi:             artifact.abi,
  };

  const exportDir  = path.join(__dirname, "..", "artifacts-export");
  const exportFile = path.join(exportDir, "CredentialRegistry.json");

  fs.mkdirSync(exportDir, { recursive: true });
  fs.writeFileSync(exportFile, JSON.stringify(exportData, null, 2));

  console.log("\nABI + address exported to:", exportFile);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});