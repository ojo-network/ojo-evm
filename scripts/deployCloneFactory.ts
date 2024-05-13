import { Wallet, ethers } from "ethers";
import CloneFactory from '../artifacts/contracts/pricefeed/CloneFactory.sol/CloneFactory.json';
import testnet_chains from '../testnet_chains.json';
import mainnet_chains from '../mainnet_chains.json';

async function main () {
    const priceFeedImplementation = process.env.PRICE_FEED_IMPLEMENTATION_CONTRACT_ADDRESS;

    const privateKey = process.env.PRIVATE_KEY;

    if (!privateKey) {
        throw new Error('Invalid private key. Make sure the PRIVATE_KEY environment variable is set.');
    }

    const mainnet = process.env.MAINNET as string
    let evmChains = testnet_chains.map((chain) => ({ ...chain }));
    if (mainnet === "TRUE") {
        evmChains = mainnet_chains.map((chain) => ({ ...chain }));
    }

    for (const chain of evmChains) {
        const provider = new ethers.JsonRpcProvider(chain.rpc)
        const wallet = new Wallet(privateKey, provider);
        const balance = await provider.getBalance(wallet.address)
        console.log(`${chain.name} wallet balance: ${ethers.formatEther(balance.toString())} ${chain.tokenSymbol}`);

        const priceFeedFactory = new ethers.ContractFactory(CloneFactory.abi, CloneFactory.bytecode, wallet)
        const priceFeed = await priceFeedFactory.deploy(priceFeedImplementation)
        console.log(`${chain.name}, address: ${await priceFeed.getAddress()}`);
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
