import { ethers } from "hardhat";

async function main() {
  const axelarGatewayAddress = "";
  const axelarGasReceiverAddress = "";

  const Ojo = await ethers.getContractFactory("Ojo");
  const ojo = await Ojo.deploy(axelarGatewayAddress, axelarGasReceiverAddress);

  await ojo.waitForDeployment();

  console.log(
    `Ojo deployed to ${await ojo.getAddress()}`
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
