// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title INaviDropRegistry
 * @author Ersin Sandal (SliferSoft)
 * @notice On-chain registry interface for NaviDrop Protocol (NaviSecret).
 *         Ensures interoperability across decentralized storage networks.
 */
interface INaviDropRegistry {
    /// @notice Emitted when a new NaviDrop metadata CID is registered
    /// @param geohash 7-byte geohash (precision 7)
    /// @param metadataCid CID of DropMetadataDocument on IPFS
    /// @param sender Address of the registrant
    /// @param timestamp Block timestamp at time of registration
    event DropRegistered(
        bytes7 indexed geohash,
        string metadataCid,
        address indexed sender,
        uint256 timestamp
    );

    /// @notice Register metadata CID to a geohash
    /// @dev Append-only. Duplicate registration of identical pair reverts.
    /// @param geohash 7-byte geohash (precision 7)
    /// @param metadataCid CID of DropMetadataDocument on IPFS
    function registerDrop(bytes7 geohash, string calldata metadataCid) external;

    /// @notice Retrieve all metadata CIDs registered to a geohash
    /// @param geohash 7-byte geohash (precision 7)
    /// @return cids Array of metadata CIDs
    function getDropCids(bytes7 geohash) external view returns (string[] memory cids);

    /// @notice Retrieve total drop count registered to a geohash
    /// @param geohash 7-byte geohash (precision 7)
    /// @return count Total registrations
    function getDropCount(bytes7 geohash) external view returns (uint256 count);

    /// @notice Retrieve metadata CIDs with pagination
    /// @param geohash 7-byte geohash (precision 7)
    /// @param offset Starting index
    /// @param limit Maximum results to retrieve
    /// @return cids Array of metadata CIDs
    function getDropCidsPaginated(
        bytes7 geohash,
        uint256 offset,
        uint256 limit
    ) external view returns (string[] memory cids);
}
