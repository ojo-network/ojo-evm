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
    "Optimism Sepolia": "optimism-sepolia",
    "Base Goerli": "base",
    "Base Sepolia": "base-sepolia",
    "Mantle Testnet": "mantle",
    "Alfajores": "celo",
    "Kava EVM Testnet": "kava",
    "Filecoin Calibration": "filecoin-2",
    "Linea Goerli Testnet": "linea",
    "Ethereum": "mainnet",
    "Arbitrum One": "arbitrum",
    "Base": "base",
    "OP Mainnet": "optimism"
};

export const axelarGatewayAddresses = {
    "Goerli": "0xe432150cce91c13a887f7D836923d5597adD8E31",
    "Sepolia": "0xe432150cce91c13a887f7D836923d5597adD8E31",
    "Binance Smart Chain Testnet": "0x4D147dCb984e6affEEC47e44293DA442580A3Ec0",
    "Polygon Mumbai": "0xBF62ef1486468a6bd26Dd669C06db43dEd5B849B",
    "Polygon zkEVM Testnet": "0x999117D44220F33e0441fbAb2A5aDB8FF485c54D",
    "Avalanche Fuji": "0xC249632c2D40b9001FE907806902f63038B737Ab",
    "Fantom Testnet": "0x97837985Ec0494E7b9C71f5D3f9250188477ae14",
    "Moonbase Alpha": "0x5769D84DD62a6fD969856c75c7D321b84d455929",
    "Arbitrum Goerli": "0xe432150cce91c13a887f7D836923d5597adD8E31",
    "Arbitrum Sepolia": "0xe432150cce91c13a887f7D836923d5597adD8E31",
    "Optimism Goerli": "0xe432150cce91c13a887f7D836923d5597adD8E31",
    "Optimism Sepolia": "0xe432150cce91c13a887f7D836923d5597adD8E31",
    "Base Goerli": "0xe432150cce91c13a887f7D836923d5597adD8E31",
    "Base Sepolia": "0xe432150cce91c13a887f7D836923d5597adD8E31",
    "Mantle Testnet": "0xe432150cce91c13a887f7D836923d5597adD8E31",
    "Alfajores": "0xe432150cce91c13a887f7D836923d5597adD8E31",
    "Kava EVM Testnet": "0xC8D18F85cB0Cee5C95eC29c69DeaF6cea972349c",
    "Filecoin Calibration": "0x999117D44220F33e0441fbAb2A5aDB8FF485c54D",
    "Linea Goerli Testnet": "0xe432150cce91c13a887f7D836923d5597adD8E31",
    "Ethereum": "0xe432150cce91c13a887f7D836923d5597adD8E31",
    "Arbitrum One": "0xe432150cce91c13a887f7D836923d5597adD8E31",
    "Base": "0xe432150cce91c13a887f7D836923d5597adD8E31",
    "OP Mainnet": "0xe432150cce91c13a887f7D836923d5597adD8E31"
}

export function isAxelarChain(key: any): key is keyof typeof axelarChains {
    return key in axelarChains;
}
