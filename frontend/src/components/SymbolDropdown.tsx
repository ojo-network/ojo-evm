import React from 'react';
import { Dropdown } from 'react-bootstrap';

type AssetFormParameters = {
    symbol: string;
    setSymbol: React.Dispatch<React.SetStateAction<string>>;
}

const SymbolDropdown: React.FC<AssetFormParameters> = ({ symbol, setSymbol }) => {
  const feeTokens = ["aUSDC"];

  const handleSelectSymbol = (key: any) => {
    setSymbol(key);
  };

  return (
    <Dropdown onSelect={handleSelectSymbol}>
      <Dropdown.Toggle variant="primary" id="dropdown-basic">
        {symbol || 'Select Fee Token'}
      </Dropdown.Toggle>

      <Dropdown.Menu>
        <Dropdown.Item eventKey="">None</Dropdown.Item>
        {feeTokens.map((symbol, index) => (
          <Dropdown.Item key={index} eventKey={symbol}>{symbol}</Dropdown.Item>
        ))}
      </Dropdown.Menu>
    </Dropdown>
  );
};

export default SymbolDropdown;
