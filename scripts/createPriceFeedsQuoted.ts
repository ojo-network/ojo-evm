import { Wallet, ethers } from "ethers";
import CloneFactoryQuoted from '../artifacts/contracts/pricefeedquoted/CloneFactoryQuoted.sol/CloneFactoryQuoted.json';
import testnet_chains from '../testnet_chains.json';
import mainnet_chains from '../mainnet_chains.json';

async function main() {
    const evmChains = JSON.parse(process.env.EVM_CHAINS!);
    const priceFeedQuotedDecimals = process.env.PRICE_FEED_DECIMALS as any;
    const quotedPriceFeeds = JSON.parse(process.env.QUOTED_PRICE_FEEDS!);

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

            const cloneFactoryQuotedContract = new ethers.Contract(chain.cloneFactoryQuoted, CloneFactoryQuoted.abi, wallet)
            for (const quotedPriceFeed of quotedPriceFeeds) {
                console.log(`Deploying ${quotedPriceFeed} price feed on ${chain.name}`);
                try {
                    const [baseAsset, quoteAsset] = quotedPriceFeed.split('/');

                    console.log("baseAsset", baseAsset)
                    console.log("quoteAsset", quoteAsset)
                    const tx = await cloneFactoryQuotedContract.createPriceFeedQuoted(priceFeedQuotedDecimals, baseAsset, quoteAsset);
                    console.log(`Transaction sent: ${tx.hash}`);

                    const receipt = await tx.wait();
                    console.log(`Transaction mined: ${receipt.transactionHash}`);
                } catch (error) {
                    console.error(`Failed to deploy ${quotedPriceFeed} on ${chain.name}:`, error);
                }
            }
        }
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
