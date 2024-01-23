import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import testnet_chains from "./testnet_chains.json";
import "hardhat-abi-exporter";
import * as dotenv from 'dotenv';

dotenv.config();
let priv_key: string = process.env.PRIVATE_KEY || "";

function get_networks(){
    let networks: any = {};
    for (var chain of testnet_chains) {
      networks[chain.name]={
        network_id: chain.chainId,
        accounts: [priv_key],
        url: chain.rpc
      }
    }

    networks["hardhat"]={
      chainId:1,
      mining:{
        auto: true,
        interval:1000
      }
    }

    return networks;
}

const config: HardhatUserConfig = {
  solidity:{
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 800
      }
    }
  }
};

config.networks=get_networks();

export default config;
