const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function addInstitution() {
  // Connect to the existing deployed contract
  const artifactPath = path.join(__dirname, "artifacts-export", "CredentialRegistry.json");
  const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));

  const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
  const [deployer, institution] = await ethers.getSigners();

  console.log("Contract address:", artifact.contractAddress);
  console.log("Deployer address:", deployer.address);
  console.log("Institution address:", institution.address);

  const contract = new ethers.Contract(artifact.contractAddress, artifact.abi, deployer);

  // Add institution to authorized list
  console.log("Adding institution to authorized list...");
  const tx = await contract.addInstitution(institution.address);
  await tx.wait();

  console.log("✓ Institution authorized:", institution.address);
  console.log("Transaction hash:", tx.hash);

  // Update the artifact file with institution info
  artifact.institution = institution.address;
  fs.writeFileSync(artifactPath, JSON.stringify(artifact, null, 2));
  console.log("✓ Artifact updated with institution address");
}

addInstitution().catch(console.error);
