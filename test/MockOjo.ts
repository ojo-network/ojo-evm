import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";

describe("Deploy", function () {
    async function deployMockOjoContract() {
		// Contracts are deployed using the first signer/account by default
		const [deployer, axelarGateway, axelarGasReceiver] = await ethers.getSigners();

		const Ojo = await ethers.getContractFactory("Ojo");
		const ojo = await Ojo.deploy(axelarGateway.address, axelarGasReceiver.address);

		const MockOjo = await ethers.getContractFactory("MockOjo");
		const mockOjo = await MockOjo.deploy(ojo.address);

		return {deployer, mockOjo, ojo}
    }


    it("sets address of ojo contract correctly", async function(){
        const { mockOjo, ojo} = await loadFixture(deployMockOjoContract);

        expect(await mockOjo.ojo()).eq(ojo.address);
    })
})
