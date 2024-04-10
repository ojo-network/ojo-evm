import { Wallet, ethers } from "ethers";
import Ojo from '../artifacts/contracts/Ojo.sol/Ojo.json';
import testnet_chains from '../testnet_chains.json';
import mainnet_chains from '../mainnet_chains.json';
import { upgradeUpgradable } from './utils/upgradable';

async function main() {
    const ojoProxyAddress = process.env.OJO_CONTRACT_ADDRESS;
    const axelarGasReceiverAddress = process.env.AXELAR_GAS_RECEIVER_ADDRESS;

    const privateKey = process.env.PRIVATE_KEY;

    if (!privateKey) {
        throw new Error('Invalid private key. Make sure the PRIVATE_KEY environment variable is set.');
    }

    const mainnet = Boolean(process.env.MAINNET)
    let evmChains = testnet_chains.map((chain) => ({ ...chain }));
    if (mainnet === true) {
        evmChains = mainnet_chains.map((chain) => ({ ...chain }));
    }

    for (const chain of evmChains) {
        const provider = new ethers.JsonRpcProvider(chain.rpc)
        const wallet = new Wallet(privateKey, provider);
        const balance = await provider.getBalance(wallet.address)
        console.log(`${chain.name} wallet balance: ${ethers.formatEther(balance.toString())} ${chain.tokenSymbol}`);

        const upgradeTx = await upgradeUpgradable(
            ojoProxyAddress,
            wallet,
            Ojo,
            [chain.gateway, axelarGasReceiverAddress]
        );

        console.log(`${chain.name}, upgrade tx: ${upgradeTx.hash}`);
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
