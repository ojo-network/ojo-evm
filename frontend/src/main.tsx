import './polyfills';
import '@rainbow-me/rainbowkit/styles.css';
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

import { getDefaultWallets, RainbowKitProvider } from '@rainbow-me/rainbowkit';
import { configureChains, createConfig, WagmiConfig } from 'wagmi';
import { publicProvider } from 'wagmi/providers/public';
import {
  goerli,
  sepolia,
  bscTestnet,
  polygonMumbai,
  polygonZkEvmTestnet,
  avalancheFuji,
  fantomTestnet,
  moonbaseAlpha,
  arbitrumGoerli,
  arbitrumSepolia,
  optimismGoerli,
  baseGoerli,
  mantleTestnet,
  celoAlfajores,
  kavaTestnet,
  filecoinCalibration,
  lineaTestnet
} from 'wagmi/chains';

const { chains, publicClient } = configureChains(
  [goerli, sepolia, bscTestnet, polygonMumbai, polygonZkEvmTestnet,
    avalancheFuji, fantomTestnet, moonbaseAlpha, arbitrumGoerli,
    arbitrumSepolia, optimismGoerli, baseGoerli, mantleTestnet,
    celoAlfajores, kavaTestnet, filecoinCalibration, lineaTestnet],
  [publicProvider()]
);

const { connectors } = getDefaultWallets({
  appName: 'RainbowKit demo',
  projectId: 'YOUR_PROJECT_ID',
  chains,
});

const wagmiConfig = createConfig({
  autoConnect: true,
  connectors,
  publicClient,
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <WagmiConfig config={wagmiConfig}>
      <RainbowKitProvider chains={chains}>
        <App />
      </RainbowKitProvider>
    </WagmiConfig>
  </React.StrictMode>
);
