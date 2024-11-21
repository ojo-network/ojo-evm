import React from 'react';
import { useNetwork } from 'wagmi';
import { estimateGasFee } from '../utils/gasEstimate';
import { isAxelarChain } from './lib/AxelarChains';

interface EstimateGasFeeButtonProps {
    setAmount: React.Dispatch<React.SetStateAction<string>>;
}

const EstimateGasFeeButton: React.FC<EstimateGasFeeButtonProps> = ({ setAmount }) => {
    const { chain } = useNetwork();

    const handleEstimateGasFee = async () => {
        if (!chain || !isAxelarChain(chain.name)) {
            alert("Please connect to a supported network");
            return;
        }

        try {
            const gasFee = await estimateGasFee(chain.name, "0x0000000000000000000000000000000000000000", "1000000", "0.40");
            setAmount(gasFee);
        } catch (error) {
            console.error("Error estimating gas fee:", error);
            setAmount('');
        }
    };

    return (
        <div>
            <button onClick={handleEstimateGasFee}>Estimate Gas Fee</button>
        </div>
    );
};

export default EstimateGasFeeButton;
