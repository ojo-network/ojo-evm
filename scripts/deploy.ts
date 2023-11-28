import { ethers } from "hardhat";

async function main() {
  const axelarGatewayAddress = "0xe432150cce91c13a887f7D836923d5597adD8E31"; // Goerli Testnet Address
  const axelarGasReceiverAddress = "0xbE406F0189A0B4cf3A05C286473D23791Dd44Cc6"; // Goerli Testnet Address
  const ojoChain = "";
  const ojoAddress = "";
  const resolveWindow = 1800

  const Ojo = await ethers.getContractFactory("Ojo");
  const ojo = await Ojo.deploy(axelarGatewayAddress, axelarGasReceiverAddress, ojoChain, ojoAddress, resolveWindow);
  await ojo.waitForDeployment();
  const ojoContractddress = await ojo.getAddress();

  const MockOjo = await ethers.getContractFactory("MockOjoContract");
  const mockOjo = await MockOjo.deploy(ojoContractddress);
  await mockOjo.waitForDeployment();
  const mockOjoContractddress = await mockOjo.getAddress();

  console.log(
    `Ojo deployed to ${ojoContractddress}\n`,
    `MockOjo deployed to ${mockOjoContractddress}`
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
