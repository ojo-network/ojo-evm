// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";
import "../IOjo.sol";

contract PriceFeed is Initializable, AggregatorV3Interface {
    uint8 public priceFeedDecimals;

    string public priceFeedDescription;

    IOjo public immutable ojo;

    constructor(address ojo_) {
        ojo = IOjo(ojo_);
    }

    /// @notice Initialize clone of this contract
    /// @dev This function is used in place of a constructor in proxy contracts
    /// @param _priceFeedDecimals Amount of decimals a PriceFeed is denominiated in.
    /// @param _priceFeedDescription Description of PriceFeed.
    function initialize(uint8 _priceFeedDecimals, string calldata _priceFeedDescription)
        external
        initializer {
        priceFeedDecimals = _priceFeedDecimals;
        priceFeedDescription = _priceFeedDescription;
    }

    function decimals() external view returns (uint8) {
        return priceFeedDecimals;
    }

    function description() external view returns (string memory) {
        return priceFeedDescription;
    }

    function version() external view returns (uint256) {
        return 1;
    }

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

    }

    function latestRoundData()
        external
        view
        returns (
        uint80 roundId,
        int256 answer,
        uint256 startedAt,
        uint256 updatedAt,
        uint80 answeredInRound
        ) {

    }
}
