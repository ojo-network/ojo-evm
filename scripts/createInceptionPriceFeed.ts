import { Wallet, ethers } from "ethers";
import CloneFactory from '../artifacts/contracts/inceptionpricefeed/CloneFactory.sol/CloneFactory.json';
import testnet_chains from '../testnet_chains.json';
import mainnet_chains from '../mainnet_chains.json';

async function main() {
    const evmChains = JSON.parse(process.env.EVM_CHAINS!);
    const inceptionPriceFeedDecimals = process.env.PRICE_FEED_DECIMALS as any;
    const inceptionPriceFeeds = JSON.parse(process.env.INCEPTION_PRICE_FEEDS!);
    const inceptionVaults = JSON.parse(process.env.INCEPTION_VAULTS!);
    const inceptionLRTAddresses = JSON.parse(process.env.INCEPTION_LRT_ADDRESS!);

    if (inceptionPriceFeeds.length !== inceptionVaults.length || inceptionPriceFeeds.length !== inceptionLRTAddresses.length) {
        throw new Error('unequal amount of inceptionVaults associated with inceptionPriceFeeds');
    }

    const privateKey = process.env.PRIVATE_KEY;

    if (!privateKey) {
        throw new Error('Invalid private key. Make sure the PRIVATE_KEY environment variable is set.');
    }

    const mainnet = process.env.MAINNET as string
    let chains = testnet_chains.map((chain) => ({ ...chain }));
    if (mainnet === "TRUE") {
        chains = mainnet_chains.map((chain) => ({ ...chain }));
    }

    for (const chain of chains) {
        if (evmChains.includes(chain.name)) {
            const provider = new ethers.JsonRpcProvider(chain.rpc)
            const wallet = new Wallet(privateKey, provider);
            const balance = await provider.getBalance(wallet.address)
            console.log(`${chain.name} wallet balance: ${ethers.formatEther(balance.toString())} ${chain.tokenSymbol}`);

            const cloneFactoryInceptionContract = new ethers.Contract(chain.cloneFactoryInception, CloneFactory.abi, wallet)
            let i = 0
            for (const inceptionPriceFeed of inceptionPriceFeeds) {
                console.log(`Deploying ${inceptionPriceFeed} price feed on ${chain.name}`);
                try {
                    const [baseAsset, quoteAsset] = inceptionPriceFeed.split('/');

                    console.log("baseAsset", baseAsset)
                    console.log("quoteAsset", quoteAsset)
                    const tx = await cloneFactoryInceptionContract.createInceptionPriceFeed(inceptionVaults[i], inceptionLRTAddresses[i], inceptionPriceFeedDecimals, baseAsset, quoteAsset);
                    console.log(`Transaction sent: ${tx.hash}`);

                    const receipt = await tx.wait();
                    console.log(`Transaction mined: ${receipt.transactionHash}`);
                } catch (error) {
                    console.error(`Failed to deploy ${inceptionPriceFeed} on ${chain.name}:`, error);
                }
                i += 1
            }
        }
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
