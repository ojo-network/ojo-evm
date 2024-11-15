// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";

/// @title Contract for retreiving a lvlUSD's exchange rate value with chainlink's AggregatorV3Interface
/// implemented.
/// @author Ojo Network (https://docs.ojo.network/)
contract levelPriceFeed is Initializable, AggregatorV3Interface {
    uint8 private priceFeedDecimals;

    string private priceFeedBase;

    string private priceFeedQuote;

    address public collateralAssetOracle;

    uint80 constant DEFAULT_ROUND = 1;

    uint256 constant DEFAULT_VERSION = 1;

    uint256 internal constant INT256_MAX = uint256(type(int256).max);

    error GetRoundDataCanBeOnlyCalledWithLatestRound(uint80 requestedRoundId);

    /// @notice Initialize clone of this contract.
    /// @dev This function is used in place of a constructor in proxy contracts.
    /// @param _collateralAssetOracle Address of collateral asset's oracle contract.
    /// @param _priceFeedBase Base asset of PriceFeed.
    /// @param _priceFeedQuote Quote asset of PriceFeed.
    function initialize(
        address _collateralAssetOracle,
        string calldata _priceFeedBase,
        string calldata _priceFeedQuote
        ) external initializer {
        collateralAssetOracle = _collateralAssetOracle;
        priceFeedBase = _priceFeedBase;
        priceFeedQuote = _priceFeedQuote;

        AggregatorV3Interface collateralAssetOracle_ = AggregatorV3Interface(collateralAssetOracle);
        priceFeedDecimals = collateralAssetOracle_.decimals();
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

    /// @notice Calculates exchange rate from the levelViewer contract from a specified round.
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

    /// @notice Calculates exchange rate from the levelViewer contract.
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

        AggregatorV3Interface collateralAssetOracle_ = AggregatorV3Interface(collateralAssetOracle);
        (, int256 collateralAssetAnswer, , uint256 collateralAssetUpdatedAt, ) = collateralAssetOracle_
            .latestRoundData();
        uint8 collateralDecimals = collateralAssetOracle_.decimals();
        answer = (collateralAssetAnswer < int256(10**collateralDecimals)) ?
            collateralAssetAnswer : int256(10**collateralDecimals);

        // These values are equal after chainlink’s OCR update
        startedAt = collateralAssetUpdatedAt;
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