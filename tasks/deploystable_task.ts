import "@nomicfoundation/hardhat-toolbox";
// import { upgrades } from 'hardhat';
import { task } from 'hardhat/config';
import { BigNumber } from "ethers";

async function deployBase(hre, taskArgs) {
    const [owner] = await ethers.getSigners();
    const LoanCreditorStableTestToken = await ethers.getContractFactory("LoanCreditorStableTestToken");

    let gasLimit = BigNumber.from(0);
    let tx;

    const loanCreditorStableToken = await LoanCreditorStableTestToken.deploy(taskArgs.totalSupply);
    tx = await loanCreditorStableToken.deployed();
    gasLimit = gasLimit.add(tx.deployTransaction.gasLimit);

    return {loanCreditorStableToken, owner, gasLimit};
}

task("deploy:stable", "Deploy stable contract")
    .addParam("totalSupply", "Total stable coin supply")
    .setAction(async (taskArgs, hre) => {
        let {loanCreditorStableToken, owner, gasLimit} = await deployBase( hre, taskArgs );

        console.log("Deployment was done\n");
        console.log("Total gas limit: %s", gasLimit);
        console.log("Owner address: %s", owner.address);
        console.log("Loan stable token address: %s\n", loanCreditorStableToken.address);
    });
