import { Wallet, ethers } from "ethers";
import CloneFactory from '../artifacts/contracts/ynpricefeed/CloneFactory.sol/CloneFactory.json';
import testnet_chains from '../testnet_chains.json';
import mainnet_chains from '../mainnet_chains.json';

async function main() {
    const evmChains = JSON.parse(process.env.EVM_CHAINS!);
    const ynPriceFeedDecimals = process.env.PRICE_FEED_DECIMALS as any;
    const ynPriceFeeds = JSON.parse(process.env.YN_PRICE_FEEDS!);
    const ynViewers = JSON.parse(process.env.YN_VIEWERS!);

    if (ynPriceFeeds.length !== ynViewers.length) {
        throw new Error('unequal amount of ynViewers associated with ynPriceFeeds');
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

            const cloneFactoryYnContract = new ethers.Contract(chain.cloneFactoryYn, CloneFactory.abi, wallet)
            let i = 0
            for (const ynPriceFeed of ynPriceFeeds) {
                console.log(`Deploying ${ynPriceFeed} price feed on ${chain.name}`);
                try {
                    const [baseAsset, quoteAsset] = ynPriceFeed.split('/');

                    console.log("baseAsset", baseAsset)
                    console.log("quoteAsset", quoteAsset)
                    const tx = await cloneFactoryYnContract.createYnPriceFeed(ynViewers[i], ynPriceFeedDecimals, baseAsset, quoteAsset);
                    console.log(`Transaction sent: ${tx.hash}`);

                    const receipt = await tx.wait();
                    console.log(`Transaction mined: ${receipt.transactionHash}`);
                } catch (error) {
                    console.error(`Failed to deploy ${ynPriceFeed} on ${chain.name}:`, error);
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
