// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@axelar-network/axelar-gmp-sdk-solidity/contracts/express/AxelarExpressExecutable.sol";
import "@axelar-network/axelar-gmp-sdk-solidity/contracts/interfaces/IAxelarGateway.sol";
import "@axelar-network/axelar-gmp-sdk-solidity/contracts/interfaces/IAxelarGasService.sol";
import "@axelar-network/axelar-gmp-sdk-solidity/contracts/interfaces/IERC20.sol";
import "@axelar-network/axelar-gmp-sdk-solidity/contracts/upgradable/Upgradable.sol";
import "./IOjo.sol";
import "./OjoTypes.sol";

contract Ojo is IOjo, AxelarExpressExecutable, Upgradable {
    IAxelarGasService public immutable gasReceiver;

    string public ojoChain;

    string public ojoAddress;

    uint256 public resolveWindow;

    uint16 public assetLimit;

    mapping(bytes32 => OjoTypes.PriceData) public priceData;

    error AlreadyInitialized();

    constructor(address gateway_, address gasReceiver_) AxelarExpressExecutable(gateway_) {
        gasReceiver = IAxelarGasService(gasReceiver_);
    }

    function callContractMethodWithOjoPriceData(
        bytes32[] calldata assetNames,
        address contractAddress,
        bytes4 commandSelector,
        bytes calldata commandParams
    ) external payable {
        require(assetNames.length <= assetLimit, "Number of assets requested is over limit");

        bytes memory payloadWithVersion = abi.encodePacked(
            bytes4(uint32(0)), // version number
            abi.encode(assetNames, contractAddress, commandSelector, commandParams, block.timestamp) // payload
        );

        gasReceiver.payNativeGasForContractCall{value: msg.value}(
            address(this),
            ojoChain,
            ojoAddress,
            payloadWithVersion,
            msg.sender
        );

        gateway.callContract(ojoChain, ojoAddress, payloadWithVersion);
    }

    function callContractMethodWithOjoPriceDataAndToken(
        bytes32[] calldata assetNames,
        address contractAddress,
        bytes4 commandSelector,
        bytes calldata commandParams,
        string memory symbol,
        uint256 amount
    ) external payable {
        require(assetNames.length <= assetLimit, "Number of assets requested is over limit");

        address tokenAddress = gateway.tokenAddresses(symbol);
        IERC20(tokenAddress).transferFrom(msg.sender, address(this), amount);
        IERC20(tokenAddress).approve(address(gateway), amount);

        bytes memory payloadWithVersion = abi.encodePacked(
            bytes4(uint32(0)), // version number
            abi.encode(assetNames, contractAddress, commandSelector, commandParams, block.timestamp) // payload
        );

        gasReceiver.payNativeGasForContractCallWithToken{value: msg.value}(
            address(this),
            ojoChain,
            ojoAddress,
            payloadWithVersion,
            symbol,
            amount,
            msg.sender
        );

        gateway.callContractWithToken(ojoChain, ojoAddress, payloadWithVersion, symbol, amount);
    }

    function _setup(bytes calldata data) internal override {
        (string memory ojoChain_, string memory ojoAddress_, uint256 resolveWindow_, uint16 assetLimit_) = abi.decode(
            data,
            (string, string, uint256, uint16)
        );
        if (bytes(ojoChain).length != 0) revert AlreadyInitialized();
        if (bytes(ojoAddress).length != 0) revert AlreadyInitialized();
        if (resolveWindow != 0) revert AlreadyInitialized();
        if (assetLimit != 0) revert AlreadyInitialized();
        ojoChain = ojoChain_;
        ojoAddress = ojoAddress_;
        resolveWindow = resolveWindow_;
        assetLimit = assetLimit_;
    }

    function _execute(
        string calldata,
        string calldata,
        bytes calldata payload
    ) internal override {
        (
            OjoTypes.PriceData[] memory _priceData,
            bytes32[] memory assetNames,
            address contractAddress,
            bytes4 commandSelector,
            bytes memory commandParams
        ) = abi.decode(
            payload,
            (OjoTypes.PriceData[], bytes32[], address, bytes4, bytes)
        );

        postPriceData(_priceData);

        // Call contract only if command selector is non empty
        if (commandSelector != OjoTypes.EMPTY_COMMAND_SELECTOR) {
            (bool success, bytes memory result) = contractAddress.call(
                abi.encodeWithSelector(commandSelector, assetNames, commandParams)
            );

            if (!success) {
                if (result.length == 0) {
                    require(success, 'Failed with no reason');
                } else {
                    // rethrow same error
                    assembly {
                        let start := add(result, 0x20)
                        let end := add(result, mload(result))
                        revert(start, end)
                    }
                }
            }
        }
    }

    function postPriceData(OjoTypes.PriceData[] memory _priceData) internal {
        for(uint256 i = 0; i < _priceData.length; i++){
            if (_priceData[i].resolveTime + resolveWindow > block.timestamp) {
                priceData[_priceData[i].assetName] = _priceData[i];
            }
        }

        emit PriceDataPosted(block.timestamp);
    }

    function getPriceData(
        bytes32 assetName
    ) external view returns (OjoTypes.PriceData memory) {
        return priceData[assetName];
    }

    function getPriceDataBulk(
        bytes32[] calldata assetNames
    ) external view returns (OjoTypes.PriceData[] memory _priceData) {
        _priceData = new OjoTypes.PriceData[](assetNames.length);
        for (uint256 i = 0; i < assetNames.length; i++) {
            _priceData[i] = priceData[assetNames[i]];
        }

        return _priceData;
    }

    function getPrice(
        bytes32 baseAssetName,
        bytes32 quoteAssetName
    ) external view returns (OjoTypes.Price memory) {
        (uint256 basePrice, uint256 baseResolveTime)
            = getPriceValueAndResolveTime(baseAssetName);
        (uint256 quotePrice, uint256 quoteResolveTime)
            = getPriceValueAndResolveTime(quoteAssetName);

        require(quotePrice > 0, "Quote price is 0");

        uint256 price = (basePrice * 10**18) / quotePrice;

        return OjoTypes.Price({
            price: price,
            baseResolveTime: baseResolveTime,
            quoteResolveTime: quoteResolveTime
        });
    }

    function getPriceValueAndResolveTime(
        bytes32 assetName
    ) internal view returns (uint256, uint256) {
        if (assetName == OjoTypes.USD) {
            return (OjoTypes.USD_PRICE, 0);
        }

        return (priceData[assetName].price, priceData[assetName].resolveTime);
    }

    function updateOjoChain(string calldata ojoChain_) external onlyOwner {
        ojoChain = ojoChain_;
    }

    function updateOjoAddress(string calldata ojoAddress_) external onlyOwner {
        ojoAddress = ojoAddress_;
    }

    function updateResolveWindow(uint256 resolveWindow_) external onlyOwner {
        resolveWindow = resolveWindow_;
    }

    function updateAssetLimit(uint8 assetLimit_) external onlyOwner {
        assetLimit = assetLimit_;
    }

    function contractId() external pure returns (bytes32) {
        return keccak256('ojo-v1');
    }
}
