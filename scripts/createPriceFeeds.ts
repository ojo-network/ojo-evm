import { Wallet, ethers } from "ethers";
import CloneFactory from '../artifacts/contracts/pricefeed/CloneFactory.sol/CloneFactory.json';
import testnet_chains from '../testnet_chains.json';
import mainnet_chains from '../mainnet_chains.json';

async function main() {
    const evmChains = JSON.parse(process.env.EVM_CHAINS!);
    const priceFeedDecimals = process.env.PRICE_FEED_DECIMALS as any;
    const priceFeedDescriptions = JSON.parse(process.env.PRICE_FEED_DESCRIPTIONS!);

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

            const cloneFactoryContract = new ethers.Contract(chain.cloneFactory, CloneFactory.abi, wallet)
            for (const priceFeedDescription of priceFeedDescriptions) {
                console.log(`Deploying ${priceFeedDescription} price feed on ${chain.name}`);
                try {
                    const tx = await cloneFactoryContract.createPriceFeed(priceFeedDecimals, priceFeedDescription);
                    console.log(`Transaction sent: ${tx.hash}`);

                    const receipt = await tx.wait();
                    console.log(`Transaction mined: ${receipt.transactionHash}`);
                } catch (error) {
                    console.error(`Failed to deploy ${priceFeedDescription} on ${chain.name}:`, error);
                }
            }
        }
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
