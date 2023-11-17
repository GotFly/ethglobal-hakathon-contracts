import "@nomicfoundation/hardhat-toolbox";
// import { upgrades } from 'hardhat';
import { task } from 'hardhat/config';
import { BigNumber } from "ethers";

async function deployBase(hre, taskArgs) {
    const [owner] = await ethers.getSigners();
    const Loan = await ethers.getContractFactory("Loan");

    let gasLimit = BigNumber.from(0);
    let tx;

    const loan = await Loan.deploy(taskArgs.borrowerLpAddress, taskArgs.collateralFactor, taskArgs.baseCreditorsLpAmount, taskArgs.baseCreditorsStableAmount);
    tx = await loan.deployed();
    gasLimit = gasLimit.add(tx.deployTransaction.gasLimit);

    return {loan, owner, gasLimit};
}

task("deploy:loan", "Deploy loan contract")
    .addParam("borrowerLpAddress", "Borrowers LP token address")
    .addParam("collateralFactor", "Collateral factor amount")
    .addParam("baseCreditorsLpAmount", "Base creditors LP amount", "1")
    .addParam("baseCreditorsStableAmount", "Base creditors stable amount", "1")
    .setAction(async (taskArgs, hre) => {
        let {loan, owner, gasLimit} = await deployBase( hre, taskArgs );

        console.log("Deployment was done\n");
        console.log("Total gas limit: %s", gasLimit);
        console.log("Owner address: %s", owner.address);
        console.log("Loan address: %s\n", loan.address);
    });
