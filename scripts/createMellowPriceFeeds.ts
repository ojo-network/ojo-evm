import { Wallet, ethers } from "ethers";
import CloneFactory from '../artifacts/contracts/mellowpricefeed/CloneFactory.sol/CloneFactory.json';
import testnet_chains from '../testnet_chains.json';
import mainnet_chains from '../mainnet_chains.json';

async function main() {
    const evmChains = JSON.parse(process.env.EVM_CHAINS!);
    const mellowPriceFeedDecimals = process.env.PRICE_FEED_DECIMALS as any;
    const mellowPriceFeeds = JSON.parse(process.env.MELLOW_PRICE_FEEDS!);
    const mellowVaults = JSON.parse(process.env.MELLOW_VAULTS!);
    const mellowQuoteAssets = JSON.parse(process.env.MELLOW_QUOTE_ASSETS!);

    if (mellowPriceFeeds.length !== mellowVaults.length || mellowPriceFeeds.length !== mellowQuoteAssets.length) {
        throw new Error('unequal amount of mellowVaults associated with mellowPriceFeeds');
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

            const cloneFactoryMellowContract = new ethers.Contract(chain.cloneFactoryMellow, CloneFactory.abi, wallet)
            let i = 0
            for (const mellowPriceFeed of mellowPriceFeeds) {
                console.log(`Deploying ${mellowPriceFeed} price feed on ${chain.name}`);
                try {
                    const [baseAsset, quoteAsset] = mellowPriceFeed.split('/');

                    console.log("baseAsset", baseAsset)
                    console.log("quoteAsset", quoteAsset)
                    const tx = await cloneFactoryMellowContract.createMellowPriceFeed(mellowVaults[i], mellowQuoteAssets[i], mellowPriceFeedDecimals, baseAsset, quoteAsset);
                    console.log(`Transaction sent: ${tx.hash}`);

                    const receipt = await tx.wait();
                    console.log(`Transaction mined: ${receipt.transactionHash}`);
                } catch (error) {
                    console.error(`Failed to deploy ${mellowPriceFeed} on ${chain.name}:`, error);
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
