import { Wallet, ethers } from "ethers";
import Ojo from '../artifacts/contracts/Ojo.sol/Ojo.json';
import OjoProxy from '../artifacts/contracts/OjoProxy.sol/OjoProxy.json';
import testnet_chains from '../testnet_chains.json';
import mainnet_chains from '../mainnet_chains.json';
import { deployCreate2InitUpgradable } from './utils/upgradable';

async function main() {
  const axelarGasReceiverAddress = process.env.AXELAR_GAS_RECEIVER_ADDRESS;
  const create2DeployerAddress = process.env.CREATE2_DEPLOYER_ADDRESS;
  const ojoChain = process.env.OJO_CHAIN;
  const ojoAddress = process.env.OJO_ADDRESS;
  const resolveWindow = Number(process.env.RESOLVE_WINDOW);
  const assetLimit = Number(process.env.ASSET_LIMIT);

  const privateKey = process.env.PRIVATE_KEY;

  if (!privateKey) {
      throw new Error('Invalid private key. Make sure the PRIVATE_KEY environment variable is set.');
  }

  const mainnet = Boolean(process.env.MAINNET)
  let evmChains = testnet_chains.map((chain) => ({ ...chain }));
  if (mainnet === true) {
      evmChains = mainnet_chains.map((chain) => ({ ...chain }));
  }

  const key = Number(process.env.PRIVATE_KEY);

  for (const chain of evmChains) {
      const provider = new ethers.JsonRpcProvider(chain.rpc)
      const wallet = new Wallet(privateKey, provider);
      const balance = await provider.getBalance(wallet.address)
      console.log(`${chain.name} wallet balance: ${ethers.formatEther(balance.toString())} ${chain.tokenSymbol}`);

      const deployedContract = await deployCreate2InitUpgradable(
          create2DeployerAddress,
          wallet,
          Ojo,
          OjoProxy,
          [chain.gateway, axelarGasReceiverAddress],
          ethers.AbiCoder.defaultAbiCoder().encode(["string", "string", "uint256", "uint16"],[ojoChain, ojoAddress, resolveWindow, assetLimit]),
          key
      );

      console.log(`${chain.name}, address: ${await deployedContract.getAddress()}`);
  }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
