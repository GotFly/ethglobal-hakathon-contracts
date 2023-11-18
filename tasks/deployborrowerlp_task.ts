import "@nomicfoundation/hardhat-toolbox";
// import { upgrades } from 'hardhat';
import { task } from 'hardhat/config';
import { BigNumber } from "ethers";

async function deployBase(hre, taskArgs) {
    const [owner] = await ethers.getSigners();
    const LoanBorrowerLpTestToken = await ethers.getContractFactory("LoanBorrowerLpTestToken");

    let gasLimit = BigNumber.from(0);
    let tx;

    const loanBorrowerLpToken = await LoanBorrowerLpTestToken.deploy(taskArgs.manipulator, taskArgs.totalSupply);
    tx = await loanBorrowerLpToken.deployed();
    gasLimit = gasLimit.add(tx.deployTransaction.gasLimit);

    return {loanBorrowerLpToken, owner, gasLimit};
}

task("deploy:borrowerLP", "Deploy borrower LP contract")
    .addParam("manipulator", "LP token manipulator")
    .addParam("totalSupply", "Total stable coin supply")
    .setAction(async (taskArgs, hre) => {
        let {loanBorrowerLpToken, owner, gasLimit} = await deployBase( hre, taskArgs );

        console.log("Deployment was done\n");
        console.log("Total gas limit: %s", gasLimit);
        console.log("Owner address: %s", owner.address);
        console.log("Loan borrower LP token address: %s\n", loanBorrowerLpToken.address);
    });
