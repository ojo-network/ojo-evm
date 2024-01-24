import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";

describe("Deploy OjoContract", function () {
    async function deployOjoContract() {
      // Contracts are deployed using the first signer/account by default
      const [deployer, otherAccount, axelarGateway, axelarGasReceiver] = await ethers.getSigners();

      const ojoChain = "ojoChain";
      const ojoAddress = "ojoAddress";
      const resolveWindow = 100;

      const Ojo = await ethers.getContractFactory("Ojo");
      const ojo = await Ojo.deploy(axelarGateway.address, axelarGasReceiver.address, ojoChain, ojoAddress, deployer, resolveWindow);

      return {deployer, otherAccount, ojo}
    }

    it("restricts access on onlyOwnwer methods", async function(){
        const {deployer, otherAccount, ojo} = await loadFixture(deployOjoContract);

        // check owner
        expect(await ojo.owner()).eq(deployer.address);

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

        expect(ojo.connect(deployer).updateOjoAddress("ojoAddress2")).to.be.revertedWithCustomError;
        expect(await ojo.ojoAddress()).eq("ojoAddress2");

        expect(ojo.connect(deployer).updateResolveWindow(150)).to.be.revertedWithCustomError;
        expect(await ojo.resolveWindow()).eq(150);
    })
})
