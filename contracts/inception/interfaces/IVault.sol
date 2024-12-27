// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IVault {
    /// @dev returns the total deposited into asset strategy
    function getTotalDeposited() external view returns (uint256);
}
