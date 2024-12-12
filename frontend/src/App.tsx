import { useState, useEffect } from 'react';
import { useNetwork } from 'wagmi';
import AssetForm from './components/AssetForm';
import RelayButton from './components/RelayButton';
import { isAxelarChain } from './components/lib/AxelarChains';
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import axios from 'axios'; // Import axios for making HTTP requests

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
          // Fetch gas estimate from the API
          const response = await axios.get('https://api.agamotto-val-prod-0.ojo.network/ojo/gasestimate/v1/gasestimate?network=Arbitrum');
          let gasEstimate = response.data.gas_estimate;
          // divide gas estimate by 1000000
          gasEstimate = (gasEstimate * 10 / 1000000).toString();

          // Set the amount with the fetched gas estimate
          setAmount(gasEstimate);
        } catch (error) {
          console.error("Error fetching gas estimate:", error);
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
