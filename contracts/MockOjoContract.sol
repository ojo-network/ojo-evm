// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@axelar-network/axelar-gmp-sdk-solidity/contracts/executable/AxelarExecutable.sol";
import "@axelar-network/axelar-gmp-sdk-solidity/contracts/interfaces/IAxelarGateway.sol";
import "@axelar-network/axelar-gmp-sdk-solidity/contracts/interfaces/IAxelarGasService.sol";
import "@axelar-network/axelar-gmp-sdk-solidity/contracts/interfaces/IERC20.sol";
import "./IOjo.sol";
import "./OjoTypes.sol";

contract MockOjoContract {
    IOjo public immutable ojo;

    struct Balance {
        bytes32 assetName;
        uint256 amount;
    }

    Balance[] public balances ;

    constructor(address ojo_) {
        ojo = IOjo(ojo_);
    }

    function relayOjoPriceData(
        bytes32[] calldata assetNames
    ) external payable {
        bytes memory commandParams = "0x";

        ojo.callContractMethodWithOjoPriceData{value: msg.value}(
            assetNames,
            address(this),
            OjoTypes.EMPTY_COMMAND_SELECTOR,
            commandParams
        );
    }

    function relayOjoPriceDataWithToken(
        bytes32[] calldata assetNames,
        string memory symbol,
        uint256 amount,
        address tokenAddress
    ) external payable {
        IERC20(tokenAddress).transferFrom(msg.sender, address(this), amount);
        IERC20(tokenAddress).approve(address(ojo), amount);

        bytes memory commandParams = "0x";

        ojo.callContractMethodWithOjoPriceDataAndToken{value: msg.value}(
            assetNames,
            address(this),
            OjoTypes.EMPTY_COMMAND_SELECTOR,
            commandParams,
            symbol,
            amount
        );
    }

    function setBalanceWithOjoPriceData(
        bytes32[] calldata assetNames,
        uint256 multiplier
    ) external payable {
        bytes memory commandParams = abi.encodePacked(multiplier);

        ojo.callContractMethodWithOjoPriceData{value: msg.value}(
            assetNames,
            address(this),
            MockOjoContract.setBalance.selector,
            commandParams
        );
    }

    function setBalanceWithOjoPriceDataWithToken(
        bytes32[] calldata assetNames,
        uint256 multiplier,
        string memory symbol,
        uint256 amount,
        address tokenAddress
    ) external payable {
        IERC20(tokenAddress).transferFrom(msg.sender, address(this), amount);
        IERC20(tokenAddress).approve(address(ojo), amount);

        bytes memory commandParams = abi.encodePacked(multiplier);

        ojo.callContractMethodWithOjoPriceDataAndToken{value: msg.value}(
            assetNames,
            address(this),
            MockOjoContract.setBalance.selector,
            commandParams,
            symbol,
            amount
        );
    }

    function setBalance(
        bytes32[] calldata assetNames,
        bytes calldata commandParams
    ) external {
        (uint256 multiplier) = abi.decode(commandParams, (uint256));
        for(uint256 i = 0; i < assetNames.length; i++){
            OjoTypes.PriceData memory priceData = ojo.getPriceData(assetNames[i]);

            if (priceData.price > 0) {
                Balance memory balance = Balance({
                    assetName: assetNames[i],
                    amount: priceData.price * multiplier
                });

                balances.push(balance);
            }
        }
    }
}
