// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./MellowPriceFeed.sol";
import "@openzeppelin/contracts/proxy/Clones.sol";

/// @title Factory for creating MellowPriceFeed contract clones.
/// @notice This contract will create a MellowPriceFeed clone and map its address to the clone creator.
/// @dev Cloning is done with OpenZeppelin's Clones contract.
contract CloneFactory {
    event MellowPriceFeedCloneCreated(
        address _mellowPriceFeedCloneAddress
    );

    mapping (address => address) public MellowPriceFeedCloneAddresses;
    address public implementationAddress;

    /// @param _implementationAddress Address of implementation contract to be cloned.
    constructor(address _implementationAddress) {
        implementationAddress = _implementationAddress;
    }

    /// @notice Create clone of MellowPriceFeed contract and initialize it.
    /// @dev Clone method returns address of created clone.
    /// @param _vault Address of Mellow LRT vault.
    /// @param _quoteAsset Address of quote asset.
    /// @param _priceFeedDecimals Amount of decimals a PriceFeed is denominiated in.
    /// @param _priceFeedBase Base asset of PriceFeed, should be set to asset symbol ticker.
    /// @param _priceFeedQuote Quote asset of PriceFeed, should be set to asset symbol ticker.
    function createMellowPriceFeed(
        address _vault,
        address _quoteAsset,
        uint8 _priceFeedDecimals,
        string calldata _priceFeedBase,
        string calldata _priceFeedQuote
        ) external {
        address mellowPriceFeedCloneAddress = Clones.clone(implementationAddress);
        MellowPriceFeed(mellowPriceFeedCloneAddress).initialize(
            _vault,
            _quoteAsset,
            _priceFeedDecimals,
            _priceFeedBase,
            _priceFeedQuote
        );
        MellowPriceFeedCloneAddresses[msg.sender] = mellowPriceFeedCloneAddress;
        emit MellowPriceFeedCloneCreated(mellowPriceFeedCloneAddress);
    }
}
