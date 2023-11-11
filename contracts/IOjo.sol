// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./OjoTypes.sol";

interface IOjo {
    event PriceDataPosted(uint256 indexed timestamp);

    function callContractMethodWithOjoPriceData(
        bytes32[] calldata assetNames,
        address contractAddress,
        bytes4 commandSelector,
        bytes calldata commandParams
    ) external payable;

    function getPriceData(
        bytes32 assetName
    ) external view returns (OjoTypes.PriceData memory);

    function getPriceDataBulk(
        bytes32[] calldata assetNames
    ) external view returns (OjoTypes.PriceData[] memory _priceData);

    function getPrice(
        bytes32 baseAssetName,
        bytes32 quoteAssetName
    ) external view returns (OjoTypes.Price memory);
}
