const hre = require('hardhat');
const { getChainId, ethers } = hre;

const OWNER = '0x910bf2d50fA5e014Fd06666f456182D4Ab7c8bd2';

module.exports = async ({ deployments }) => {
    console.log('running deploy script');
    console.log('network id ', await getChainId());

    const GovernanceMothership = await ethers.getContractFactory('GovernanceMothership');

    const governanceMothership = GovernanceMothership.attach(await deployments.get('GovernanceMothership').address);

    const transferOwnershipTxn = await governanceMothership.transferOwnership(OWNER);
    await transferOwnershipTxn.wait();
};

module.exports.skip = async () => true;
