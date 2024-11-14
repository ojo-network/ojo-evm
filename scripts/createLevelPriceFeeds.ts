import { Wallet, ethers } from "ethers";
import CloneFactory from '../artifacts/contracts/levelpricefeed/CloneFactory.sol/CloneFactory.json';
import testnet_chains from '../testnet_chains.json';
import mainnet_chains from '../mainnet_chains.json';

async function main() {
    const evmChains = JSON.parse(process.env.EVM_CHAINS!);
    const levelPriceFeeds = JSON.parse(process.env.LEVEL_PRICE_FEEDS!);
    const levelOracles = JSON.parse(process.env.LEVEL_ORACLES!);

    if (levelPriceFeeds.length !== levelOracles.length) {
        throw new Error('unequal amount of levelOracles associated with levelPriceFeeds');
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

            const cloneFactoryLevelContract = new ethers.Contract(chain.cloneFactoryLevel, CloneFactory.abi, wallet)
            let i = 0
            for (const levelPriceFeed of levelPriceFeeds) {
                console.log(`Deploying ${levelPriceFeed} price feed on ${chain.name}`);
                try {
                    const [baseAsset, quoteAsset] = levelPriceFeed.split('/');

                    console.log("baseAsset", baseAsset)
                    console.log("quoteAsset", quoteAsset)
                    const tx = await cloneFactoryLevelContract.createLevelPriceFeed(levelOracles[i], baseAsset, quoteAsset);
                    console.log(`Transaction sent: ${tx.hash}`);

                    const receipt = await tx.wait();
                    console.log(`Transaction mined: ${receipt.transactionHash}`);
                } catch (error) {
                    console.error(`Failed to deploy ${levelPriceFeed} on ${chain.name}:`, error);
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
