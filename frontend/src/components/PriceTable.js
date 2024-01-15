import React from 'react';
import { Table } from 'react-bootstrap';
import { ethers } from 'ethers';

const PriceTable = ({ priceData }) => {
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  });

  return (
    <Table striped bordered hover>
      <thead>
        <tr>
          <th>Asset</th>
          <th>Price</th>
          <th>Timestamp</th>
        </tr>
      </thead>
      <tbody>
        {priceData.map((data, index) => (
          <tr key={index}>
            <td>{ ethers.decodeBytes32String(data.assetName) }</td>
            <td>{ formatter.format(Number(data.price) / 1000000000) }</td>
            <td>{ new Date(Number(data.resolveTime) * 1000).toLocaleString() }</td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
};

export default PriceTable;
