// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title NaviDropRegistry
 * @author Ersin Sandal (SliferSoft)
 * @notice Append-only registry mapping geohash → IPFS metadata CIDs for NaviSecret.
 *         Enables DB-independent discovery and recovery of NaviDrops.
 *         No owner, no access control, no upgradability — pure public good.
 */
contract NaviDropRegistry {
    /// @notice Emitted when a new NaviDrop metadata CID is registered
    event DropRegistered(
        bytes7 indexed geohash,
        string metadataCid,
        address indexed sender,
        uint256 timestamp
    );

    /// @dev geohash (7 bytes, precision-7) → array of IPFS metadata CIDs
    mapping(bytes7 => string[]) private _cidsByGeohash;

    /// @dev Deduplication guard: keccak256(geohash, metadataCid) → registered
    mapping(bytes32 => bool) private _registered;

    /// @notice Register a NaviDrop's metadata CID under a geohash
    /// @param geohash 7-byte geohash (precision 7)
    /// @param metadataCid IPFS CID of the DropMetadataDocument
    function registerDrop(bytes7 geohash, string calldata metadataCid) external {
        bytes32 key = keccak256(abi.encodePacked(geohash, metadataCid));
        require(!_registered[key], "Already registered");

        _registered[key] = true;
        _cidsByGeohash[geohash].push(metadataCid);

        emit DropRegistered(geohash, metadataCid, msg.sender, block.timestamp);
    }

    /// @notice Get all metadata CIDs for a geohash (free read, no gas)
    /// @param geohash 7-byte geohash (precision 7)
    /// @return cids Array of IPFS metadata CID strings
    function getDropCids(bytes7 geohash) external view returns (string[] memory cids) {
        return _cidsByGeohash[geohash];
    }

    /// @notice Check if a specific CID is already registered under a geohash
    function isRegistered(bytes7 geohash, string calldata metadataCid) external view returns (bool) {
        return _registered[keccak256(abi.encodePacked(geohash, metadataCid))];
    }

    /// @notice Batch query metadata CIDs for multiple geohashes (e.g. bounding box / neighbors)
    function getDropCidsBatch(bytes7[] calldata geohashes) external view returns (string[][] memory results) {
        results = new string[][](geohashes.length);
        for (uint256 i = 0; i < geohashes.length; i++) {
            results[i] = _cidsByGeohash[geohashes[i]];
        }
    }
}
