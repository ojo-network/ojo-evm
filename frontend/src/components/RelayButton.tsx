/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

import React from 'react';
import MockOjo from '../artifacts/contracts/MockOjo.sol/MockOjo.json';
import IAxelarGateway from '@axelar-network/axelar-gmp-sdk-solidity/artifacts/contracts/interfaces/IAxelarGateway.sol/IAxelarGateway.json'
import { axelarChains, axelarGatewayAddresses, isAxelarChain, axelarChainIDs } from './lib/AxelarChains'
import { Squid } from '@0xsquid/sdk'
import { ChainType, SquidCallType } from "@0xsquid/squid-types";
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
        if(networkName === "mainnet") {
          networkName = "ethereum"
        }
        if(networkName === "Arbitrum One") {
          networkName = "Arbitrum"
        }
        console.log("Fetching Ojo gas estimate for network:", networkName);

        const response = await fetch(
            `https://api.agamotto-val-prod-0.ojo.network/ojo/gasestimate/v1/gasestimate?network=${networkName}`
        );
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json() as { gas_estimate: string };
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
            try {
                const provider = new ethers.BrowserProvider(window.ethereum);
                const signer = await provider.getSigner();

                // Verify contract addresses
                if (!mockOjoAddress) {
                    throw new Error("MockOjo contract address not configured");
                }

                // Check asset limit
                const assetLimit = 1;
                if (assetNames.length > assetLimit) {
                    alert("Cannot relay more than " + assetLimit + " assets at one time")
                    return
                }

                // Get token addresses
                let axelarTokenAddress: string;
                if (symbol) {
                    const axelarGatewayAddress = axelarGatewayAddresses[chain.name];
                    if (!axelarGatewayAddress) {
                        throw new Error(`No Axelar Gateway address found for chain ${chain.name}`);
                    }
                    console.log("Using Axelar Gateway:", axelarGatewayAddress);

                    const axelarGatewayContract = new ethers.Contract(
                        axelarGatewayAddress,
                        IAxelarGateway.abi,
                        signer
                    );
                    const formattedSymbol = symbol.toUpperCase().trim();

                    try {
                        axelarTokenAddress = await axelarGatewayContract.tokenAddresses(formattedSymbol);
                        if (!axelarTokenAddress) {
                            throw new Error(`No token address found for symbol ${formattedSymbol}`);
                        }
                        console.log(`Token address for ${formattedSymbol}: ${axelarTokenAddress}`);
                    } catch (error) {
                        console.error(`Error fetching token address for ${formattedSymbol}:`, error);
                        throw new Error(`Failed to fetch token address for ${formattedSymbol}`);
                    }
                } else {
                    throw new Error("Symbol is required");
                }

                // Estimate Axelar GMP fee with higher gas limit
                const api = new AxelarQueryAPI({ environment: environment });
                await api.estimateGasFee(
                    axelarChains[chain?.name],
                    "ojo",
                    GasToken.AXL,
                    1000000, // Increased gas limit
                    2, // Higher gas multiplier
                );

                const chainid = axelarChainIDs[chain.name as keyof typeof axelarChainIDs];
                if (!chainid) {
                    throw new Error(`No chain ID found for ${chain.name}`);
                }

                // Prepare contract interactions
                const erc20Interface = new ethers.Interface(erc20ABI);
                const approvalerc20 = erc20Interface.encodeFunctionData("approve", [
                    mockOjoAddress,
                    ethers.MaxUint256,
                ]);

                // Prepare relay transaction
                const assetNamesArray = assetNames.map(name => ethers.encodeBytes32String(name));
                const ojoInterface = new ethers.Interface(MockOjo);
                const ojoEncodedData = ojoInterface.encodeFunctionData(
                    "relayOjoPriceDataWithToken",
                    [
                        assetNamesArray,
                        symbol,
                        ethers.parseUnits(amount, 6), // Using 6 decimals for USDC
                        axelarTokenAddress,
                    ]
                );

                // Calculate gas requirements
                const gasEstimateUAxl = await getOjoGasEstimate(chain.name);
                if (!gasEstimateUAxl) {
                    throw new Error("Failed to get gas estimate");
                }
                console.log("Base gas estimate (uAXL):", gasEstimateUAxl);

                // Safety multiplier of 2x
                const increasedGasEstimateUAxl = Number(gasEstimateUAxl) * 2;
                console.log("Increased gas estimate (uAXL):", increasedGasEstimateUAxl);

                // Calculate total gas for 72 updates (3 months)
                const totalGasUAxl = BigInt(increasedGasEstimateUAxl) * BigInt(72);
                const totalGasAXL = totalGasUAxl / BigInt(10**6);

                // Get token prices for conversion
                const [ethPriceResponse, axlPriceResponse] = await Promise.all([
                    fetch(`https://api.agamotto-val-prod-0.ojo.network/ojo/oracle/v1/denoms/exchange_rates/ETH`),
                    fetch(`https://api.agamotto-val-prod-0.ojo.network/ojo/oracle/v1/denoms/exchange_rates/AXL`)
                ]);

                type ExchangeRateResponse = {
                    exchange_rates: Array<{ amount: string }>;
                };

                const ethPriceData = await ethPriceResponse.json() as ExchangeRateResponse;
                const axlPriceData = await axlPriceResponse.json() as ExchangeRateResponse;

                if (!ethPriceData.exchange_rates?.[0]?.amount || !axlPriceData.exchange_rates?.[0]?.amount) {
                    throw new Error("Failed to get token prices");
                }

                const ethPrice = Number(ethPriceData.exchange_rates[0].amount);
                const axlPrice = Number(axlPriceData.exchange_rates[0].amount);
                const ethToAxlRate = ethPrice / axlPrice;

                if (ethToAxlRate === 0) {
                    throw new Error("Invalid exchange rate");
                }

                // Calculate final ETH amount
                const totalGasETH = Number(totalGasAXL) / ethToAxlRate;
                const totalGasETHWei = Math.floor(totalGasETH * 10**18).toString();

                console.log("Total gas cost:", {
                    ETH: totalGasETH,
                    USD: totalGasETH * ethPrice,
                    AXL: Number(totalGasAXL)
                });

                // Initialize Squid SDK
                const squid = getSDK();
                await squid.init();

                const fromToken = squid.tokens.find(
                    t => t.symbol === "WETH" && t.chainId === chainid
                );

                if (!fromToken) {
                    throw new Error("WETH token not found for chain");
                }

                // Configure post-hooks with improved gas estimates
                const postHooks = {
                    chainType: ChainType.EVM,
                    calls: [
                        {
                            chainType: ChainType.EVM,
                            callType: SquidCallType.FULL_TOKEN_BALANCE,
                            target: axelarTokenAddress,
                            value: "0",
                            callData: approvalerc20,
                            payload: {
                                tokenAddress: axelarTokenAddress,
                                inputPos: 1,
                            },
                            estimatedGas: "100000", // Increased for approval
                        },
                        {
                            chainType: ChainType.EVM,
                            callType: SquidCallType.FULL_TOKEN_BALANCE,
                            target: mockOjoAddress,
                            value: "0",
                            callData: ojoEncodedData,
                            payload: {
                                tokenAddress: axelarTokenAddress,
                                inputPos: 1,
                            },
                            estimatedGas: "500000", // Increased for cross-chain call
                        },
                    ],
                    description: "Ojo price data relay",
                    logoURI: "https://v2.app.squidrouter.com/images/icons/squid_logo.svg",
                    provider: signer.address,
                };

                // Prepare route parameters
                const params = {
                    fromAddress: signer.address,
                    fromChain: chainid,
                    fromToken: fromToken.address,
                    fromAmount: totalGasETHWei,
                    toChain: chainid,
                    toToken: axelarTokenAddress,
                    toAddress: signer.address,
                    quoteOnly: false,
                    postHooks: postHooks
                };

                console.log("Requesting route with params:", params);

                // Get and execute route
                const { route, requestId } = await squid.getRoute(params);
                if (!route) {
                    throw new Error("Failed to get route");
                }
                console.log("Route received:", { route, requestId });

                const tx = await squid.executeRoute({
                    signer,
                    route,
                }) as unknown as ethers.TransactionResponse;

                if (!tx) {
                    throw new Error("Failed to execute transaction");
                }

                console.log("Transaction sent:", tx.hash);

                const receipt = await tx.wait();
                if (!receipt) {
                    throw new Error("Failed to get transaction receipt");
                }
                console.log("Transaction confirmed:", receipt);

                if (receipt.status === 0) {
                    throw new Error("Transaction failed");
                }

                alert(`Transaction successful! Track status at https://${environment === Environment.TESTNET ? 'testnet.' : ''}axelarscan.io/gmp/${tx.hash}`);

            } catch (error: unknown) {
                console.error("Error executing relay transaction:", error);
                const errorMessage = error instanceof Error ? error.message : "Unknown error";
                alert(`Transaction failed: ${errorMessage}`);
            }
        } else {
            alert("Please connect your wallet and select a supported network");
        }
    }

    return <button onClick={relayPrices}>Relay Ojo Price Data</button>;
};

export default RelayPricesButton;
