// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

library OjoTypes {
    bytes32 constant USD = bytes32("USD");
    uint256 constant USD_PRICE= 10**9;

    string constant OjoChain = "";
    string constant OjoAddress = "";

    struct PriceData {
        bytes32    assetName;
        uint256    price;
        uint256    resolveTime;
        MedianData medianData;
    }

    struct MedianData {
        uint256[] blockNums;
        uint256[] medians;
        uint256[] deviations;
    }

    struct Price {
        uint256 price;
        uint256 baseResolveTime;
        uint256 quoteResolveTime;
    }
}
