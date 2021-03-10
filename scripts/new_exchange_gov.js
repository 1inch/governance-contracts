const { ethers } = require("hardhat");
// const hre = require("hardhat");

const GOVERNANCE_MOTHERSHIP = '0xA0446D8804611944F1B527eCD37d7dcbE442caba';

async function main () {
    const ExchangeGovernance = await ethers.getContractFactory('ExchangeGovernance'); // eslint-disable-line no-undef
    const exchangeGovernance = await ExchangeGovernance.deploy(GOVERNANCE_MOTHERSHIP);
    await exchangeGovernance.deployTransaction.wait();
    console.log('ExchangeGovernance deployed to:', exchangeGovernance.address);

    // await hre.run("verify:verify", {
    //     address: exchangeGovernance.address,
    //     constructorArguments: [GOVERNANCE_MOTHERSHIP],
    // });
}

main().then(() => process.exit(0)).catch(error => {
    console.error(error);
    process.exit(1);
});
