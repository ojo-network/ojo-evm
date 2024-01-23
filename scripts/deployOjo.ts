import { Wallet, AbiCoder, ethers } from "ethers";
import Ojo from '../artifacts/contracts/Ojo.sol/Ojo.json';
import Create3Deployer from '@axelar-network/axelar-gmp-sdk-solidity/artifacts/contracts/deploy/Create3Deployer.sol/Create3Deployer.json';
import testnet_chains from '../testnet_chains.json';

async function main() {
  const axelarGasReceiverAddress = "0xbE406F0189A0B4cf3A05C286473D23791Dd44Cc6";
  const create3DeployerAddress = "0x6513Aedb4D1593BA12e50644401D976aebDc90d8";
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

    const deployerContract = new ethers.Contract(create3DeployerAddress, Create3Deployer.abi, wallet);

    const salt = ethers.zeroPadValue(ethers.toUtf8Bytes("Ojo"), 32);

    const coder = AbiCoder.defaultAbiCoder()
    const creationCode = ethers.solidityPacked(
        ["bytes", "bytes"],
        [Ojo.bytecode, coder.encode(["address", "address", "string", "string", "address", "uint256"],[chain.gateway, axelarGasReceiverAddress, ojoChain, ojoAddress, wallet.address, resolveWindow])]
    );

    // perform static call to log address of the contract
    const deployedAddress = await deployerContract.deploy.staticCallResult(creationCode, salt);
    console.log(`${chain.name}, address: ${deployedAddress}`);

    // perform actual deploy tx
    await deployerContract.deploy(creationCode, salt);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
