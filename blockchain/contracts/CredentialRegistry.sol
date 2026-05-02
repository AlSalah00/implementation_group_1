// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title CredentialRegistry
 * @notice Issues, verifies, and revokes academic credentials on-chain.
 * @dev Only authorized institutions (authorized by the admin) can
 *      issue or revoke credentials. Anyone can verify them.
 */
contract CredentialRegistry {


    // Data structures


    struct Credential {
        string  credentialId;     // Unique identifier
        address issuer;           // Institution wallet that issued this credential
        address student;          // Student wallet that received it
        uint256 issuedAt;         // Block timestamp at time of issuance
        bytes32 dataHash;         // keccak256 hash of off-chain certificate metadata
        bool    isRevoked;        // True if the issuer has revoked it
        string  revocationReason; // Human-readable reason for revocation (empty if active)
        bool    exists;           // Used to distinguish a stored entry from an empty one
    }


    // State variables


    /// @notice Address that deployed the contract. Can add/remove institutions.
    address public owner;

    /// @dev credentialId => Credential
    mapping(string => Credential) private credentials;

    /// @notice Whether a wallet address is an authorised institution.
    mapping(address => bool) public authorizedInstitutions;

    /// @dev student address => list of credential IDs they own
    mapping(address => string[]) private studentCredentials;


    // Events


    event CredentialIssued(
        string  indexed credentialId,
        address indexed issuer,
        address indexed student,
        uint256         issuedAt,
        bytes32         dataHash
    );

    event CredentialRevoked(
        string  indexed credentialId,
        address indexed issuer,
        uint256         revokedAt,
        string          reason
    );

    event InstitutionAdded(address indexed institution);
    event InstitutionRemoved(address indexed institution);


    // Modifiers


    modifier onlyOwner() {
        require(
            msg.sender == owner,
            "CredentialRegistry: caller is not the owner"
        );
        _;
    }

    modifier onlyAuthorized() {
        require(
            authorizedInstitutions[msg.sender],
            "CredentialRegistry: caller is not an authorized institution"
        );
        _;
    }


    // Constructor


    constructor() {
        owner = msg.sender;
    }


    // Owner-only: institution management


    /**
     * @notice Adds an institution wallet to the authorised list.
     * @param institution The wallet address of the institution.
     */
    function addInstitution(address institution) external onlyOwner {
        require(
            institution != address(0),
            "CredentialRegistry: invalid address"
        );
        authorizedInstitutions[institution] = true;
        emit InstitutionAdded(institution);
    }

    /**
     * @notice Removes an institution from the authorised list.
     * @param institution The wallet address to remove.
     */
    function removeInstitution(address institution) external onlyOwner {
        require(
            authorizedInstitutions[institution],
            "CredentialRegistry: address is not an institution"
        );
        authorizedInstitutions[institution] = false;
        emit InstitutionRemoved(institution);
    }


    // Core write functions (authorized institutions only)


    /**
     * @notice Issues a new credential to a student.
     * @param credentialId A unique string identifier for this credential.
     * @param student      The wallet address of the student receiving it.
     * @param dataHash     keccak256 hash of the certificate's off-chain metadata.
     *                     Compute as: keccak256(abi.encodePacked(certificateName, issuedDate, studentAddress))
     *                     Anyone can recompute this hash to verify the data has not been tampered with.
     */
    function issueCredential(
        string calldata credentialId,
        address student,
        bytes32 dataHash
    ) external onlyAuthorized {
        require(
            bytes(credentialId).length > 0,
            "CredentialRegistry: credential ID cannot be empty"
        );
        require(
            student != address(0),
            "CredentialRegistry: invalid student address"
        );
        require(
            dataHash != bytes32(0),
            "CredentialRegistry: data hash cannot be empty"
        );
        require(
            !credentials[credentialId].exists,
            "CredentialRegistry: credential ID already exists"
        );

        credentials[credentialId] = Credential({
            credentialId     : credentialId,
            issuer           : msg.sender,
            student          : student,
            issuedAt         : block.timestamp,
            dataHash         : dataHash,
            isRevoked        : false,
            revocationReason : "",
            exists           : true
        });

        studentCredentials[student].push(credentialId);

        emit CredentialIssued(credentialId, msg.sender, student, block.timestamp, dataHash);
    }

    /**
     * @notice Revokes a credential. Only the original issuer can do this.
     * @param credentialId The ID of the credential to revoke.
     * @param reason       A human-readable explanation for the revocation
     */
    function revokeCredential(
        string calldata credentialId,
        string calldata reason
    ) external onlyAuthorized {
        require(
            bytes(reason).length > 0,
            "CredentialRegistry: revocation reason cannot be empty"
        );

        Credential storage cred = credentials[credentialId];

        require(cred.exists,     "CredentialRegistry: credential does not exist");
        require(!cred.isRevoked, "CredentialRegistry: credential is already revoked");
        require(
            cred.issuer == msg.sender,
            "CredentialRegistry: only the original issuer can revoke"
        );

        cred.isRevoked        = true;
        cred.revocationReason = reason;

        emit CredentialRevoked(credentialId, msg.sender, block.timestamp, reason);
    }


    // Public read functions (anyone can call these)


    /**
     * @notice Checks whether a credential is valid (exists and is not revoked).
     * @param credentialId The ID to check.
     * @return isValid  True if the credential exists and has not been revoked.
     * @return issuer   The institution that issued it.
     * @return student  The student it was issued to.
     * @return issuedAt The timestamp when it was issued.
     */
    function verifyCredential(string calldata credentialId)
        external
        view
        returns (
            bool    isValid,
            address issuer,
            address student,
            uint256 issuedAt
        )
    {
        Credential storage cred = credentials[credentialId];
        require(cred.exists, "CredentialRegistry: credential does not exist");

        return (
            !cred.isRevoked,
            cred.issuer,
            cred.student,
            cred.issuedAt
        );
    }

    /**
     * @notice Returns the full details of a credential.
     * @param credentialId The ID to look up.
     * @return credentialId_     The credential's own ID string.
     * @return issuer            The institution wallet that issued it.
     * @return student           The student wallet that received it.
     * @return issuedAt          Unix timestamp of issuance.
     * @return dataHash          keccak256 hash of the original certificate metadata.
     * @return isRevoked         Whether it has been revoked.
     * @return revocationReason  Why it was revoked (empty string if still active).
     */
    function getCredential(string calldata credentialId)
        external
        view
        returns (
            string  memory credentialId_,
            address        issuer,
            address        student,
            uint256        issuedAt,
            bytes32        dataHash,
            bool           isRevoked,
            string  memory revocationReason
        )
    {
        Credential storage cred = credentials[credentialId];
        require(cred.exists, "CredentialRegistry: credential does not exist");

        return (
            cred.credentialId,
            cred.issuer,
            cred.student,
            cred.issuedAt,
            cred.dataHash,
            cred.isRevoked,
            cred.revocationReason
        );
    }

    /**
     * @notice Returns all credential IDs ever issued to a student wallet.
     * @param student The student wallet address to query.
     * @return An array of credential ID strings.
     */
    function getStudentCredentials(address student)
        external
        view
        returns (string[] memory)
    {
        return studentCredentials[student];
    }
}