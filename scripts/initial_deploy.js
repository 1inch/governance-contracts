const { ether } = require('@openzeppelin/test-helpers');

const OWNER = '0x7e11a8887A2c445883AcC453738635bC3aCDAdb6';

async function main () {
    const signer = (await ethers.getSigners())[0]; // eslint-disable-line no-undef

    const TokenMock = await ethers.getContractFactory('TokenMock-ovm'); // eslint-disable-line no-undef
    const GovernanceMothership = await ethers.getContractFactory('GovernanceMothership-ovm'); // eslint-disable-line no-undef
    const ExchangeGovernance = await ethers.getContractFactory('ExchangeGovernance-ovm'); // eslint-disable-line no-undef
    const GovernanceRewards = await ethers.getContractFactory('GovernanceRewards-ovm'); // eslint-disable-line no-undef

    const tokenMock = await TokenMock.deploy('BOOM', 'BOOM');
    await tokenMock.deployTransaction.wait();
    console.log('BOOM Token deployed to:', tokenMock.address);

    const governanceMothership = await GovernanceMothership.deploy(tokenMock.address);
    const exchangeGovernance = await ExchangeGovernance.deploy(governanceMothership.address);
    const governanceRewards = await GovernanceRewards.deploy(tokenMock.address, governanceMothership.address);
    await Promise.all([
        governanceMothership.deployTransaction.wait(),
        exchangeGovernance.deployTransaction.wait(),
        governanceRewards.deployTransaction.wait(),
    ]);
    console.log('GovernanceMothership deployed to:', governanceMothership.address);
    console.log('ExchangeGovernance deployed to:', exchangeGovernance.address);
    console.log('GovernanceRewards deployed to:', governanceRewards.address);

    const addExchangeGovernanceTxn = await governanceMothership.addModule(exchangeGovernance.address);
    const addGovernanceRewardsTxn = await governanceMothership.addModule(governanceRewards.address);
    const setRewardDistributionTxn = await governanceRewards.setRewardDistribution(OWNER);
    const mintTx = await tokenMock.mint(signer.address, ether('1500000000').toString());

    await Promise.all([
        addExchangeGovernanceTxn.wait(),
        addGovernanceRewardsTxn.wait(),
        setRewardDistributionTxn.wait(),
        mintTx.wait(),
    ]);

    const transferOwnershipTxn = await governanceRewards.transferOwnership(OWNER);
    await transferOwnershipTxn.wait();

    console.log(
        'Do not forget to governanceMothership.transferOwnership(OWNER), where:\n' +
        ` - governanceMothership = ${governanceMothership.address}\n` +
        ` - OWNER = ${OWNER}\n` +
        ` - governanceMothership.owner() = ${await governanceMothership.owner()}\n`,
    );

    const balance = await tokenMock.balanceOf(signer.address);
    console.log(balance.toString());
}

main().then(() => process.exit(0)).catch(error => {
    console.error(error);
    process.exit(1);
});
