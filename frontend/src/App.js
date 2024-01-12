import { useEffect, useState } from 'react';
import Ojo from './artifacts/contracts/Ojo.sol/Ojo.json';
import MockOjo from './artifacts/contracts/MockOjoContract.sol/MockOjoContract.json';
import IERC20 from './artifacts/@axelar-network/axelar-gmp-sdk-solidity/contracts/interfaces/IERC20.sol/IERC20.json'
import './App.css';
const ethers = require("ethers")

function App() {
  const [assetNames, setAssetNames] = useState('');
  const [symbol, setSymbol] = useState('');
  const [amount, setAmount] = useState('');
  const [tokenAddress, setTokenAddress] = useState('');
  const [priceData, setPriceData] = useState([]);

  let signer = null;
  let provider;
  if (window.ethereum == null) {
      console.log("MetaMask not installed; using read-only defaults")
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

  useEffect(() => {
    const connectWallet = async () => {
      await provider.send("eth_requestAccounts", []);
    }

    connectWallet()
      .catch(console.error);
  })

  const relayOjoPriceDataWithToken = async () => {
    if (!assetNames || !symbol || !amount || !tokenAddress) return;
    const tokenContract = new ethers.Contract(tokenAddress, IERC20.abi, signer);
    const mockOjoContract = new ethers.Contract(mockOjoAddress, MockOjo.abi, signer);

    if (typeof window.ethereum !== "undefined") {
      const assetNamesArray = assetNames.split(',').map(name => ethers.encodeBytes32String(name.trim()));
      try {
        // increase the allowance of MockOjo contract
        const tx1 = await tokenContract.approve(mockOjoAddress, amount);
        await tx1.wait();

        const tx2 = await mockOjoContract.relayOjoPriceDataWithToken(
          assetNamesArray,
          symbol,
          amount,
          tokenAddress,
          { value: ethers.parseEther("0.01") }
        );
        await tx2.wait();
        alert('Ojo Price Data relay request sent successfully!');
      } catch(error) {
        alert(error)
        console.error('Error sending Ojo Price Data relay request:', error);
      }
    }
  }

  const displayRelayedPrices = async () => {
    if (!assetNames || assetNames.length === 0) {
      setPriceData([]);
      return
    }
    const ojoContract = new ethers.Contract(ojoAddress, Ojo.abi, signer);

    const assetNamesArray = assetNames.split(',').map(name => ethers.encodeBytes32String(name.trim()));
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
      alert('Failed to fetch price data.');
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
          <button onClick ={displayRelayedPrices}>DisplayRelayedPrices</button>
        </div>
      <input type="text" value={assetNames} onChange={(e) => setAssetNames(e.target.value)} placeholder="Enter asset names separated by commas" />
      <input type="text" value={symbol} onChange={(e) => setSymbol(e.target.value)} placeholder="Enter token symbol" />
      <input type="text" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Enter amount" />
      <input type="text" value={tokenAddress} onChange={(e) => setTokenAddress(e.target.value)} placeholder="Enter token address" />
      <div>
        {priceData.map((data, index) => {
          if (assetNames.length === 0 || !data || data.length === 0 || data.assetName === undefined || data.price === undefined) {
            return <div key={index}>No data available for this asset.</div>;
          }

          return (
            <div key={index}>
              <p>Asset: {ethers.encodeBytes32String(data.assetName)}</p>
              <p>Price: {data.price.toString()}</p>
            </div>
          );
        })}
      </div>
      </div>
    </div>
  );
}

export default App;
