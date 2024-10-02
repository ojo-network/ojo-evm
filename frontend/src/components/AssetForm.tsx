import React, { useState, useEffect } from 'react';
import axios from 'axios';

interface AssetFormProps {
    selectedAsset: string | null;
    setSelectedAsset: React.Dispatch<React.SetStateAction<string | null>>;
}

interface ExchangeRate {
    denom: string;
    amount: string;
}

const AssetForm: React.FC<AssetFormProps> = ({ selectedAsset, setSelectedAsset }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [exchangeRates, setExchangeRates] = useState<ExchangeRate[]>([]);
    const [filteredRates, setFilteredRates] = useState<ExchangeRate[]>([]);

    useEffect(() => {
        const fetchExchangeRates = async () => {
            try {
                const response = await axios.get('https://api.agamotto-val-prod-0.ojo.network/ojo/oracle/v1/denoms/exchange_rates/');
                setExchangeRates(response.data.exchange_rates);
            } catch (error) {
                console.error('Error fetching exchange rates:', error);
            }
        };

        fetchExchangeRates();
    }, []);

    useEffect(() => {
        const filtered = exchangeRates.filter(rate =>
            rate.denom.toLowerCase().includes(searchTerm.toLowerCase())
        );
        setFilteredRates(filtered);
    }, [searchTerm, exchangeRates]);

    const handleAssetSelect = (denom: string) => {
        setSelectedAsset(denom);
        setSearchTerm('');
    };

    const handleRemoveAsset = () => {
        setSelectedAsset(null);
    };

    return (
        <div>
            {selectedAsset ? (
                <div>
                    <span>Selected Asset: {selectedAsset}</span>
                    <button onClick={handleRemoveAsset}>X</button>
                </div>
            ) : (
                <>
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Search for assets..."
                    />
                    {searchTerm && (
                        <ul>
                            {filteredRates.map((rate) => (
                                <li key={rate.denom} onClick={() => handleAssetSelect(rate.denom)}>
                                    {rate.denom}
                                </li>
                            ))}
                        </ul>
                    )}
                </>
            )}
        </div>
    );
};

export default AssetForm;
