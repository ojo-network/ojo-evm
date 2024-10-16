import { useState, useEffect } from 'react';
import { useNetwork } from 'wagmi';
import AssetForm from './components/AssetForm';
import RelayButton from './components/RelayButton';
import { estimateGasFee } from './utils/gasEstimate';
import { isAxelarChain } from './components/lib/AxelarChains';
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';
import { ConnectButton } from '@rainbow-me/rainbowkit';

function App() {
  const [selectedAsset, setSelectedAsset] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const { chain } = useNetwork();

  // Constant fee token
  const feeToken = "AXL";

  useEffect(() => {
    const updateGasFee = async () => {
      if (chain && isAxelarChain(chain.name)) {
        try {
          const gasFee = await estimateGasFee(chain.name, "0x", "100000", "0.40");
          if (gasFee === '') {
            setAmount('10');
          } else {
            const adjustedGasFee = Math.ceil(Number(gasFee) / 1000000).toString();
            setAmount(adjustedGasFee);
          }
        } catch (error) {
          console.error("Error estimating gas fee:", error);
          setAmount('10');
        }
      } else {
        setAmount('');
      }
    };

    updateGasFee();
  }, [chain]);

  return (
    <div className="App">
      <div className="App-Header">
        <div className="description">
          <h1 style={{color: "white"}}>Ojo EVM Price Relayer</h1>
          <h3 style={{color: "white"}}>Relay Ojo Price Data onto an EVM chain via Axelar General Message Passing</h3>
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
          <ConnectButton />
        </div>

        <AssetForm
          selectedAsset={selectedAsset}
          setSelectedAsset={setSelectedAsset}
        />
        <div>
          <p>Fee Token: {feeToken}</p>
          <input
            type="text"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Estimated fee (editable)"
          />
        </div>
        <div className="custom-buttons">
          <RelayButton
            assetNames={selectedAsset ? [selectedAsset] : []}
            symbol={feeToken}
            amount={amount}
          />
        </div>
      </div>
    </div>
  );
}

export default App;
