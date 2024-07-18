import { Wallet, ethers } from "ethers";
import Ojo from '../artifacts/contracts/Ojo.sol/Ojo.json';
import OjoProxy from '../artifacts/contracts/OjoProxy.sol/OjoProxy.json';
import testnet_chains from '../testnet_chains.json';
import mainnet_chains from '../mainnet_chains.json';
import { deployCreate2InitUpgradable, estimateDeploymentGas } from './utils/upgradable';

async function main() {
  const evmChains = JSON.parse(process.env.EVM_CHAINS!);
  const ojoChain = process.env.OJO_CHAIN;
  const resolveWindow = Number(process.env.RESOLVE_WINDOW);
  const assetLimit = Number(process.env.ASSET_LIMIT);

  const privateKey = process.env.PRIVATE_KEY;

  if (!privateKey) {
      throw new Error('Invalid private key. Make sure the PRIVATE_KEY environment variable is set.');
  }

  const mainnet = process.env.MAINNET as string
  let chains = testnet_chains.map((chain) => ({ ...chain }));
  if (mainnet === "TRUE") {
      chains = mainnet_chains.map((chain) => ({ ...chain }));
  }

  const key = Number(process.env.CONTRACT_KEY);

  for (const chain of chains) {
    if (evmChains.includes(chain.name)) {
        const provider = new ethers.JsonRpcProvider(chain.rpc)
        const wallet = new Wallet(privateKey, provider);
        const balance = await provider.getBalance(wallet.address)
        console.log(`${chain.name} wallet balance: ${ethers.formatEther(balance.toString())} ${chain.tokenSymbol}`);

        const feeData = await provider.getFeeData();
        const gasPrice = feeData.maxFeePerGas ?? feeData.gasPrice;
        if (!gasPrice) {
            throw new Error('Unable to retrieve gas price');
        }
        const estimatedGas = await estimateDeploymentGas(wallet, Ojo, [chain.gateway, chain.gasReceiver]);
        const deploymentCost = estimatedGas * gasPrice;

        if (balance < deploymentCost) {
            throw new Error(`Insufficient funds in wallet for deploying on ${chain.name}, deploymentCost: ${ethers.formatEther(deploymentCost.toString())} ${chain.tokenSymbol}`);
        }

        const deployedContract = await deployCreate2InitUpgradable(
            chain.create2Deployer,
            wallet,
            Ojo,
            OjoProxy,
            [chain.gateway, chain.gasReceiver],
            ethers.AbiCoder.defaultAbiCoder().encode(["string", "string", "uint256", "uint16"],[ojoChain, chain.ojoContract, resolveWindow, assetLimit]),
            key
        );

        console.log(`${chain.name}, address: ${await deployedContract.getAddress()}`);
    }
  }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
