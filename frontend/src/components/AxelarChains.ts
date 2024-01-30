// maps wagmi chain name to name on axelarjs-sdk
export const axelarChains = {
    "Goerli": "ethereum-2",
    "Sepolia": "ethereum-sepolia",
    "Binance Smart Chain Testnet": "binance",
    "Polygon Mumbai": "polygon",
    "Polygon zkEVM Testnet": "polygon-zkevm",
    "Avalanche Fuji": "avalanche",
    "Fantom Testnet": "fantom",
    "Moonbase Alpha": "moonbeam",
    "Arbitrum Goerli": "arbitrum",
    "Arbitrum Sepolia": "arbitrum-sepolia",
    "Optimism Goerli": "optimism",
    "Base Goerli": "base",
    "Mantle Testnet": "mantle",
    "Alfajores": "celo",
    "Kava EVM Testnet": "kava",
    "Filecoin Calibration": "filecoin",
    "Linea Goerli Testnet": "linea"
};

export function isAxelarChain(key: any): key is keyof typeof axelarChains {
    return key in axelarChains;
}
