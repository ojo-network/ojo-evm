// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./OjoTypes.sol";

/// @title Call a contract method using price data relayed from the Ojo Network.
/// @author Ojo Network (https://docs.ojo.network/)
/// @notice Prices are relayed from the Ojo Network to the Ojo contract using Axelar's General Message Passing.
/// @dev See ./MockOjoContract.sol for an example of implenting this interface to call a contract method using price data fetched from an Ojo contract.
interface IOjo {
    /// @dev Emmited when new prices are posted to the Ojo Contract (can only be triggered by Axelar's General Message Passer).
    /// @param timestamp Time of price data being posted.
    event PriceDataPosted(uint256 indexed timestamp);


    /// @notice Triggers the relaying of price data from the Ojo Network to the Ojo contract and uses said price data when calling the specified
    /// contract method at the specified contract address.
    /// @dev Reverts if contract method call does not succeed.
    /// @param assetNames List of assets to be relayed from the Ojo Network and used by the contract method.
    /// @param contractAddress Address of contract containing the contract method to be called.
    /// @param commandSelector First four bytes of the Keccak-256 hash of the contract method to be called.
    /// @param commandParams Abi encoded parameters to be used when calling the contract method (excluding assetNames parameter).
    function callContractMethodWithOjoPriceData(
        bytes32[] calldata assetNames,
        address contractAddress,
        bytes4 commandSelector,
        bytes calldata commandParams
    ) external payable;

    /// @notice Returns the price data of a specified asset.
    /// @dev Price data is stored in a mapping, so requesting the price data of a non existent asset will return the zero byte representation
    /// of OjoTypes.PriceData.
    /// @return _priceData See ./OjoTypes.sol for a description of the PriceData object.
    function getPriceData(
        bytes32 assetName
    ) external view returns (OjoTypes.PriceData memory _priceData);

    /// @notice Returns a list of price data of specified assets.
    /// @dev Price data is stored in a mapping, so requesting the price data of non existent asset will return the zero byte representation
    /// of OjoTypes.PriceData.
    /// @return _priceData See ./OjoTypes.sol for a description of the PriceData object.
    function getPriceDataBulk(
        bytes32[] calldata assetNames
    ) external view returns (OjoTypes.PriceData[] memory _priceData);

    /// @notice Returns the price of a specified base and quote asset pair.
    /// @dev Reverts if quoteAssetName is not an existent asset pair to avoid a divide by 0 error.
    /// @dev USD is used with a price of 1 when calculating price of an asset pair with USD.
    /// @return _priceData OjoTypes.Price See ./OjoTypes.sol for a description of the Price object.
    function getPrice(
        bytes32 baseAssetName,
        bytes32 quoteAssetName
    ) external view returns (OjoTypes.Price memory _priceData);
}
