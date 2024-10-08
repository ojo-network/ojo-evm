// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";
import "../IOjo.sol";
import "../OjoTypes.sol";

/// @title Contract for calling Ojo's oracle contract with chainlink's AggregatorV3Interface implemented.
/// @author Ojo Network (https://docs.ojo.network/)
contract PriceFeedQuoted is Initializable, AggregatorV3Interface {
    uint8 private priceFeedDecimals;

    string private priceFeedBase;

    string private priceFeedQuote;

    IOjo public immutable ojo;

    uint80 constant DEFAULT_ROUND = 1;

    uint256 constant DEFAULT_VERSION = 1;

    uint256 internal constant INT256_MAX = uint256(type(int256).max);

    error GetRoundDataCanBeOnlyCalledWithLatestRound(uint80 requestedRoundId);

    error UnsafeUintToIntConversion(uint256 value);

    constructor(address ojo_) {
        ojo = IOjo(ojo_);
    }

    /// @notice Initialize clone of this contract.
    /// @dev This function is used in place of a constructor in proxy contracts.
    /// @param _priceFeedDecimals Amount of decimals a PriceFeed is denominiated in.
    /// @param _priceFeedBase Base asset of PriceFeed.
    /// @param _priceFeedQuote Quote asset of PriceFeed.
    function initialize(uint8 _priceFeedDecimals, string calldata _priceFeedBase, string calldata _priceFeedQuote)
        external
        initializer {
        priceFeedDecimals = _priceFeedDecimals;
        priceFeedBase = _priceFeedBase;
        priceFeedQuote = _priceFeedQuote;
    }

    /// @notice Amount of decimals price is denominated in.
    function decimals() external view returns (uint8) {
        return priceFeedDecimals;
    }

    /// @notice Asset pair that this proxy is tracking.
    function description() external view returns (string memory) {
        return string(abi.encodePacked(priceFeedBase, "/", priceFeedQuote));
    }

    /// @notice Version always returns 1.
    function version() external view returns (uint256) {
        return DEFAULT_VERSION;
    }

    /// @dev Latest round always returns 1 since this contract does not support rounds.
    function latestRound() public pure returns (uint80) {
        return DEFAULT_ROUND;
    }

    /// @notice Fetches price data from Ojo contract from a specified round.
    /// @dev Even though rounds are not utilized in this contract getRoundData is implemented for contracts
    /// that still rely on it. Function will revert if specified round is not the latest round.
    /// @return roundId Round ID of price data, this is always set to 1.
    /// @return answer Price in USD of asset this contract is tracking.
    /// @return startedAt Timestamp relating to price update.
    /// @return updatedAt Timestamp relating to price update.
    /// @return answeredInRound Equal to round ID.
    function getRoundData(uint80 _roundId)
        external
        view
        returns (
        uint80 roundId,
        int256 answer,
        uint256 startedAt,
        uint256 updatedAt,
        uint80 answeredInRound
        ) {
        if (_roundId != latestRound()) {
            revert GetRoundDataCanBeOnlyCalledWithLatestRound(_roundId);
        }
        return latestRoundData();
    }

    /// @notice Fetches latest price data from Ojo contract.
    /// @return roundId Round ID of price data, this is always set to 1.
    /// @return answer Price of priceFeedBase quoted by priceFeedQuote.
    /// @return startedAt Timestamp relating to price update.
    /// @return updatedAt Timestamp relating to price update.
    /// @return answeredInRound Equal to round ID.
    function latestRoundData()
        public
        view
        returns (
        uint80 roundId,
        int256 answer,
        uint256 startedAt,
        uint256 updatedAt,
        uint80 answeredInRound
        ) {
        roundId = latestRound();
        bytes32 baseAssetName = bytes32(bytes(priceFeedBase));
        bytes32 quoteAssetName = bytes32(bytes(priceFeedQuote));

        OjoTypes.PriceData memory basePriceData = ojo.getPriceData(baseAssetName);
        OjoTypes.PriceData memory quotePriceData = ojo.getPriceData(quoteAssetName);

        if (basePriceData.price > INT256_MAX || quotePriceData.price > INT256_MAX) {
            uint256 unsafeValue = basePriceData.price > INT256_MAX
                ? basePriceData.price
                : quotePriceData.price;
            revert UnsafeUintToIntConversion(unsafeValue);
        }

        answer = 0;
        if (quotePriceData.price != 0) {
            answer = int256(basePriceData.price) * 1e18 / int256(quotePriceData.price);
        }

        // These values are equal after chainlink’s OCR update
        startedAt = basePriceData.resolveTime < quotePriceData.resolveTime
            ? basePriceData.resolveTime
            : quotePriceData.resolveTime;
        updatedAt = startedAt;

        // roundId is always equal to answeredInRound
        answeredInRound = roundId;

        return (
            roundId,
            answer,
            startedAt,
            updatedAt,
            answeredInRound
        );
    }
}
