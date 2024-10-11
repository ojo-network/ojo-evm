// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";
import "../mellow-lrt/interfaces/oracles/IManagedRatiosOracle.sol";

/// @title Contract for retreiving a Mellow LRT Vault's exchange rate value with chainlink's AggregatorV3Interface
/// implemented.
/// @author Ojo Network (https://docs.ojo.network/)
contract MellowPriceFeed is Initializable, AggregatorV3Interface {
    uint8 private priceFeedDecimals;

    string private priceFeedBase;

    string private priceFeedQuote;

    IManagedRatiosOracle public managedRatiosOracle;

    address public vault;

    uint80 constant DEFAULT_ROUND = 1;

    uint256 constant DEFAULT_VERSION = 1;

    uint256 internal constant INT256_MAX = uint256(type(int256).max);

    error GetRoundDataCanBeOnlyCalledWithLatestRound(uint80 requestedRoundId);

    constructor(address managedRatiosOracle_) {
        managedRatiosOracle = IManagedRatiosOracle(managedRatiosOracle_);
    }

    /// @notice Initialize clone of this contract.
    /// @dev This function is used in place of a constructor in proxy contracts.
    /// @param _vault Address of Mellow LRT vault.
    /// @param _priceFeedDecimals Amount of decimals a PriceFeed is denominiated in.
    /// @param _priceFeedBase Base asset of PriceFeed.
    /// @param _priceFeedQuote Quote asset of PriceFeed.
    function initialize(
        address _vault,
        uint8 _priceFeedDecimals,
        string calldata _priceFeedBase,
        string calldata _priceFeedQuote
        ) external initializer {
        vault = _vault;
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

    /// @notice Calculates exchange rate from the Mellow LRT Vault from a specified round.
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

    /// @notice Calculates exchange rate from the Mellow LRT Vault.
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

        uint128[] memory ratiosX96 = managedRatiosOracle.getTargetRatiosX96(vault, true);

        answer = 0;
        if (ratiosX96.length != 0) {
            answer = int256(uint256(ratiosX96[0])) * 1e18 / int256(managedRatiosOracle.Q96());
        }

        // These values are equal after chainlink’s OCR update
        startedAt = block.timestamp;
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
