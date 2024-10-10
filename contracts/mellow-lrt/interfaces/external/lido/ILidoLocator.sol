// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface ILidoLocator {
    function depositSecurityModule() external view returns (address);
}
