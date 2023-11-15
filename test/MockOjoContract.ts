import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";


describe("Deploy", function () {
    async function deployMockOjoContract() {
      // Contracts are deployed using the first signer/account by default
      const [deployer, axelarGateway, axelarGasReceiver] = await ethers.getSigners();

      const ojoChain = "ojoChain"
      const ojoAddress = "ojoAddress"

      const Ojo = await ethers.getContractFactory("Ojo");
      const ojo = await Ojo.deploy(axelarGateway.address, axelarGasReceiver.address, ojoChain, ojoAddress);

      const MockOjoContract = await ethers.getContractFactory("MockOjoContract");
      const mockOjoContract = await MockOjoContract.deploy(await ojo.getAddress())

      return {deployer, mockOjoContract, ojo}
    }


    it("check address of ojo contract is correct", async function(){
        const {deployer, mockOjoContract, ojo} = await loadFixture(deployMockOjoContract);

        expect(await mockOjoContract.ojo()).eq(await ojo.getAddress())
    })
})
