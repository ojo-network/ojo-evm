// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

library OjoTypes {
    bytes32 constant USD = bytes32("USD");
    uint256 constant USD_PRICE= 10**9;

    bytes4 constant EMPTY_COMMAND_SELECTOR = bytes4(keccak256(bytes("")));

    struct PriceData {
        // Name of asset ex: ATOM
        bytes32 assetName;
        // Price in of asset in USD
        uint256 price;
        // Latest time price data can be posted before being regarded as stale
        uint256 resolveTime;
        // Median data of asset
        MedianData medianData;
    }

    struct MedianData {
        // Ojo block numbers medians were stamped on
        uint256[] blockNums;
        // Median prices
        uint256[] medians;
        // Standard deviatoins of median prices
        uint256[] deviations;
    }

    struct Price {
        // Price of asset pair
        uint256 price;
        // Base asset of asset pair
        uint256 baseResolveTime;
        // Quote asset of asset pair
        uint256 quoteResolveTime;
    }
}
