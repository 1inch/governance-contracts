const { getChainId } = require('hardhat');

module.exports = async ({ getNamedAccounts, deployments }) => {
    console.log('running deploy script');
    console.log('network id ', await getChainId());

    const { deploy } = deployments;
    const { deployer } = await getNamedAccounts();

    const governanceMothership = await deployments.get('GovernanceMothership');
    console.log(governanceMothership.address);
    const exchangeGovernance = await deploy('ExchangeGovernance', {
        args: [governanceMothership.address],
        from: deployer,
        skipIfAlreadyDeployed: true,
    });

    console.log('ExchangeGovernance deployed to:', exchangeGovernance.address);
};
