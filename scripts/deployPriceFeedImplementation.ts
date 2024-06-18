import { Wallet, ethers } from "ethers";
import PriceFeed from '../artifacts/contracts/pricefeed/PriceFeed.sol/PriceFeed.json';
import testnet_chains from '../testnet_chains.json';
import mainnet_chains from '../mainnet_chains.json';

async function main() {
    const evmChains = JSON.parse(process.env.EVM_CHAINS!);

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

            const priceFeedFactory = new ethers.ContractFactory(PriceFeed.abi, PriceFeed.bytecode, wallet)
            const priceFeed = await priceFeedFactory.deploy(chain.ojoContract)
            console.log(`${chain.name}, address: ${await priceFeed.getAddress()}`);
        }
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
