import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";

describe("Deploy OjoContract", function() {
	async function deployOjoContract() {
		// Contracts are deployed using the first signer/account by default
		const [deployer, otherAccount, axelarGateway, axelarGasReceiver] = await ethers.getSigners();

		const Ojo = await ethers.getContractFactory("Ojo");
		const ojoImplementation = await Ojo.deploy(axelarGateway.address, axelarGasReceiver.address);

		const ojoChain = "ojoChain";
		const ojoAddress = "ojoAddress";
		const resolveWindow = 100;
        const assetLimit = 5;
		const initParams = ethers.AbiCoder.defaultAbiCoder().encode(["string", "string", "uint256", "uint16"],[ojoChain, ojoAddress, resolveWindow, assetLimit]);

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

        await ojo.connect(deployer).updateAssetLimit(10);
        expect(await ojo.assetLimit()).eq(10);

        // other account cannot update ojoChain, ojoAddress, resolveWindow, and assetLimit
        await expect(ojo.connect(otherAccount).updateOjoChain("ojoChain3")).to.be.revertedWithCustomError(ojo, "NotOwner");
        expect(await ojo.ojoChain()).eq("ojoChain2");

        await expect(ojo.connect(otherAccount).updateOjoAddress("ojoAddress3")).to.be.revertedWithCustomError(ojo, "NotOwner");
        expect(await ojo.ojoAddress()).eq("ojoAddress2");

        await expect(ojo.connect(otherAccount).updateResolveWindow(200)).to.be.revertedWithCustomError(ojo, "NotOwner");
        expect(await ojo.resolveWindow()).eq(150);

        await expect(ojo.connect(otherAccount).updateAssetLimit(20)).to.be.revertedWithCustomError(ojo, "NotOwner");
        expect(await ojo.assetLimit()).eq(10);
    })

    it("reverts when trying to relay more than 5 assets at once", async function() {
        const {deployer, ojo} = await loadFixture(deployOjoContract);

        const assets = ["ATOM", "BTC", "ETH", "BNB", "USDC", "MATIC"];
        const assetNames = assets.map(name => ethers.encodeBytes32String(name));

        await expect(ojo.connect(deployer).callContractMethodWithOjoPriceData(
            assetNames,
            ethers.ZeroAddress,
            '0x00000000',
            '0x',
            {value: ethers.parseEther("0")}
            )).to.be.revertedWith("Number of assets requested is over limit");

        await expect(ojo.connect(deployer).callContractMethodWithOjoPriceDataAndToken(
            assetNames,
            ethers.ZeroAddress,
            '0x00000000',
            '0x',
            '',
            0,
            {value: ethers.parseEther("0")}
            )).to.be.revertedWith("Number of assets requested is over limit");
    })
})
