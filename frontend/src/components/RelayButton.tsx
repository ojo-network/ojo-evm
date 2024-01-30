import React from 'react';
import MockOjo from '../artifacts/contracts/MockOjoContract.sol/MockOjoContract.json';
import IERC20 from '@axelar-network/axelar-gmp-sdk-solidity/artifacts/contracts/interfaces/IERC20.sol/IERC20.json'
import IAxelarGateway from '@axelar-network/axelar-gmp-sdk-solidity/artifacts/contracts/interfaces/IAxelarGateway.sol/IAxelarGateway.json'
import { axelarChains, isAxelarChain } from './AxelarChains'
import {
  AxelarQueryAPI,
  Environment,
  GasToken,
} from "@axelar-network/axelarjs-sdk";
import { ethers } from 'ethers';
import { useNetwork } from 'wagmi';
const mockOjoAddress = "0x3b9A4915c01Ce2e5AD07FE1F6B18ee763a4BB841" as `0x${string}`;
const axelarGatewayAddress = "0xe432150cce91c13a887f7D836923d5597adD8E31" as `0x${string}`;

type RelayPricesParameters = {
    assetNames: string[];
    symbol: string;
    amount: string;
}

const RelayPricesButton: React.FC<RelayPricesParameters> = ({ assetNames, symbol, amount }) =>  {
    const { chain } = useNetwork();

    const relayPrices = async () => {
        if (assetNames.length === 0 || !symbol || !amount) {
            return
        }

        if (typeof window.ethereum !== "undefined" && chain && isAxelarChain(chain.name)) {
            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();

            // fetch token address of fee token
            const axelarGatewayContract = new ethers.Contract(axelarGatewayAddress, IAxelarGateway.abi, signer);
            const tokenAddress = await axelarGatewayContract.tokenAddresses(symbol);

            // estimate axelar gmp fee
            const api = new AxelarQueryAPI({ environment: Environment.TESTNET });
            const gasFee = await api.estimateGasFee(
                axelarChains[chain?.name],
                "ojo",
                GasToken.ETH,
                700000,
                2,
            );

            // approve MockOjo Contract to spend fee token
            const tokenContract = new ethers.Contract(tokenAddress, IERC20.abi, signer);
            const tx1 = await tokenContract.approve(mockOjoAddress, ethers.parseUnits(amount, 6));
            await tx1.wait();

            // send relay price data tx
            const assetNamesArray = assetNames.map(name => ethers.encodeBytes32String(name));
            const mockOjoContract = new ethers.Contract(mockOjoAddress, MockOjo.abi, signer);
            const tx2 = await mockOjoContract.relayOjoPriceDataWithToken(
                assetNamesArray,
                symbol,
                ethers.parseUnits(amount, 6),
                tokenAddress,
                { value: gasFee }
            );
            await tx2.wait();
        }
    }

    return <button onClick={relayPrices}>Relay Ojo Price Data</button>;
};

export default RelayPricesButton
