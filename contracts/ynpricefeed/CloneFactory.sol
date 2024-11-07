pragma solidity ^0.8.20;

import "./ynPriceFeed.sol";
import "@openzeppelin/contracts/proxy/Clones.sol";

/// @title Factory for creating ynPriceFeed contract clones.
/// @notice This contract will create a ynPriceFeed clone and map its address to the clone creator.
/// @dev Cloning is done with OpenZeppelin's Clones contract.
contract CloneFactory {
    event ynPriceFeedCloneCreated(
        address _ynPriceFeedCloneAddress
    );

    mapping (address => address) public ynPriceFeedCloneAddresses;
    address public implementationAddress;

    /// @param _implementationAddress Address of implementation contract to be cloned.
    constructor(address _implementationAddress) {
        implementationAddress = _implementationAddress;
    }

    /// @notice Create clone of ynPriceFeed contract and initialize it.
    /// @dev Clone method returns address of created clone.
    /// @param _ynViewer Address of ynViewer contract.
    /// @param _priceFeedDecimals Amount of decimals a PriceFeed is denominiated in.
    /// @param _priceFeedBase Base asset of PriceFeed, should be set to asset symbol ticker.
    /// @param _priceFeedQuote Quote asset of PriceFeed, should be set to asset symbol ticker.
    function createYnPriceFeed(
        address _ynViewer,
        uint8 _priceFeedDecimals,
        string calldata _priceFeedBase,
        string calldata _priceFeedQuote
        ) external {
        address ynPriceFeedCloneAddress = Clones.clone(implementationAddress);
        ynPriceFeed(ynPriceFeedCloneAddress).initialize(
            _ynViewer,
            _priceFeedDecimals,
            _priceFeedBase,
            _priceFeedQuote
        );
        ynPriceFeedCloneAddresses[msg.sender] = ynPriceFeedCloneAddress;
        emit ynPriceFeedCloneCreated(ynPriceFeedCloneAddress);
    }
}
