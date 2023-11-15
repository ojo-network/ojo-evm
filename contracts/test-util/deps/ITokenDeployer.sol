// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface ITokenDeployer {
    function deployToken(
        string calldata name,
        string calldata symbol,
        uint8 decimals,
        uint256 cap,
        bytes32 salt
    ) external returns (address tokenAddress);
}
