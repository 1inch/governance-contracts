const hre = require('hardhat');
const { getChainId, ethers } = hre;
const { ether } = require('@openzeppelin/test-helpers');

const OWNER = '0x910bf2d50fA5e014Fd06666f456182D4Ab7c8bd2';

module.exports = async ({ getNamedAccounts, deployments }) => {
    console.log('running deploy script');
    console.log('network id ', await getChainId());

    const { deploy } = deployments;
    const { deployer } = await getNamedAccounts();

    const TokenMock = await ethers.getContractFactory('TokenMock');
    const GovernanceMothership = await ethers.getContractFactory('GovernanceMothership');
    const GovernanceRewards = await ethers.getContractFactory('GovernanceRewards');

    const tokenMockDeployment = await deploy('TokenMock', {
        args: ['BOOM', 'BOOM'],
        from: deployer,
        skipIfAlreadyDeployed: true,
    });
    console.log('BOOM Token deployed to:', tokenMockDeployment.address);

    const governanceMothershipDeployment = await deploy('GovernanceMothership', {
        args: [tokenMockDeployment.address],
        from: deployer,
        skipIfAlreadyDeployed: true,
    });
    console.log('GovernanceMothership deployed to:', governanceMothershipDeployment.address);

    const exchangeGovernanceDeployment = await deploy('ExchangeGovernance', {
        args: [governanceMothershipDeployment.address],
        from: deployer,
        skipIfAlreadyDeployed: true,
    });
    console.log('ExchangeGovernance deployed to:', exchangeGovernanceDeployment.address);

    const governanceRewardsDeployment = await deploy('GovernanceRewards', {
        args: [tokenMockDeployment.address, governanceMothershipDeployment.address],
        from: deployer,
        skipIfAlreadyDeployed: true,
    });
    console.log('GovernanceRewards deployed to:', governanceRewardsDeployment.address);

    const tokenMock = TokenMock.attach(tokenMockDeployment.address);
    const governanceMothership = GovernanceMothership.attach(governanceMothershipDeployment.address);
    const governanceRewards = GovernanceRewards.attach(governanceRewardsDeployment.address);

    const addExchangeGovernanceTxn = await governanceMothership.addModule(exchangeGovernanceDeployment.address);
    const addGovernanceRewardsTxn = await governanceMothership.addModule(governanceRewards.address);
    const setRewardDistributionTxn = await governanceRewards.setRewardDistribution(OWNER);
    const mintTx = await tokenMock.mint(deployer, ether('1500000000').toString());

    await Promise.all([
        addExchangeGovernanceTxn.wait(),
        addGovernanceRewardsTxn.wait(),
        setRewardDistributionTxn.wait(),
        mintTx.wait(),
    ]);

    const transferOwnershipTxn = await governanceRewards.transferOwnership(OWNER);
    await transferOwnershipTxn.wait();

    await hre.run('verify:verify', {
        address: tokenMockDeployment.address,
        constructorArguments: ['BOOM', 'BOOM'],
    });

    await hre.run('verify:verify', {
        address: governanceMothershipDeployment.address,
        constructorArguments: [tokenMockDeployment.address],
    });

    await hre.run('verify:verify', {
        address: exchangeGovernanceDeployment.address,
        constructorArguments: [governanceMothershipDeployment.address],
    });

    await hre.run('verify:verify', {
        address: governanceRewardsDeployment.address,
        constructorArguments: [tokenMockDeployment.address, governanceMothershipDeployment.address],
    });
};

module.exports.skip = async () => true;
