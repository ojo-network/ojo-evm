import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";

describe("Deploy", function () {
    async function deployMockOjoContract() {
		// Contracts are deployed using the first signer/account by default
		const [deployer, axelarGateway, axelarGasReceiver] = await ethers.getSigners();

		const Ojo = await ethers.getContractFactory("Ojo");
		const ojoImplementation = await Ojo.deploy(axelarGateway.address, axelarGasReceiver.address);

		const ojoChain = "ojoChain";
		const ojoAddress = "ojoAddress";
		const resolveWindow = 100;
		const initParams = ethers.AbiCoder.defaultAbiCoder().encode(["string", "string", "uint256"],[ojoChain, ojoAddress, resolveWindow]);

		const OjoProxy = await ethers.getContractFactory("OjoProxy");
		const ojoProxy = await OjoProxy.deploy();

		ojoProxy.init(await ojoImplementation.getAddress(), await deployer.getAddress(), initParams);

		const ojoContract = ojoImplementation.attach(await ojoProxy.getAddress());
		const ojo = await ethers.getContractAt("Ojo", await ojoContract.getAddress())

		const MockOjo = await ethers.getContractFactory("MockOjo");
		const mockOjo = await MockOjo.deploy(await ojo.getAddress());

		return {deployer, mockOjo, ojo}
    }


    it("sets address of ojo contract correctly", async function(){
        const { mockOjo, ojo} = await loadFixture(deployMockOjoContract);

        expect(await mockOjo.ojo()).eq(await ojo.getAddress());
    })
})
