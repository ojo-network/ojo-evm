import { Wallet, ethers } from "ethers";
import MockOjo from '../artifacts/contracts/MockOjo.sol/MockOjo.json';
import Create2Deployer from '@axelar-network/axelar-gmp-sdk-solidity/artifacts/contracts/deploy/Create2Deployer.sol/Create2Deployer.json';
import testnet_chains from '../testnet_chains.json';

async function main() {
  const ojoContractddress = "0x885C97650b85865A7b162179876585d1A8573D3E";
  const create2DeployerAddress = "0x98b2920d53612483f91f12ed7754e51b4a77919e";

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

    const deployerContract = new ethers.Contract(create2DeployerAddress, Create2Deployer.abi, wallet);

    const salt = ethers.zeroPadValue(ethers.toUtf8Bytes("MockOjo"), 32);

    const creationCode = ethers.solidityPacked(
        ["bytes", "bytes"],
        [MockOjo.bytecode, ethers.AbiCoder.defaultAbiCoder().encode(["address"], [ojoContractddress])]
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
