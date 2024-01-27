import { Wallet, ethers } from "ethers";
import Ojo from '../artifacts/contracts/Ojo.sol/Ojo.json';
import OjoProxy from '../artifacts/contracts/OjoProxy.sol/OjoProxy.json';
import testnet_chains from '../testnet_chains.json';
const { deployCreate2InitUpgradable } = require('./utils');

async function main() {
  const axelarGasReceiverAddress = "0xbE406F0189A0B4cf3A05C286473D23791Dd44Cc6";
  const create2DeployerAddress = "0x98b2920d53612483f91f12ed7754e51b4a77919e";
  const ojoChain = "ojo";
  const ojoAddress = "ojo1es9mhmnunh208ucwq8rlrl97hqulxrz8k37dcu";
  const resolveWindow = 7200

  const privateKey = process.env.PRIVATE_KEY;

  if (!privateKey) {
      throw new Error('Invalid private key. Make sure the PRIVATE_KEY environment variable is set.');
  }

  const evmChains = testnet_chains.map((chain) => ({ ...chain }));

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
          ethers.AbiCoder.defaultAbiCoder().encode(["string", "string", "uint256"],[ojoChain, ojoAddress, resolveWindow])
      );

      console.log(`${chain.name}, address: ${await deployedContract.getAddress()}`);
  }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
