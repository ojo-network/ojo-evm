import { useState } from 'react';
import AssetForm from './components/AssetForm';
import SymbolDropdown from './components/SymbolDropdown';
import PriceTable from './components/PriceTable';
import DisplayPricesButton from './components/DisplayPricesButton';
import RelayButton from './components/RelayButton';
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';
import { ConnectButton } from '@rainbow-me/rainbowkit';

function App () {
  const [assetNames, setAssetNames] = useState([] as string[]);
  const [symbol, setSymbol] = useState('');
  const [amount, setAmount] = useState('');
  const [priceData, setPriceData] = useState([] as any[]);
  const [selectAll, setSelectAll] = useState(false);

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
        <div className="custom-buttons">
          <RelayButton
            assetNames={assetNames}
            symbol={symbol}
            amount={amount}
          />
          <DisplayPricesButton
            assetNames={assetNames}
            setPriceData={setPriceData}
          />
        </div>
        <AssetForm
          assetNames={assetNames}
          setAssetNames={setAssetNames}
          selectAll={selectAll}
          setSelectAll={setSelectAll}
        />
        <SymbolDropdown
          symbol={symbol}
          setSymbol={setSymbol}
        />
        <input type="text" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Enter fee token amount" />
        <PriceTable priceData={priceData} />
      </div>
    </div>
  );
}

export default App
