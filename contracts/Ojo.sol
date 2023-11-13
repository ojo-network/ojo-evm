// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@axelar-network/axelar-gmp-sdk-solidity/contracts/executable/AxelarExecutable.sol";
import "@axelar-network/axelar-gmp-sdk-solidity/contracts/interfaces/IAxelarGateway.sol";
import "@axelar-network/axelar-gmp-sdk-solidity/contracts/interfaces/IAxelarGasService.sol";
import "./IOjo.sol";
import "./OjoTypes.sol";

contract Ojo is IOjo, AxelarExecutable {
    IAxelarGasService public immutable gasReceiver;

    string public ojoChain;

    string public ojoAddress;

    mapping(bytes32 => OjoTypes.PriceData) public priceData;

    constructor(
        address gateway_,
        address gasReceiver_,
        string memory ojoChain_,
        string memory ojoAddress_
    ) AxelarExecutable(gateway_) {
        gasReceiver = IAxelarGasService(gasReceiver_);
        ojoChain = ojoChain_;
        ojoAddress = ojoAddress_;
    }

    function callContractMethodWithOjoPriceData(
        bytes32[] calldata assetNames,
        address contractAddress,
        bytes4 commandSelector,
        bytes calldata commandParams
    ) external payable {
        OjoTypes.EncodedData memory packet = OjoTypes.EncodedData({
            assetNames: assetNames,
            contractAddress: contractAddress,
            commandSelector: commandSelector,
            commandParams: commandParams,
            timestamp: block.timestamp
        });

        bytes memory payloadWithVersion = abi.encodePacked(
            bytes4(uint32(0)), // version number
            abi.encode(packet) // payload
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

    function _execute(
        string calldata sourceChain,
        string calldata sourceAddress,
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

    function postPriceData(OjoTypes.PriceData[] memory _priceData) internal {
        for(uint256 i = 0; i < _priceData.length; i++){
            if (_priceData[i].resolveTime > block.timestamp) {
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
}
