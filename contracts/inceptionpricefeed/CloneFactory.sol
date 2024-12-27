// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./InceptionPriceFeed.sol";
import "@openzeppelin/contracts/proxy/Clones.sol";

/// @title Factory for creating InceptionPriceFeed contract clones.
/// @notice This contract will create a InceptionPriceFeed clone and map its address to the clone creator.
/// @dev Cloning is done with OpenZeppelin's Clones contract.
contract CloneFactory {
    event InceptionPriceFeedCloneCreated(
        address _inceptionPriceFeedCloneAddress
    );

    mapping (address => address) public InceptionPriceFeedCloneAddresses;
    address public implementationAddress;

    /// @param _implementationAddress Address of implementation contract to be cloned.
    constructor(address _implementationAddress) {
        implementationAddress = _implementationAddress;
    }

    /// @notice Create clone of InceptionPriceFeed contract and initialize it.
    /// @dev Clone method returns address of created clone.
     /// @param _vault Address of Inception vault contract.
    /// @param _inceptionLRT Address of Inception LRT token.
    /// @param _priceFeedDecimals Amount of decimals a PriceFeed is denominiated in.
    /// @param _priceFeedBase Base asset of PriceFeed, should be set to asset symbol ticker.
    /// @param _priceFeedQuote Quote asset of PriceFeed, should be set to asset symbol ticker.
    function createInceptionPriceFeed(
        address _vault,
        address _inceptionLRT,
        uint8 _priceFeedDecimals,
        string calldata _priceFeedBase,
        string calldata _priceFeedQuote
        ) external {
        address inceptionPriceFeedCloneAddress = Clones.clone(implementationAddress);
        InceptionPriceFeed(inceptionPriceFeedCloneAddress).initialize(
            _vault,
            _inceptionLRT,
            _priceFeedDecimals,
            _priceFeedBase,
            _priceFeedQuote
        );
        InceptionPriceFeedCloneAddresses[msg.sender] = inceptionPriceFeedCloneAddress;
        emit InceptionPriceFeedCloneCreated(inceptionPriceFeedCloneAddress);
    }
}
