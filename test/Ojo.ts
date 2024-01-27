import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";
import {  } from "../scripts/utils";

describe("Deploy OjoContract", function() {
	async function deployOjoContract() {
		// Contracts are deployed using the first signer/account by default
		const [deployer, otherAccount, axelarGateway, axelarGasReceiver] = await ethers.getSigners();

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

		return {deployer, otherAccount, ojo}
    }

    it("restricts access on onlyOwnwer methods", async function() {
        const {deployer, otherAccount, ojo} = await loadFixture(deployOjoContract);

        // check owner
        expect(await ojo.owner()).eq(await deployer.getAddress());

        // owner can update ojoChain, ojoAddress, and resolveWindow
        await ojo.connect(deployer).updateOjoChain("ojoChain2");
        expect(await ojo.ojoChain()).eq("ojoChain2");

        await ojo.connect(deployer).updateOjoAddress("ojoAddress2");
        expect(await ojo.ojoAddress()).eq("ojoAddress2");

        await ojo.connect(deployer).updateResolveWindow(150);
        expect(await ojo.resolveWindow()).eq(150);

        // other account cannot update ojoChain, ojoAddress, and resolveWindow
        expect(ojo.connect(otherAccount).updateOjoChain("ojoChain3")).to.be.revertedWithCustomError;
        expect(await ojo.ojoChain()).eq("ojoChain2");

        expect(ojo.connect(otherAccount).updateOjoAddress("ojoAddress3")).to.be.revertedWithCustomError;
        expect(await ojo.ojoAddress()).eq("ojoAddress2");

        expect(ojo.connect(otherAccount).updateResolveWindow(200)).to.be.revertedWithCustomError;
        expect(await ojo.resolveWindow()).eq(150);
    })
})
