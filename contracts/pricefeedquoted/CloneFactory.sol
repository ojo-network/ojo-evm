// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./PriceFeedQuoted.sol";
import "@openzeppelin/contracts/proxy/Clones.sol";

/// @title Factory for creating PriceFeedQuoted contract clones.
/// @notice This contract will create a PriceFeedQuoted clone and map its address to the clone creator.
/// @dev Cloning is done with OpenZeppelin's Clones contract.
contract CloneFactory {
    event PriceFeedQuotedCloneCreated(
        address _priceFeedCloneAddress
    );

    mapping (address => address) public PriceFeedQuotedCloneAddresses;
    address public implementationAddress;

    /// @param _implementationAddress Address of implementation contract to be cloned.
    constructor(address _implementationAddress) {
        implementationAddress = _implementationAddress;
    }

    /// @notice Create clone of PriceFeedQuoted contract and initialize it.
    /// @dev Clone method returns address of created clone.
    /// @param _priceFeedDecimals Amount of decimals a PriceFeed is denominiated in.
    /// @param _priceFeedBase Base asset of PriceFeed, should be set to asset symbol ticker.
    /// @param _priceFeedQuote Quote asset of PriceFeed, should be set to asset symbol ticker.
    function createPriceFeedQuoted(uint8 _priceFeedDecimals, string calldata _priceFeedBase, string calldata _priceFeedQuote) external {
        address priceFeedCloneAddress = Clones.clone(implementationAddress);
        PriceFeedQuoted(priceFeedCloneAddress).initialize(_priceFeedDecimals, _priceFeedBase, _priceFeedQuote);
        PriceFeedQuotedCloneAddresses[msg.sender] = priceFeedCloneAddress;
        emit PriceFeedQuotedCloneCreated(priceFeedCloneAddress);
    }
}
