import React from 'react';
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
const mockOjoAddress = import.meta.env.VITE_MOCK_OJO_ADDRESS as `0x${string}`;
const environment = import.meta.env.VITE_ENVIRONMENT as Environment;

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
           //  const ojoContract = new ethers.Contract(ojoAddress, Ojo.abi, signer);
            const assetLimit = 1;
            if (assetNames.length > assetLimit) {
                alert("Cannot relay more than " + assetLimit + " assets at one time")
                return
            }

            // fetch token address of fee token if selected
            let tokenAddress;
            if (symbol) {
                const axelarGatewayAddress = axelarGatewayAddresses[chain.name];
                // log address
                console.log("axelarGatewayAddress", axelarGatewayAddress);
                const axelarGatewayContract = new ethers.Contract(axelarGatewayAddress, IAxelarGateway.abi, signer);

                // Convert symbol to uppercase and trim any whitespace
                const formattedSymbol = symbol.toUpperCase().trim();

                try {
                    tokenAddress = await axelarGatewayContract.tokenAddresses(formattedSymbol);
                    console.log(`Token address for ${formattedSymbol}: ${tokenAddress}`);
                } catch (error) {
                    console.error(`Error fetching token address for ${formattedSymbol}:`, error);
                    alert(`Failed to fetch token address for ${formattedSymbol}. Please check the console for details.`);
                    return;
                }
            }

            // estimate axelar gmp fee

            const api = new AxelarQueryAPI({ environment: environment });
            const gasFee = await api.estimateGasFee(
                axelarChains[chain?.name],
                "ojo",
                GasToken.AXL,
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
