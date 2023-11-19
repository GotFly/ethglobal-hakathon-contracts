import "@nomicfoundation/hardhat-toolbox";
import { task } from 'hardhat/config';
import { BigNumber } from "ethers";

async function deployBase(hre, taskArgs) {
    const [owner] = await ethers.getSigners();
    const Loan = await ethers.getContractFactory("Loan");
    const LoanCreditorLpTestToken = await ethers.getContractFactory("LoanCreditorLpTestToken");
    const LoanExchanger = await ethers.getContractFactory(taskArgs.isTestnet == "0" ? "LoanExchanger" : "LoanExchangerTest");

    let gasLimit = BigNumber.from(0);
    let tx;

    let loan;
    if (taskArgs.loanAddress == '0') {
        loan = await Loan.deploy(taskArgs.baseBorrowerLpToken, taskArgs.collateralFactor, taskArgs.baseCreditorsLpAmount, taskArgs.baseCreditorsStableAmount);
        tx = await loan.deployed();
        gasLimit = gasLimit.add(tx.deployTransaction.gasLimit);
    } else {
        loan = await Loan.attach(taskArgs.loanAddress);
    }
    console.log("Loan address: %s", loan.address);

    let loanCreditorLpToken;
    if (taskArgs.loanCreditorLpAddress == '0') {
        loanCreditorLpToken = await LoanCreditorLpTestToken.deploy(loan.address, 0);
        tx = await loanCreditorLpToken.deployed();
        gasLimit = gasLimit.add(tx.deployTransaction.gasLimit);
    } else {
        loanCreditorLpToken = await Loan.attach(taskArgs.loanCreditorLpAddress);
    }
    console.log("Loan creditor LP token address: %s", loanCreditorLpToken.address);

    let loanExchanger;
    if (taskArgs.loanExchangerAddress == '0') {
        if (taskArgs.isTestnet == "0") {
            loanExchanger = await LoanExchanger.deploy(
                taskArgs.borrowerPullToken, taskArgs.borrowerPullId, taskArgs.baseBorrowerLpToken,
                taskArgs.oneInch, taskArgs.baseStableCoin, loan.address
            );
        } else {
            loanExchanger = await LoanExchanger.deploy(
                taskArgs.borrowerPullToken,
                taskArgs.baseStableCoin,
                loan.address,
                1000000000,
                1000000000
            );
        }
        tx = await loanExchanger.deployed();
        gasLimit = gasLimit.add(tx.deployTransaction.gasLimit);
    } else {
        loanExchanger = await Loan.attach(taskArgs.loanExchangerAddress);
    }
    console.log("Loan exchanger address: %s", loanExchanger.address);

    tx = await loan.setCreditorStableToken(taskArgs.baseStableCoin);
    console.log("Creditor stable token set successfully. Hash: %s", tx.hash);
    gasLimit = gasLimit.add(tx.gasLimit);
    await new Promise(f => setTimeout(f, 5000));
    tx = await loan.setCreditorLPToken(loanCreditorLpToken.address);
    console.log("Creditor LP token set successfully. Hash: %s", tx.hash);
    gasLimit = gasLimit.add(tx.gasLimit);
    await new Promise(f => setTimeout(f, 5000));
    tx = await loan.setBorrowerLPToken(taskArgs.baseBorrowerLpToken);
    console.log("Borrower LP token set successfully. Hash: %s", tx.hash);
    gasLimit = gasLimit.add(tx.gasLimit);
    await new Promise(f => setTimeout(f, 5000));
    tx = await loan.setCreditorProfitInPercent(taskArgs.creditorProfitInPercent);
    console.log("Borrower profit percent set successfully. Hash: %s", tx.hash);
    gasLimit = gasLimit.add(tx.gasLimit);
    await new Promise(f => setTimeout(f, 5000));
    tx = await loan.setLoanExchanger(loanExchanger.address);
    console.log("Loan exchanger set successfully. Hash: %s", tx.hash);
    gasLimit = gasLimit.add(tx.gasLimit);

    return {loan, loanCreditorLpToken, loanExchanger, owner, gasLimit};
}

task("deploy:loan", "Deploy loan contract")
    // .addParam("borrowerLpAddress", "Borrowers LP token address")
    .addParam("loanAddress", "Loan address", "0")
    .addParam("loanExchangerAddress", "Loan exchanger address", "0")
    .addParam("loanCreditorLpAddress", "Creditor LP token address", "0")

    .addParam("borrowerPullToken", "Borrower pull token address (arb mainnet by default)", "0x912ce59144191c1204e64559fe8253a0e49e6548")
    .addParam("borrowerPullId", "Borrower pull ID (arb mainnet by default)", "1047994001016932596196533293007138696575972306487")
    .addParam("baseBorrowerLpToken", "Beefy vault address (arb mainnet by default)", "0x1512fd4d1bcc7959eefd1672116d9e41cdcbc688")
    .addParam("oneInch", "1inch address (arb mainnet by default)", "0x1111111254eeb25477b68fb85ed929f73a960582")
    .addParam("baseStableCoin", "Base system stable coin (arb mainnet by default)", "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9")

    .addParam("collateralFactor", "Collateral factor amount", "60")
    .addParam("creditorProfitInPercent", "Creditor profit in percent", "65")
    .addParam("baseCreditorsLpAmount", "Base creditors LP amount", "1")
    .addParam("baseCreditorsStableAmount", "Base creditors stable amount", "1")
    .addParam("isTestnet", "Is deploy in testnet", "0")
    .setAction(async (taskArgs, hre) => {
        let {loan, loanCreditorLpToken, loanExchanger, owner, gasLimit} = await deployBase( hre, taskArgs );

        console.log("Deployment was done\n");
        console.log("Total gas limit: %s", gasLimit);
        console.log("Owner address: %s", owner.address);
        console.log("Loan creditor stable token address: %s", taskArgs.baseStableCoin);
        console.log("Loan creditor LP token address: %s", loanCreditorLpToken.address);
        console.log("Loan borrower LP token address: %s", taskArgs.baseBorrowerLpToken);
        console.log("Loan exchanger address: %s", loanExchanger.address);
        console.log("Loan address: %s\n", loan.address);
    });
