// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract SecureDocRegistry {
    struct DocumentRecord {
        bytes32 fileHash;
        address registeredBy;
        uint256 registeredAt;
        bool exists;
    }

    mapping(uint256 => DocumentRecord) private documents;

    event DocumentRegistered(
        uint256 indexed documentId,
        bytes32 fileHash,
        address indexed registeredBy,
        uint256 registeredAt
    );

    function registerDocument(uint256 documentId, bytes32 fileHash) external {
        require(!documents[documentId].exists, "Document already registered");
        require(fileHash != bytes32(0), "File hash cannot be zero");
        
        documents[documentId] = DocumentRecord({
            fileHash: fileHash,
            registeredBy: msg.sender,
            registeredAt: block.timestamp,
            exists: true
        });
        
        emit DocumentRegistered(documentId, fileHash, msg.sender, block.timestamp);
    }

    function verifyDocument(uint256 documentId, bytes32 fileHash) external view returns (bool) {
        return documents[documentId].exists && documents[documentId].fileHash == fileHash;
    }

    function getDocumentHash(uint256 documentId) external view returns (bytes32) {
        require(documents[documentId].exists, "Document not registered");
        return documents[documentId].fileHash;
    }

    function getDocument(uint256 documentId) external view returns (
        bytes32 fileHash,
        address registeredBy,
        uint256 registeredAt,
        bool exists
    ) {
        DocumentRecord storage doc = documents[documentId];
        return (doc.fileHash, doc.registeredBy, doc.registeredAt, doc.exists);
    }
}
