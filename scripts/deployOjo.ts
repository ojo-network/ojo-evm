import { ethers } from "hardhat";

async function main() {
  const axelarGatewayAddress = "0xe432150cce91c13a887f7D836923d5597adD8E31";
  const axelarGasReceiverAddress = "0xbE406F0189A0B4cf3A05C286473D23791Dd44Cc6";
  const ojoChain = "";
  const ojoAddress = "";
  const resolveWindow = 1800

  const Ojo = await ethers.getContractFactory("Ojo");
  const ojo = await Ojo.deploy(axelarGatewayAddress, axelarGasReceiverAddress, ojoChain, ojoAddress, resolveWindow);
  await ojo.waitForDeployment();

  console.log(
    `Ojo deployed to ${await ojo.getAddress()}\n`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
