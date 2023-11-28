import { ethers } from "hardhat";

async function main() {
  const ojoContractddress = "";

  const MockOjo = await ethers.getContractFactory("MockOjoContract");
  const mockOjo = await MockOjo.deploy(ojoContractddress);
  await mockOjo.waitForDeployment();

  console.log(
    `MockOjo deployed to ${await mockOjo.getAddress()}`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
