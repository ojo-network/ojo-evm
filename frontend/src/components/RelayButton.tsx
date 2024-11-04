import React from 'react';
import MockOjo from '../artifacts/contracts/MockOjo.sol/MockOjo.json';
import IAxelarGateway from '@axelar-network/axelar-gmp-sdk-solidity/artifacts/contracts/interfaces/IAxelarGateway.sol/IAxelarGateway.json'
import { axelarChains, axelarGatewayAddresses, isAxelarChain, axelarChainIDs } from './lib/AxelarChains'
import { Squid, TokenData } from '@0xsquid/sdk'
import { ChainData, ChainType } from "@0xsquid/squid-types";
import {
  AxelarQueryAPI,
  Environment,
  GasToken,
} from "@axelar-network/axelarjs-sdk";
import { ethers } from 'ethers';
import { erc20ABI, useNetwork } from 'wagmi';
const mockOjoAddress = import.meta.env.VITE_MOCK_OJO_ADDRESS as `0x${string}`;
const environment = import.meta.env.VITE_ENVIRONMENT as Environment;

type RelayPricesParameters = {
    assetNames: string[];
    symbol: string;
    amount: string;
}

const getSDK = (): Squid => {
    const squid = new Squid({
        baseUrl: "https://apiplus.squidrouter.com",
        integratorId: "ojo-5bc051db-c688-4182-9b52-ba8c7557d041",
    })
    return squid
}

const getOjoGasEstimate = async (networkName: string): Promise<string> => {
    try {
        if(networkName == "mainnet") {
          networkName = "ethereum"
        }
        if(networkName == "Arbitrum One") {
          networkName = "Arbitrum"
        }
        // log
        console.log("Fetching Ojo gas estimate for network:", networkName);

        const response = await fetch(
            `https://api.agamotto-val-prod-0.ojo.network/ojo/gasestimate/v1/gasestimate?network=${networkName}`
        );
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        return data.gas_estimate;
    } catch (error) {
        console.error("Failed to fetch Ojo gas estimate:", error);
        throw error;
    }
};

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
            let axelarTokenAddress;
            let ethTokenAddress;
            if (symbol) {
                const axelarGatewayAddress = axelarGatewayAddresses[chain.name];
                // log address
                console.log("axelarGatewayAddress", axelarGatewayAddress);
                const axelarGatewayContract = new ethers.Contract(axelarGatewayAddress, IAxelarGateway.abi, signer);


                // Convert symbol to uppercase and trim any whitespace
                const formattedSymbol = symbol.toUpperCase().trim();

                try {
                    axelarTokenAddress = await axelarGatewayContract.tokenAddresses(formattedSymbol);


                    ethTokenAddress = await axelarGatewayContract.tokenAddresses("ETH");
                    console.log(`Token address for ${formattedSymbol}: ${axelarTokenAddress}`);

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

            const chainid = axelarChainIDs[chain.name as keyof typeof axelarChainIDs]
            // Set up parameters for swapping tokens and depositing into Radiant lending pool

            // erc20 approval interface
            const erc20Interface = new ethers.Interface(erc20ABI)
            const approvalerc20 = erc20Interface.encodeFunctionData("approve", [
                mockOjoAddress,
                ethers.MaxUint256,
              ]);

            // send relay price data tx
            const assetNamesArray = assetNames.map(name => ethers.encodeBytes32String(name));
            const ojoInterface = new ethers.Interface(
                MockOjo.abi
              );
            const ojoEncodedData = ojoInterface.encodeFunctionData(
                "relayOjoPriceDataWithToken",
                [
                  assetNamesArray,
                  symbol, // Placeholder for dynamic balance
                  ethers.parseUnits(amount, 6),
                  axelarTokenAddress,
                ]
              );

            // Get the swap route using Squid SDK
            const squid = getSDK()
            await squid.init()

            // get chain id selected
            const chainId = chain?.id
            // print chainid
            console.log("chainId", chainId);

            const fromToken = squid.tokens.find(
              t =>
                t.symbol === "WETH" &&
                t.chainId === chainId.toString()
            );
            // log fromToken
            console.log("fromToken", fromToken);

            const postHooks = {
                chainType: ChainType.EVM,
                calls: [
                  {
                    chainType: ChainType.EVM,
                    callType: 1,// SquidCallType.FULL_TOKEN_BALANCE
                    target: axelarTokenAddress,
                    value: "0", // this will be replaced by the full native balance of the multicall after the swap
                    callData: approvalerc20,
                    payload: {
                      tokenAddress: axelarTokenAddress,
                      inputPos: 1,
                    },
                    estimatedGas: "50000",
                  },
                  {
                    chainType: ChainType.EVM,
                    callType: 1, // SquidCallType.FULL_TOKEN_BALANCE
                    target: mockOjoAddress,
                    value: "0",
                    callData: ojoEncodedData,
                    payload: {
                      tokenAddress: axelarTokenAddress,
                      inputPos: 1,
                    },
                    estimatedGas: "50000",
                  },
                ],
                description: "ojo price data relay",
                logoURI: "https://v2.app.squidrouter.com/images/icons/squid_logo.svg",
                provider: signer.address,
              }

              // Let's calculate how much gas we want for 3 months. ETH tends to deviate about 72 times every 3 months.
              // Every deviation is a tx, so we want to have 72 * gasestimate = gas in uAXL.
              // Then, we need to convert uAXL -> AXL -> ETH.
              // Then, swap that amount of ETH and use it for the transaction.

              // Get Ojo gas estimate in uAXL
              const gasEstimateUAxl = await getOjoGasEstimate(chain.name);
              console.log("Gas estimate (uAXL):", gasEstimateUAxl);
              // let's increase this by 2x for safety
              const increasedGasEstimateUAxl = Number(gasEstimateUAxl) * 2;
              console.log("Increased gas estimate (uAXL):", increasedGasEstimateUAxl);

              // Calculate total gas needed for 72 updates (3 months)
              const totalGasUAxl = BigInt(increasedGasEstimateUAxl) * BigInt(72);
              console.log("Total gas for 3 months (uAXL):", totalGasUAxl.toString());

              // divide by 10^6 to get AXL
              const totalGasAXL = totalGasUAxl / BigInt(10**6);
              console.log("Total gas for 3 months (AXL):", totalGasAXL.toString());

              // now convert to ETH. Get the price of ETH from Ojo's API
              const ethPriceResponse = await fetch(`https://api.agamotto-val-prod-0.ojo.network/ojo/oracle/v1/denoms/exchange_rates/ETH`);
              const ethPriceData = await ethPriceResponse.json();
              const ethPrice = ethPriceData.exchange_rates[0].amount;
              console.log("ETH price:", ethPrice);

              // now get AXL price
              const axlPriceResponse = await fetch(`https://api.agamotto-val-prod-0.ojo.network/ojo/oracle/v1/denoms/exchange_rates/AXL`);
              const axlPriceData = await axlPriceResponse.json();
              const axlPrice = axlPriceData.exchange_rates[0].amount;
              console.log("AXL price:", axlPrice);
              // get ETH -> AXL exchange rate
              const ethToAxlRate = ethPrice / axlPrice;
              console.log("ETH -> AXL rate:", ethToAxlRate);

              // convert totalGasAXL to ETH
              const totalGasETH = Number(totalGasAXL) / ethToAxlRate;
              console.log("Total gas for 3 months (ETH):", totalGasETH.toString());

              // now multiply ETH value by 10^18
              const totalGasETHWei = totalGasETH * 10**18;
              // print totalGasETHWei
              console.log("Total gas for 3 months (ETH Wei):", totalGasETHWei.toString());

              // print in USD
              const totalGasUSD = totalGasETH * ethPrice;
              console.log("Total gas for 3 months (USD):", totalGasUSD.toString());


              // Now you can use totalGasUAxl to calculate the fromAmount
              // Example: Convert this to the appropriate ETH amount for the swap
              // For now, keeping the existing amount:
              const params = {
                fromAddress: signer.address,
                fromChain: chainid,
                fromToken: fromToken?.address || "",
                fromAmount: totalGasETHWei.toString(),
                toChain: chainid,
                toToken: axelarTokenAddress,
                toAddress: signer.address,
                quoteOnly: false,
                postHooks: postHooks
            };

            console.log("params", params);


            const { route, requestId } = await squid!.getRoute(params)
            console.log("route", route);



            // Execute the swap transaction
            const tx = (await squid.executeRoute({
                signer,
                route,
            })) as unknown as ethers.TransactionResponse;
            const txReceipt = await tx.wait();

            // Show the transaction receipt with Axelarscan link
            console.log("txReceipt", txReceipt);


            // print route
            console.log("route", route);
            console.log("requestId", requestId);
            alert("Relay tx sent succesfully, check status on https://testnet.axelarscan.io/gmp/search?chain=ojo")
        } else {
            alert("No wallet connected!")
        }
    }

    return <button onClick={relayPrices}>Relay Ojo Price Data</button>;
};

export default RelayPricesButton
