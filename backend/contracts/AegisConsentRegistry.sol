// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title AegisConsentRegistry
 * @dev Cryptographic Proof of Integrity & Programmable Consent Management for AegisSelf Vault
 * Stores immutable SHA-256 hashes of encrypted health records & governs time-bound access grants.
 */
contract AegisConsentRegistry {
    // Mapping from record owner => record SHA-256 hash => block timestamp
    mapping(address => mapping(bytes32 => uint256)) public recordTimestamps;
    
    // Struct representing time-bound access grants
    struct ConsentGrant {
        uint256 grantId;
        address owner;
        address grantee;
        bytes32 scopeHash;
        uint256 expiresAt;
        bool active;
    }

    uint256 public nextGrantId;
    mapping(uint256 => ConsentGrant) public consentGrants;
    mapping(address => uint256[]) private userGrantIds;

    // Events
    event RecordAnchored(address indexed owner, bytes32 indexed recordHash, uint256 timestamp);
    event AccessGranted(
        uint256 indexed grantId,
        address indexed owner,
        address indexed grantee,
        bytes32 scopeHash,
        uint256 expiresAt
    );
    event AccessRevoked(uint256 indexed grantId, address indexed owner);

    /**
     * @notice Immutable anchoring of canonical record SHA-256 hash
     * @param _recordHash SHA-256 hash of the canonical unencrypted health record
     */
    function anchorRecordHash(bytes32 _recordHash) external {
        require(_recordHash != bytes32(0), "Invalid record hash");
        require(recordTimestamps[msg.sender][_recordHash] == 0, "Record already anchored");

        recordTimestamps[msg.sender][_recordHash] = block.timestamp;
        emit RecordAnchored(msg.sender, _recordHash, block.timestamp);
    }

    /**
     * @notice Issue time-bound, scoped access grant to a designated clinician or verifier address
     * @param _grantee Ethereum address of authorized doctor/verifier
     * @param _scopeHash Hash identifier of authorized data scope (e.g. keccak256("LAB_PANELS_ONLY"))
     * @param _durationSeconds Validity period in seconds
     */
    function grantAccess(
        address _grantee,
        bytes32 _scopeHash,
        uint256 _durationSeconds
    ) external returns (uint256 grantId) {
        require(_grantee != address(0), "Invalid grantee address");
        require(_durationSeconds > 0, "Duration must be positive");

        grantId = nextGrantId++;
        uint256 expiry = block.timestamp + _durationSeconds;

        consentGrants[grantId] = ConsentGrant({
            grantId: grantId,
            owner: msg.sender,
            grantee: _grantee,
            scopeHash: _scopeHash,
            expiresAt: expiry,
            active: true
        });

        userGrantIds[msg.sender].push(grantId);
        emit AccessGranted(grantId, msg.sender, _grantee, _scopeHash, expiry);
        return grantId;
    }

    /**
     * @notice Instant revocation of an existing access grant
     * @param _grantId Identifier of grant to revoke
     */
    function revokeAccess(uint256 _grantId) external {
        ConsentGrant storage grant = consentGrants[_grantId];
        require(grant.owner == msg.sender, "Caller is not grant owner");
        require(grant.active, "Grant already inactive");

        grant.active = false;
        emit AccessRevoked(_grantId, msg.sender);
    }

    /**
     * @notice Verifies if access is currently valid and unexpired
     * @param _owner Address of record owner
     * @param _grantee Address seeking access
     * @param _scopeHash Requested data scope
     */
    function verifyAccess(
        address _owner,
        address _grantee,
        bytes32 _scopeHash
    ) external view returns (bool) {
        uint256[] memory grants = userGrantIds[_owner];
        for (uint256 i = 0; i < grants.length; i++) {
            ConsentGrant memory g = consentGrants[grants[i]];
            if (
                g.active &&
                g.grantee == _grantee &&
                g.scopeHash == _scopeHash &&
                block.timestamp <= g.expiresAt
            ) {
                return true;
            }
        }
        return false;
    }

    /**
     * @notice Helper to check record anchoring timestamp
     */
    function getRecordTimestamp(address _owner, bytes32 _recordHash) external view returns (uint256) {
        return recordTimestamps[_owner][_recordHash];
    }
}
