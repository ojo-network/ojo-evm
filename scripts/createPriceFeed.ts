import { Wallet, ethers } from "ethers";
import CloneFactory from '../artifacts/contracts/pricefeed/CloneFactory.sol/CloneFactory.json';
import testnet_chains from '../testnet_chains.json';
import mainnet_chains from '../mainnet_chains.json';

async function main() {
    const cloneFactoryAddress = process.env.CLONE_FACTORY_CONTRACT_ADDRESS as string;
    const priceFeedChain = process.env.PRICE_FEED_EVM_CHAIN as string;
    const priceFeedDecimals = process.env.PRICE_FEED_DECIMALS as any;
    const priceFeedDescriptions = process.env.PRICE_FEED_DESCRIPTIONS as any;

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
        if (chain.name === priceFeedChain) {
            const provider = new ethers.JsonRpcProvider(chain.rpc)
            const wallet = new Wallet(privateKey, provider);
            const balance = await provider.getBalance(wallet.address)
            console.log(`${chain.name} wallet balance: ${ethers.formatEther(balance.toString())} ${chain.tokenSymbol}`);

            const cloneFactoryContract = new ethers.Contract(cloneFactoryAddress, CloneFactory.abi, wallet)
            for (const priceFeedDescription of priceFeedDescriptions) {
                await cloneFactoryContract.createPriceFeed(priceFeedDecimals, priceFeedDescription)
            }
        }
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
