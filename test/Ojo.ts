import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";

describe("Deploy OjoContract", function () {
	async function deployOjoContract() {
		// Contracts are deployed using the first signer/account by default
		const [deployer, otherAccount, axelarGateway, axelarGasReceiver] = await ethers.getSigners();

		const Ojo = await ethers.getContractFactory("Ojo");
		const ojoImplementation = await Ojo.deploy(axelarGateway.address, axelarGasReceiver.address);

		const ojoChain = "ojoChain";
		const ojoAddress = "ojoAddress";
		const resolveWindow = 100;
		const initParams = ethers.utils.defaultAbiCoder.encode(["string", "string", "uint256"],[ojoChain, ojoAddress, resolveWindow]);

		const OjoProxy = await ethers.getContractFactory("OjoProxy");
		const ojoProxy = await OjoProxy.deploy();
		ojoProxy.init(ojoImplementation.address, deployer.address, initParams);

		return {deployer, otherAccount, ojoProxy, ojoImplementation}
    }

    it("restricts access on onlyOwnwer methods", async function(){
        const {deployer, otherAccount, ojoProxy, ojoImplementation} = await loadFixture(deployOjoContract);
		const ojo = ojoProxy.attach(ojoImplementation.address);

        // check owner
        expect(await ojo.owner()).eq(deployer.address);

        // owner can update ojoChain, ojoAddress, and resolveWindow
        await ojo.connect(deployer.address).updateOjoChain("ojoChain2");
        expect(await ojo.ojoChain()).eq("ojoChain2");

        await ojo.connect(deployer.address).updateOjoAddress("ojoAddress2");
        expect(await ojo.ojoAddress()).eq("ojoAddress2");

        await ojo.connect(deployer.address).updateResolveWindow(150);
        expect(await ojo.resolveWindow()).eq(150);

        // other account cannot update ojoChain, ojoAddress, and resolveWindow
        expect(ojo.connect(otherAccount.address).updateOjoChain("ojoChain3")).to.be.revertedWithCustomError;
        expect(await ojo.ojoChain()).eq("ojoChain2");

        expect(ojo.connect(deployer.address).updateOjoAddress("ojoAddress2")).to.be.revertedWithCustomError;
        expect(await ojo.ojoAddress()).eq("ojoAddress2");

        expect(ojo.connect(deployer.address).updateResolveWindow(150)).to.be.revertedWithCustomError;
        expect(await ojo.resolveWindow()).eq(150);
    })
})
