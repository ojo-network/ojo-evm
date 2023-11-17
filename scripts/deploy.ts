import { ethers } from "hardhat";

async function main() {
  const axelarGatewayAddress = "0xe432150cce91c13a887f7D836923d5597adD8E31"; // Goerli Testnet Address
  const axelarGasReceiverAddress = "0xbE406F0189A0B4cf3A05C286473D23791Dd44Cc6"; // Goerli Testnet Address
  const ojoChain = "";
  const ojoAddress = "";


  const Ojo = await ethers.getContractFactory("Ojo");
  const ojo = await Ojo.deploy(axelarGatewayAddress, axelarGasReceiverAddress, ojoChain, ojoAddress);

  await ojo.waitForDeployment();

  console.log(
    `Ojo deployed to ${await ojo.getAddress()}`
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
