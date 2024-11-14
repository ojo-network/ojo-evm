pragma solidity ^0.8.20;

import "./levelPriceFeed.sol";
import "@openzeppelin/contracts/proxy/Clones.sol";

/// @title Factory for creating levelPriceFeed contract clones.
/// @notice This contract will create a levelPriceFeed clone and map its address to the clone creator.
/// @dev Cloning is done with OpenZeppelin's Clones contract.
contract CloneFactory {
    event levelPriceFeedCloneCreated(
        address _levelPriceFeedCloneAddress
    );

    mapping (address => address) public levelPriceFeedCloneAddresses;
    address public implementationAddress;

    /// @param _implementationAddress Address of implementation contract to be cloned.
    constructor(address _implementationAddress) {
        implementationAddress = _implementationAddress;
    }

    /// @notice Create clone of levelPriceFeed contract and initialize it.
    /// @dev Clone method returns address of created clone.
    /// @param _collateralAssetOracle Address of collateral asset's oracle contract.
    /// @param _priceFeedBase Base asset of PriceFeed, should be set to asset symbol ticker.
    /// @param _priceFeedQuote Quote asset of PriceFeed, should be set to asset symbol ticker.
    function createLevelPriceFeed(
        address _collateralAssetOracle,
        string calldata _priceFeedBase,
        string calldata _priceFeedQuote
        ) external {
        address levelPriceFeedCloneAddress = Clones.clone(implementationAddress);
        levelPriceFeed(levelPriceFeedCloneAddress).initialize(
            _collateralAssetOracle,
            _priceFeedBase,
            _priceFeedQuote
        );
        levelPriceFeedCloneAddresses[msg.sender] = levelPriceFeedCloneAddress;
        emit levelPriceFeedCloneCreated(levelPriceFeedCloneAddress);
    }
}
