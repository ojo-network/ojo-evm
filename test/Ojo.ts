import { time, loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { FallbackFragment, ParamType } from "ethers";
import { ethers } from "hardhat";

interface MedianData {
    blockNums: number[];
    medians: number[];
    deviations: number[];
}

interface PriceData {
    assetName: string;
    price: number;
    resolveTime: number;
    medianData: MedianData;
}

const generateData=function(n:number, resolveTime:any): [PriceData[], string[]] {
    let priceData: PriceData[] = [];
    let assetNames: string[] = [];
    for(let i = 0; i < n; i++){
        const name = ethers.encodeBytes32String(`asset${i}`)
        const value = Math.floor(Math.random()*10**9)

        assetNames.push(name);
        let data: PriceData ={
            assetName: name,
            price: value,
            resolveTime: resolveTime,
            medianData: {
                blockNums: [100, 120, 140, 160, 180],
                medians: [0, 0, 0, 0, 0],
                deviations: [0, 0, 0, 0, 0],
            },
        }
        priceData.push(data);
    }
    return [priceData, assetNames];
}

// TODO: Get mock axelar setup to work to finish implementing test.
describe("Deploy OjoContract", function () {
    async function deployOjoContract() {
      // Contracts are deployed using the first signer/account by default
      const [deployer, axelarGasReceiver, authModule, tokenDeployer, dummyAddress] = await ethers.getSigners();

      const ojoChain = "ojoChain"
      const ojoAddress = "ojoAddress"

      const mockGatewayArtifact = require("~/ojo-evm/artifacts/contracts/test-util/MockGateway.sol/MockAxelarGateway.json");

      const MockGateway = await ethers.getContractFactory(mockGatewayArtifact.abi, mockGatewayArtifact.bytecode);
      const mockGateway = await MockGateway.deploy(authModule.address, tokenDeployer.address)

      const AxelarExecutable = await ethers.getContractFactory("AxelarExecutable");
      const axelarExecutable = await AxelarExecutable.deploy(await mockGateway.getAddress());

      const Ojo = await ethers.getContractFactory("Ojo");
      const ojo = await Ojo.deploy(await mockGateway.getAddress(), axelarGasReceiver.address, ojoChain, ojoAddress);

      return {deployer, mockGateway, axelarExecutable, ojo, ojoChain, ojoAddress, dummyAddress}
    }

    it("posts price data to the ojo contract", async function(){
        const {deployer, mockGateway, axelarExecutable, ojo, ojoChain, ojoAddress, dummyAddress} = await loadFixture(deployOjoContract);

        const blockNumber = await ethers.provider.getBlockNumber();
        const block = await ethers.provider.getBlock(blockNumber);
        const resolveTime = block.timestamp + 60;

        const [priceData, assetNames] = generateData(3, resolveTime);

        const medianDataType = ethers.ParamType.from({
            name: "medianData",
            type: "tuple",
            components: [
                { name: "blockNums", type: "uint256[]" },
                { name: "medians", type: "uint256[]" },
                { name: "deviations", type: "uint256[]" }
            ]
        });

        const priceDataType = ethers.ParamType.from({
            name: "_priceData",
            type: "tuple[]",
            components: [
                { name: "assetName", type: "bytes32" },
                { name: "price", type: "uint256" },
                { name: "resolveTime", type: "uint256" },
                medianDataType
            ]
        });

        let encodedPriceData = ethers.AbiCoder.defaultAbiCoder().encode([priceDataType], [priceData]);

        const commandHash = ethers.keccak256(ethers.toUtf8Bytes(""));
        const commandSelector = commandHash.substring(0, 10);
        const commandParams = ethers.toUtf8Bytes("");

        const payload = ethers.AbiCoder.defaultAbiCoder().encode(
            ['bytes', 'bytes32[]', 'address', 'bytes4', 'bytes'],
            [encodedPriceData, assetNames, dummyAddress.address, commandSelector, commandParams],
        );

        // await axelarExecutable.execute(commandHash, ojoChain, await ojo.getAddress(), payload);

        // const _priceData = await ojo.getPriceDataBulk(assetNames);
        // console.log("data", _priceData);
    })
})
