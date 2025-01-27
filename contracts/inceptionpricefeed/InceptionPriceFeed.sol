// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";
import "../inception/interfaces/IVault.sol";

/// @title Contract for retreiving a Inception LRT's exchange rate value with chainlink's AggregatorV3Interface
/// implemented.
/// @author Ojo Network (https://docs.ojo.network/)
contract InceptionPriceFeed is Initializable, AggregatorV3Interface {
    uint8 private priceFeedDecimals;

    string private priceFeedBase;

    string private priceFeedQuote;

    address public vault;

    address public inceptionLRT;

    uint80 constant DEFAULT_ROUND = 1;

    uint256 constant DEFAULT_VERSION = 1;

    uint256 internal constant INT256_MAX = uint256(type(int256).max);

    error GetRoundDataCanBeOnlyCalledWithLatestRound(uint80 requestedRoundId);

    /// @notice Initialize clone of this contract.
    /// @dev This function is used in place of a constructor in proxy contracts.
    /// @param _vault Address of Inception vault contract.
    /// @param _inceptionLRT Address of Inception LRT token.
    /// @param _priceFeedDecimals Amount of decimals a PriceFeed is denominiated in.
    /// @param _priceFeedBase Base asset of PriceFeed.
    /// @param _priceFeedQuote Quote asset of PriceFeed.
    function initialize(
        address _vault,
        address _inceptionLRT,
        uint8 _priceFeedDecimals,
        string calldata _priceFeedBase,
        string calldata _priceFeedQuote
        ) external initializer {
        vault = _vault;
        inceptionLRT = _inceptionLRT;
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

    /// @notice Calculates exchange rate from the Inception LRT Vault from a specified round.
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

    /// @notice Calculates exchange rate from the Inception LRT Vault.
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

        IVault vault_ = IVault(vault);
        ERC20 inceptionLRT_ = ERC20(inceptionLRT);

        answer = 0;

        if (inceptionLRT_.totalSupply() != 0) {
            answer = int256(vault_.getTotalDeposited()) * 1e18 / int256(inceptionLRT_.totalSupply());
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
