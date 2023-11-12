import { time, loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";

interface Data{
    id: number
    assetName: string,
    value: number,
    deviation: number,
    resolveTime:any,
    values: number[],
}


const generateData=function(n:number, id:number, resolveTime:any): Data[]{
    const dataArr: Data[] = [];
    for(let i=0;i<n;i++){
        const name = ethers.encodeBytes32String(`asset${i}`)
        const value = Math.floor(Math.random()*10**9)
        const deviation = Math.floor(Math.random()*10**9)
        const medians: number[] = new Array(10).fill(0);

        for (let j=0;j<10;j++){
            medians[j]=Math.floor((Math.random()*10**9))
        }
        let data={id:id,assetName:name,value:value,deviation:deviation,values:medians,resolveTime:resolveTime}
        dataArr.push(data);
    }
    return dataArr;
}


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
