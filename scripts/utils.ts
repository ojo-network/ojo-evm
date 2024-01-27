import { AbiCoder, ethers } from "ethers";
import Create2Deployer from '@axelar-network/axelar-gmp-sdk-solidity/artifacts/contracts/deploy/Create2Deployer.sol/Create2Deployer.json';
import IUpgradable from '@axelar-network/axelar-gmp-sdk-solidity/artifacts/contracts/interfaces/IUpgradable.sol/IUpgradable.json';

async function deployCreate2InitUpgradable(
    create2DeployerAddress: any,
    wallet: ethers.Wallet,
    implementationJson: { abi: ethers.Interface | ethers.InterfaceAbi; bytecode: ethers.BytesLike | { object: string; }; },
    proxyJson: { abi: ethers.Interface | ethers.InterfaceAbi; bytecode: ethers.BytesLike | { object: string; }; },
    implementationConstructorArgs: any,
    setupParams = '0x',
    key = Date.now(),
) {
    const implementationFactory = new ethers.ContractFactory(implementationJson.abi, implementationJson.bytecode, wallet);

    const implementation = await implementationFactory.deploy(...implementationConstructorArgs);
    await implementation.waitForDeployment();

    const proxy = await create2DeployAndInitContract(
        create2DeployerAddress,
        wallet,
        proxyJson,
        key,
        [await implementation.getAddress(), wallet.address, setupParams]
    );

    return new ethers.Contract(await proxy.getAddress(), implementationJson.abi, wallet);
}

async function create2DeployAndInitContract (
    deployerAddress: any,
    wallet: ethers.Wallet,
    contractJson: { bytecode: any | ethers.Overrides; abi: ethers.Interface | ethers.InterfaceAbi; },
    key: number,
    initArgs: any,
    confirmations = null,
) {
    const deployer = new ethers.Contract(deployerAddress, Create2Deployer.abi, wallet);
    const salt = ethers.keccak256(AbiCoder.defaultAbiCoder().encode(['string'], [key.toString()]));
    const address = await deployer.deployedAddress(contractJson.bytecode, wallet.address, salt);
    const contract = new ethers.Contract(address, contractJson.abi, wallet);
    const initData = (await contract.init.populateTransaction(...initArgs)).data;

    const tx = await deployer.deployAndInit(contractJson.bytecode, salt, initData);
    await tx.wait(confirmations);

    return contract;
};

async function upgradeUpgradable(
    proxyAddress: any,
    wallet: ethers.Wallet,
    contractJson: { bytecode: any | ethers.Overrides; abi: ethers.Interface | ethers.InterfaceAbi; },
    implementationConstructorArgs: any,
    setupParams = '0x'
) {
    const proxy = new ethers.Contract(proxyAddress, IUpgradable.abi, wallet);

    const implementationFactory = new ethers.ContractFactory(contractJson.abi, contractJson.bytecode, wallet);

    const implementation = await implementationFactory.deploy(...implementationConstructorArgs);
    await implementation.waitForDeployment();

    const implementationCode = await wallet.provider!.getCode(await implementation.getAddress());
    const implementationCodeHash = ethers.keccak256(implementationCode);

    const tx = await proxy.upgrade(await implementation.getAddress(), implementationCodeHash, setupParams);
    await tx.wait();

    return tx;
}

module.exports = {
    deployCreate2InitUpgradable,
    upgradeUpgradable,
};
