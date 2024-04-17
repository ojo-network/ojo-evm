import React from 'react';
import Ojo from '../artifacts/contracts/Ojo.sol/Ojo.json';
import MockOjo from '../artifacts/contracts/MockOjo.sol/MockOjo.json';
import IERC20 from '@axelar-network/axelar-gmp-sdk-solidity/artifacts/contracts/interfaces/IERC20.sol/IERC20.json'
import IAxelarGateway from '@axelar-network/axelar-gmp-sdk-solidity/artifacts/contracts/interfaces/IAxelarGateway.sol/IAxelarGateway.json'
import { axelarChains, axelarGatewayAddresses, isAxelarChain } from './lib/AxelarChains'
import {
  AxelarQueryAPI,
  Environment,
  GasToken,
} from "@axelar-network/axelarjs-sdk";
import { ethers } from 'ethers';
import { useNetwork } from 'wagmi';
const ojoAddress = import.meta.env.VITE_OJO_ADDRESS as `0x${string}`;
const mockOjoAddress = import.meta.env.VITE_MOCK_OJO_ADDRESS as `0x${string}`;

type RelayPricesParameters = {
    assetNames: string[];
    symbol: string;
    amount: string;
}

const RelayPricesButton: React.FC<RelayPricesParameters> = ({ assetNames, symbol, amount }) =>  {
    const { chain } = useNetwork();

    const relayPrices = async () => {
        if (assetNames.length === 0) {
            alert("Must select assets to relay price data");
            return
        }

        if (typeof window.ethereum !== "undefined" && chain && isAxelarChain(chain.name)) {
            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();

            // check amount of assets requested to be relayed is not over limit
            const ojoContract = new ethers.Contract(ojoAddress, Ojo.abi, signer);
            const assetLimit = await ojoContract.assetLimit();
            if (assetNames.length > assetLimit) {
                alert("Cannot relay more than " + assetLimit + " assets at one time")
                return
            }

            // fetch token address of fee token if selected
            let tokenAddress;
            if (symbol) {
                const axelarGatewayAddress = axelarGatewayAddresses[chain.name];
                const axelarGatewayContract = new ethers.Contract(axelarGatewayAddress, IAxelarGateway.abi, signer);
                tokenAddress = await axelarGatewayContract.tokenAddresses(symbol);
            }

            // estimate axelar gmp fee
            const api = new AxelarQueryAPI({ environment: Environment.TESTNET });
            const gasFee = await api.estimateGasFee(
                axelarChains[chain?.name],
                "ojo",
                GasToken.ETH,
                700000,
                2,
            );

            // approve MockOjo Contract to spend fee token if selected
            if (symbol) {
                const tokenContract = new ethers.Contract(tokenAddress, IERC20.abi, signer);
                const tx1 = await tokenContract.approve(mockOjoAddress, ethers.parseUnits(amount, 6));
                await tx1.wait();
            }

            // send relay price data tx
            const assetNamesArray = assetNames.map(name => ethers.encodeBytes32String(name));
            const mockOjoContract = new ethers.Contract(mockOjoAddress, MockOjo.abi, signer);
            let tx2;
            if (symbol) {
                tx2 = await mockOjoContract.relayOjoPriceDataWithToken(
                    assetNamesArray,
                    symbol,
                    ethers.parseUnits(amount, 6),
                    tokenAddress,
                    { value: gasFee }
                );
            } else {
                tx2 = await mockOjoContract.relayOjoPriceData(
                    assetNamesArray,
                    { value: gasFee }
                )
            }
            await tx2.wait();
            alert("Relay tx sent succesfully, check status on https://testnet.axelarscan.io/gmp/search?chain=ojo")
        } else {
            alert("No wallet connected!")
        }
    }

    return <button onClick={relayPrices}>Relay Ojo Price Data</button>;
};

export default RelayPricesButton
