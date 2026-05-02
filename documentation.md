# Credential Registry - System Documentation

A DApp for issuing, managing, and verifying academic credentials 
on a local Ethereum blockchain.

# 1. System Setup

Follow these steps in order on a fresh machine.

## 1.1. MetaMask setup

MetaMask is required for all user roles. Authentication in this system is wallet-based, 
there are no usernames or passwords.

Step 1: Install MetaMask
Install the MetaMask browser extension and complete the initial wallet creation flow.

Step 2:  Add the Hardhat local network to MetaMask
MetaMask needs to know about the local blockchain node before it can interact with it.

Open MetaMask -> click the network dropdown at the top -> Add a custom network
Fill in the following details exactly:

Network Name: Hardhat Local
New RPC URL: http://127.0.0.1:8545
Chain ID: 1337
Currency Symbol: ETH

Click Save and switch to the Hardhat Local network.


Step 3:  Create the admin wallet
The admin wallet is the wallet that will deploy the smart contract. It becomes the 
permanent owner of the contract on-chain.

In MetaMask, click the account icon -> Add wallet -> Import an account
Name it "Admin" for clarity
Make sure to fill your own generated private key.

Keep this private key, you will need it in the next section.

Note for institutions and students: Each institution and student also needs their own 
MetaMask wallet. They follow the same process, create a new account in MetaMask and share 
the wallet address with the relevant party. No additional network configuration is needed 
beyond what is set up in Step 2.


## 1.2. Database Initilization

Step 1: Create the database and tables

Open a MySQL terminal and run the schema file:
bashmysql -u root -p < database/schema.sql
This creates the credential_registry database and three tables: institutions, students, 
and credentials. No seed data is inserted, all records are created dynamically 
through the application.

Step 2: Create the frontend environment file (if it doesn't exist)
Create a file at frontend/.env.local with the following content, replacing 
the values with your actual MySQL credentials:

DB_HOST=127.0.0.1
DB_USER=root
DB_PASSWORD=insert your MySQL password here
DB_NAME=credential_registry
HARDHAT_RPC_URL=http://127.0.0.1:8545

## 1.3. Blockchain Setup

Step 1: Install dependencies

cd blockchain
npm install

Step 2: Create the blockchain environment file (if doesn't exist)

Create a file at blockchain/.env and paste the admin private key you entered 
in MetaMask in Section 1.1:

ADMIN_PRIVATE_KEY=insert your private key here

This tells the deploy script to use your MetaMask wallet as the contract deployer. 
The wallet that deploys the contract becomes the permanent on-chain owner, meaning 
when you connect this same wallet in the browser, the app recognises you as admin.

Step 3: Start the local Hardhat node

Open a terminal and leave this running for the entire session:

cd blockchain
npx hardhat node

You will see 20 pre-funded test accounts printed. These are available for general testing 
but are not used for any specific role in this system, roles are determined entirely by the 
MetaMask wallet you connect.

Step 4:  Compile and deploy the smart contract

Open a second terminal:

cd blockchain
npx hardhat compile
npx hardhat run scripts/deploy.js --network localhost

If the admin wallet has no ETH on the local node, the deploy script automatically funds 
it from Hardhat's built-in accounts. You do not need to do this manually.

An artifact file CredentialRegistry.json will be generated in blockchain/artifacts-export/, but
it is going to be automatically imported to the frontend when you run the app so no need do anything
manually.


## 1.4. Frontend Setup

Step 1: Install dependencies

cd frontend
npm install

Step 2: Start the development server

npm run dev

The application will be available at http://localhost:3000.


# 2. Running the System

Once everything is set up, use this checklist every time you start a new session.

Terminal 1:  cd blockchain && npx hardhat node          <- keep running
Terminal 2:  cd blockchain && npx hardhat run scripts/deploy.js --network localhost
Terminal 3:  cd frontend && npm run dev

Then open http://localhost:3000 in your browser with MetaMask installed and switched 
to the Hardhat Local network.


# 3. System Features

## 3.1. Public: Homepage & Verification Portal

**Homepage**

The landing page is publicly accessible without any wallet connection. It presents the system 
as an official verification authority and provides two entry points: connecting a wallet to access 
role-based features, or directly verifying a credential.

**Verification Portal (/verify)**

Anyone, employers, institutions, or the general public, can verify a credential without connecting a 
wallet or creating an account.

How it works:

Enter the credential reference ID (a UUID provided by the certificate holder)
The system checks the database to confirm the credential exists
It then calls verifyCredential() on the smart contract in real-time
The result is displayed immediately:

VALID: the credential exists on-chain and has not been revoked
REVOKED: the credential exists but the issuing institution has revoked it, along with the stated reason
Not Found: no credential with that ID exists in the system


The verification result is sourced directly from the blockchain, it cannot be forged or manipulated by anyone, 
including the system administrators. Each credential on the student dashboard also includes a QR code that links 
directly to its verification page, making it easy for students to share their credentials with third parties.


## 3.2. Admin: Institution Management Dashboard

Access: Connect with the wallet that was used to deploy the smart contract. The app reads owner() from the contract 
and compares it against the connected address automatically.
The admin dashboard is the control centre for managing which institutions are authorised to issue credentials. 
The admin has no ability to issue or revoke credentials themselves, that authority belongs exclusively to institutions.

Features:

**View all institutions**
The dashboard displays all institution accounts in the database, showing their name, wallet address, and current 
authorisation status (Pending or Authorized).

**Authorization request handling**
When an institution representative connects their MetaMask wallet for the first time, they are presented with a 
form to submit an authorization request. They enter their institution name and their wallet address is captured 
automatically. This creates a record in the database with a status of pending. The admin sees these pending 
requests in the dashboard and can act on them.

**Authorize an institution**
Clicking the Authorize button on a pending institution triggers a call to addInstitution() on the smart contract, 
passing the institution's wallet address. This is a blockchain transaction confirmed through the admin's MetaMask. 
Once confirmed, the institution's status updates to authorized and they can immediately log in and access the issuance form.

**Fund an institution**
Issuing credentials requires paying a small gas fee in ETH. Clicking the Fund button sends a small amount of test ETH 
from the admin's wallet to the institution's wallet, enabling them to pay for transactions. The admin wallet is 
automatically funded during deployment from the Hardhat node's built-in accounts.


## 3.3. Institution: Credential Issuance Form

Access: Connect with a MetaMask wallet that has been authorized by the admin. The app calls authorizedInstitutions() 
on the contract with the connected address to confirm access.

Features:

The issuance form allows an authorised institution to record a new academic credential permanently on the blockchain.

How issuance works:

The institution fills in the form and clicks Authorize & Stamp
MetaMask opens and asks the institution to confirm and sign the transaction
On confirmation, issueCredential() is called on the smart contract with the credential UUID, student wallet address, 
and a cryptographic hash of the certificate metadata Once the transaction is confirmed on-chain, the credential metadata 
is saved to the database. A success message displays the credential reference ID

The credential is now permanently recorded on the blockchain. It will appear on the student's dashboard immediately 
and can be verified by anyone using the verification portal.

## 3.4. Institution: Issued Credentials Dashboard

Access: Same as the issuance form, authorized institution wallets only.
The institution dashboard gives institutions a complete view of all credentials they have issued, 
along with management tools.

Features:

**View all issued credentials**
Lists every credential issued by the connected institution wallet, including the student name, certificate name, 
date of issue, credential ID, and current status (Active or Revoked).

**Revoke a credential**
If a credential was issued in error or must be invalidated, the institution can revoke it directly from the dashboard. 
Clicking Revoke opens a prompt asking for a reason, this reason is mandatory and is stored both on-chain and in the database.

How revocation works:

Institution clicks Revoke on a credential and enters a reason
MetaMask opens to confirm the revokeCredential() transaction
On confirmation, the on-chain record is updated permanently, the credential is marked as revoked and the reason is stored immutably
The database status is updated to revoked to keep both systems in sync
The verification portal will now display the credential as REVOKED with the stated reason


Only the institution that originally issued a credential can revoke it. This is enforced at the smart contract 
level, no other wallet, including the admin, can revoke a credential they did not issue.


## 3.5. Student: Personal Credential Dashboard

Access: Any MetaMask wallet that is not the admin and not an authorized institution is treated as a student. 
No registration is required.

Features:

**Automatic account creation**
When a student connects their MetaMask wallet for the first time, a student record is created automatically 
in the database. No form is required, the wallet address is the identity.

**View all credentials**
The dashboard lists all credentials issued to the connected wallet address, showing the certificate name, 
issuing institution, date of issue, credential ID, and live on-chain status.

**Live on-chain status**
For each credential, the dashboard calls verifyCredential() on the blockchain in real-time and displays 
whether the credential is currently Valid or Revoked. This cannot be spoofed, the status comes directly 
from the immutable blockchain record.

**QR code sharing**
Each credential card includes a QR code that encodes a direct link to the public verification page for 
that specific credential. Students can screenshot this or display it to employers, who can scan it to 
instantly verify the credential's authenticity without needing a wallet or account of any kind.


# 4. User Roles and Access Controls

**Admin**
How detected: Connected wallet matches contract.owner()
What can do: Authorize/remove institutions, fund institution wallets

**Institution**
How detected: Connected wallet is in authorizedInstitutions mapping
What can do: Issue credentials, view their issued credentials, revoke their issued credentials

**Student**
How detected: Any other connected wallet
What can do: View their own credentials and QR codes

**Public**
How detected: No wallet required
What can do: Verify any credential by ID

Role detection happens on the client side by calling read-only functions on the smart contract. 
There is no server-side session or JWT. The wallet address is the identity and the smart contract
is the authority.