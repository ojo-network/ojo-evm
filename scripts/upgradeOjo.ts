import { Wallet, getDefaultProvider, ethers } from "ethers";
import Ojo from '../artifacts/contracts/Ojo.sol/Ojo.json';
import testnet_chains from '../testnet_chains.json';
const { upgradeUpgradable } = require('@axelar-network/axelar-gmp-sdk-solidity');

async function main() {
    const ojoProxyAddress = "0x4C49Bca23BB402e4938B59Af14f17FA8178c1BA3";
    const axelarGasReceiverAddress = "0xbE406F0189A0B4cf3A05C286473D23791Dd44Cc6";

    const privateKey = process.env.PRIVATE_KEY;

    if (!privateKey) {
        throw new Error('Invalid private key. Make sure the PRIVATE_KEY environment variable is set.');
    }

    const evmChains = testnet_chains.map((chain) => ({ ...chain }));

    for (const chain of evmChains) {
        const provider = getDefaultProvider(chain.rpc)
        const wallet = new Wallet(privateKey, provider);
        const balance = await provider.getBalance(wallet.address)
        console.log(`${chain.name} wallet balance: ${ethers.utils.formatEther(balance.toString())} ${chain.tokenSymbol}`);

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
