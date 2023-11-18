import "@nomicfoundation/hardhat-toolbox";
// import { upgrades } from 'hardhat';
import { task } from 'hardhat/config';
import { BigNumber } from "ethers";

async function deployBase(hre, taskArgs) {
    const [owner] = await ethers.getSigners();
    const Loan = await ethers.getContractFactory("Loan");
    const LoanCreditorLpTestToken = await ethers.getContractFactory("LoanCreditorLpTestToken");

    let gasLimit = BigNumber.from(0);
    let tx;

    let loan;
    if (taskArgs.loanAddress == '0') {
        loan = await Loan.deploy(taskArgs.borrowerLpAddress, taskArgs.collateralFactor, taskArgs.baseCreditorsLpAmount, taskArgs.baseCreditorsStableAmount);
        tx = await loan.deployed();
        gasLimit = gasLimit.add(tx.deployTransaction.gasLimit);
    } else {
        loan = await Loan.attach(taskArgs.loanAddress);
    }

    let loanCreditorLpToken;
    if (taskArgs.loanCreditorLpAddress == '0') {
        loanCreditorLpToken = await LoanCreditorLpTestToken.deploy(loan.address, 0);
        tx = await loanCreditorLpToken.deployed();
        gasLimit = gasLimit.add(tx.deployTransaction.gasLimit);
    } else {
        loanCreditorLpToken = await Loan.attach(taskArgs.loanCreditorLpAddress);
    }

    tx = await loan.setCreditorStableToken(taskArgs.creditorStableAddress);
    gasLimit = gasLimit.add(tx.gasLimit);
    tx = await loan.setCreditorLPToken(loanCreditorLpToken.address);
    gasLimit = gasLimit.add(tx.gasLimit);
    tx = await loan.setBorrowerLPToken(taskArgs.borrowerLpAddress);
    gasLimit = gasLimit.add(tx.gasLimit);
    // tx = await loan.setBorrowersLPData(1);
    // gasLimit = gasLimit.add(tx.gasLimit);

    return {loan, loanCreditorLpToken, owner, gasLimit};
}

task("deploy:loan", "Deploy loan contract")
    .addParam("borrowerLpAddress", "Borrowers LP token address")
    .addParam("creditorStableAddress", "Creditor stable token address")
    .addParam("loanAddress", "Loan address", "0")
    .addParam("loanCreditorLpAddress", "Creditor LP token address", "0")
    .addParam("collateralFactor", "Collateral factor amount", "50")
    .addParam("baseCreditorsLpAmount", "Base creditors LP amount", "1")
    .addParam("baseCreditorsStableAmount", "Base creditors stable amount", "1")
    .setAction(async (taskArgs, hre) => {
        let {loan, loanCreditorLpToken, owner, gasLimit} = await deployBase( hre, taskArgs );

        console.log("Deployment was done\n");
        console.log("Total gas limit: %s", gasLimit);
        console.log("Owner address: %s", owner.address);
        console.log("Loan creditor LP token address: %s", loanCreditorLpToken.address);
        console.log("Loan address: %s\n", loan.address);
    });
