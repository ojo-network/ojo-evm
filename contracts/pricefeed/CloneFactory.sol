// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./PriceFeed.sol";
import "@openzeppelin/contracts/proxy/Clones.sol";

/// @title Factory for creating PriceFeed contract clones
/// @notice This contract will create a PriceFeed clone and map its address to clone creator
/// @dev Cloning is done with OpenZeppelin's Clones contract and clones are initialized by an intitializer function instead of a constructor upon creation
contract CloneFactory {
    event PriceFeedCloneCreated(
        address _priceFeedCloneAddress
    );

    mapping (address => address) public PriceFeedCloneAddresses;
    address public implementationAddress;

    /// @param _implementationAddress Address of implementation contract to be cloned
    constructor(address _implementationAddress) {
        implementationAddress = _implementationAddress;
    }

    /// @notice Create clone of PriceFeed contract and initialize it
    /// @dev Clone method returns address of created clone
    /// @param _priceFeedDecimals Amount of decimals a PriceFeed is denominiated in.
    /// @param _priceFeedDescription Description of PriceFeed.
    function createPriceFeed(uint8 _priceFeedDecimals, string calldata _priceFeedDescription) external {
        address priceFeedCloneAddress = Clones.clone(implementationAddress);
        PriceFeed(priceFeedCloneAddress).initialize(_priceFeedDecimals, _priceFeedDescription);
        PriceFeedCloneAddresses[msg.sender] = priceFeedCloneAddress;
        emit PriceFeedCloneCreated(priceFeedCloneAddress);
    }
}
