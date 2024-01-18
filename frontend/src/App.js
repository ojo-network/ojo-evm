import { useEffect, useState } from 'react';
import Ojo from './artifacts/contracts/Ojo.sol/Ojo.json';
import MockOjo from './artifacts/contracts/MockOjoContract.sol/MockOjoContract.json';
import IERC20 from '@axelar-network/axelar-gmp-sdk-solidity/artifacts/contracts/interfaces/IERC20.sol/IERC20.json'
import IAxelarGateway from '@axelar-network/axelar-gmp-sdk-solidity/artifacts/contracts/interfaces/IAxelarGateway.sol/IAxelarGateway.json'
import {
  AxelarQueryAPI,
  Environment,
  GasToken,
} from "@axelar-network/axelarjs-sdk";
import AssetForm from './components/AssetForm';
import SymbolDropdown from './components/SymbolDropdown';
import PriceTable from './components/PriceTable';
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';
const ethers = require("ethers")

function App() {
  const [assetNames, setAssetNames] = useState([]);
  const [symbol, setSymbol] = useState('');
  const [amount, setAmount] = useState('');
  const [priceData, setPriceData] = useState([]);
  const [selectAll, setSelectAll] = useState(false);

  let signer = null;
  let provider;
  if (window.ethereum == null) {
    alert("MetaMask not installed; using read-only defaults")
    provider = ethers.getDefaultProvider()
  } else {
    provider = new ethers.BrowserProvider(window.ethereum)
    const setSigner = async () => {
      signer = await provider.getSigner();
    }
    setSigner()
  }

  const mockOjoAddress = "0x85A7C7Ed7d7E34078b8b9134bf729BE49c01CE2F";
  const ojoAddress = "0xB76bE5180a3107B427D676C5FE53A9C52BCeaeda";
  const axelarGatewayAddress = "0xe432150cce91c13a887f7D836923d5597adD8E31";

  useEffect(() => {
    const connectWallet = async () => {
      await provider.send("eth_requestAccounts", []);
    }

    connectWallet()
      .catch(console.error);
  })

  const relayOjoPriceDataWithToken = async () => {
    if (assetNames.length === 0 || !symbol || !amount) {
      setPriceData([]);
      return
    }
    const axelarGatewayContract = new ethers.Contract(axelarGatewayAddress, IAxelarGateway.abi, signer)
    const tokenAddress = await axelarGatewayContract.tokenAddresses(symbol)
    const tokenContract = new ethers.Contract(tokenAddress, IERC20.abi, signer);
    const mockOjoContract = new ethers.Contract(mockOjoAddress, MockOjo.abi, signer);

    const api = new AxelarQueryAPI({ environment: Environment.TESTNET });
    const gasFee = await api.estimateGasFee(
      "ethereum-2",
      "ojo",
      GasToken.ETH,
      700000,
      2,
    );

    if (typeof window.ethereum !== "undefined") {
      const assetNamesArray = assetNames.map(name => ethers.encodeBytes32String(name.trim()));
      try {
        // increase the allowance of MockOjo contract
        const tx1 = await tokenContract.approve(mockOjoAddress, ethers.parseUnits(amount, 6));
        await tx1.wait();

        const tx2 = await mockOjoContract.relayOjoPriceDataWithToken(
          assetNamesArray,
          symbol,
          ethers.parseUnits(amount, 6),
          tokenAddress,
          { value: gasFee }
        );
        await tx2.wait();
        alert('Ojo Price Data relay request sent successfully!');
      } catch(error) {
        console.error('Error sending Ojo Price Data relay request:', error);
        alert('Failed to send Ojo Price Data relay request')
      }
    }
  }

  const displayRelayedPrices = async () => {
    if (assetNames.length === 0) {
      setPriceData([]);
      return
    }
    const ojoContract = new ethers.Contract(ojoAddress, Ojo.abi, signer);

    const assetNamesArray = assetNames.map(name => ethers.encodeBytes32String(name));
    try {
      const data = await ojoContract.getPriceDataBulk(assetNamesArray);
      if (!data || data.length === 0) {
        alert('No price data available for the specified assets.');
        setPriceData([]);
      } else {
        setPriceData(data);
      }
    } catch (error) {
      console.error('Error fetching price data:', error);
      alert('Failed to fetch price data');
    }
  };

  return (
    <div className="App">
      <div className="App-Header">
        <div className="description">
          <h1 style={{color: "white"}}>Ojo EVM Price Relayer</h1>
          <h3 style={{color: "white"}}>Relay Ojo Price Data onto an EVM chain via Axelar General Message Passing</h3>
        </div>
        <div className="custom-buttons">
          <button onClick ={relayOjoPriceDataWithToken}>Relay Ojo Price Data</button>
          <button onClick ={displayRelayedPrices}>Display Relayed Prices</button>
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

export default App;
