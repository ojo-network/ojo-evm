// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import '@axelar-network/axelar-gmp-sdk-solidity/contracts/upgradable/InitProxy.sol';

contract OjoProxy is InitProxy {
    function contractId()
        internal
        pure
        override
        returns (bytes32)
    {
        return keccak256('ojo-v1');
    }
}
