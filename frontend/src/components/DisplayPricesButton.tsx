import React from 'react';
import Ojo from '../artifacts/contracts/Ojo.sol/Ojo.json';
import { ethers } from 'ethers';
const ojoAddress = import.meta.env.VITE_OJO_ADDRESS as `0x${string}`;

type DisplayPricesParameters = {
    assetNames: string[];
    setPriceData: React.Dispatch<React.SetStateAction<any[]>>;
}

const DisplayPricesButton: React.FC<DisplayPricesParameters> = ({ assetNames, setPriceData }) => {
    const displayRelayedPrices = async () => {
        if (assetNames.length === 0) {
            setPriceData([]);
            return;
        }

        if (typeof window.ethereum !== "undefined") {
            const provider = new ethers.BrowserProvider(window.ethereum);

            const ojoContract = new ethers.Contract(ojoAddress, Ojo.abi, provider);

            const assetNamesArray = assetNames.map(name => ethers.encodeBytes32String(name));
            try {
                const priceData = await ojoContract.getPriceDataBulk(assetNamesArray);
                setPriceData(priceData);
            } catch (error) {
                console.error('Failed to fetch price data:', error);
                setPriceData([]);
            }
        } else {
            alert("No wallet connected!")
        }
    };

    return <button onClick={displayRelayedPrices}>Display Relayed Prices</button>;
};

export default DisplayPricesButton
