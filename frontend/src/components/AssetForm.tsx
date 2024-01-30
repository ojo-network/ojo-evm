import React from 'react';
import { Form } from 'react-bootstrap';

type AssetFormParameters = {
    assetNames: string[];
    setAssetNames: React.Dispatch<React.SetStateAction<string[]>>;
    selectAll: boolean;
    setSelectAll: React.Dispatch<React.SetStateAction<boolean>>;
}

const AssetForm: React.FC<AssetFormParameters> = ({ assetNames, setAssetNames, selectAll, setSelectAll }) => {
  const availableAssets = [
      "ATOM","AXL","BNB","BTC","CMDX","CMST","CRV","DAI","DOT","ETH",
      "INJ","IST","JUNO","KUJI","LINK","LUNA","MATIC","MKR","MNTA",
      "OSMO","RETH","SCRT","SEI","STARS","STATOM","STJUNO","STOSMO",
      "SUSHI","USDC","USDT","USK","WBTC","WETH","XRP"
  ];

  const handleSelectAllChange = () => {
    if (selectAll) {
      setAssetNames([]);
    } else {
      setAssetNames(availableAssets);
    }
    setSelectAll(!selectAll);
  };

  const handleSwitchChange = (asset: string) => {
    if (assetNames.includes(asset)) {
      setAssetNames(assetNames.filter(a => a !== asset));
    } else {
      setAssetNames([...assetNames, asset]);
    }
  };

  return (
    <Form>
      <Form.Check
        type="checkbox"
        id="switch-select-all"
        label="SELECT ALL"
        inline
        onChange={handleSelectAllChange}
        checked={selectAll}
      />
      {availableAssets.map((asset, index) => (
        <Form.Check
          type="checkbox"
          id={`switch-${asset}`}
          label={asset}
          inline
          key={index}
          onChange={() => handleSwitchChange(asset)}
          checked={assetNames.includes(asset)}
        />
      ))}
    </Form>
  );
};

export default AssetForm;
