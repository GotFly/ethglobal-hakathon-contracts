const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { expect } = require("chai");
import {
    LoanBorrowerLpTestToken__factory,
    LoanCreditorLpTestToken__factory,
    LoanCreditorStableTestToken__factory,
    Loan__factory,
} from "../typechain-types";

const baseCollateralFactor = 50; //50%

describe("Loan test", function () {
    async function deployContractsFixture() {
        const [owner, creditor1, creditor2, borrower1, borrower2] = await ethers.getSigners();
        const LoanBorrowerLpTestToken = await ethers.getContractFactory("LoanBorrowerLpTestToken");
        const LoanCreditorLpTestToken = await ethers.getContractFactory("LoanCreditorLpTestToken");
        const LoanCreditorStableTestToken = await ethers.getContractFactory("LoanCreditorStableTestToken");
        const Loan = await ethers.getContractFactory("Loan");

        const loanBorrowerLpTestToken = await LoanBorrowerLpTestToken.deploy(owner.address, 0);
        await loanBorrowerLpTestToken.deployed();

        const loan = await Loan.deploy(loanBorrowerLpTestToken.address, baseCollateralFactor, 1, 1);
        await loan.deployed();

        const loanCreditorLpTestToken = await LoanCreditorLpTestToken.deploy(loan.address, 0);
        await loanCreditorLpTestToken.deployed();

        const loanCreditorStableTestToken = await LoanCreditorStableTestToken.deploy(1000000000000000);
        await loanCreditorStableTestToken.deployed();

        await loan.setCreditorStableToken(loanCreditorStableTestToken.address);
        await loan.setCreditorLPToken(loanCreditorLpTestToken.address);
        await loan.setBorrowerLPToken(loanBorrowerLpTestToken.address);

        // Fixtures can return anything you consider useful for your tests
        return {
            LoanBorrowerLpTestToken, loanBorrowerLpTestToken,
            LoanCreditorLpTestToken, loanCreditorLpTestToken,
            LoanCreditorStableTestToken, loanCreditorStableTestToken,
            Loan, loan,
            owner, creditor1, creditor2, borrower1, borrower2
        };
    }

    it("Should successfully deploy contracts", async function () {
        const {
            LoanBorrowerLpTestToken, loanBorrowerLpTestToken,
            LoanCreditorLpTestToken, loanCreditorLpTestToken,
            LoanCreditorStableTestToken, loanCreditorStableTestToken,
            Loan, loan,
            owner, creditor1, creditor2, borrower1, borrower2
        } = await loadFixture(deployContractsFixture);
    });

    it("Should successfully add credit liquidity", async function () {
        const {
            LoanBorrowerLpTestToken, loanBorrowerLpTestToken,
            LoanCreditorLpTestToken, loanCreditorLpTestToken,
            LoanCreditorStableTestToken, loanCreditorStableTestToken,
            Loan, loan,
            owner, creditor1, creditor2, borrower1, borrower2
        } = await loadFixture(deployContractsFixture);

        const creditorStableValue = 100000000;

        await expect(loanCreditorStableTestToken.transfer(creditor1.address, creditorStableValue)).to.be.not.reverted;
        expect(await loanCreditorStableTestToken.balanceOf(creditor1.address)).to.equal(creditorStableValue);
        expect(await loanCreditorStableTestToken.balanceOf(loan.address)).to.equal(0);
        expect(await loanCreditorLpTestToken.totalSupply()).to.equal(0);

        const loanCreditorStableTestTokenAsCreditor1 = LoanCreditorStableTestToken__factory.connect(loanCreditorStableTestToken.address, creditor1);
        const loanAsCreditor1 = Loan__factory.connect(loan.address, creditor1);

        await expect(loanCreditorStableTestTokenAsCreditor1.approve(loan.address, creditorStableValue)).to.be.not.reverted;
        expect(await loanCreditorStableTestToken.allowance(creditor1.address, loan.address)).to.equal(creditorStableValue);

        await expect(loanAsCreditor1.addCreditorLiquidity(creditorStableValue)).to.be.not.reverted;
        expect(await loanCreditorStableTestToken.balanceOf(creditor1.address)).to.equal(0);
        expect(await loanCreditorStableTestToken.balanceOf(loan.address)).to.equal(creditorStableValue);
        expect(await loanCreditorLpTestToken.balanceOf(creditor1.address)).to.equal(creditorStableValue);
        expect(await loanCreditorLpTestToken.totalSupply()).to.equal(creditorStableValue);
        const creditorData = await loan.getCreditorData(creditor1.address);
        expect(creditorData.exists).to.equal(true);
        expect(creditorData.lpBalance.toString()).to.equal(creditorStableValue.toString());
    });

    it("Should successfully remove credit liquidity", async function () {
        const {
            LoanBorrowerLpTestToken, loanBorrowerLpTestToken,
            LoanCreditorLpTestToken, loanCreditorLpTestToken,
            LoanCreditorStableTestToken, loanCreditorStableTestToken,
            Loan, loan,
            owner, creditor1, creditor2, borrower1, borrower2
        } = await loadFixture(deployContractsFixture);

        const creditorStableValue = 100000000;

        await expect(loanCreditorStableTestToken.transfer(creditor1.address, creditorStableValue)).to.be.not.reverted;
        expect(await loanCreditorStableTestToken.balanceOf(creditor1.address)).to.equal(creditorStableValue);
        expect(await loanCreditorStableTestToken.balanceOf(loan.address)).to.equal(0);
        expect(await loanCreditorLpTestToken.totalSupply()).to.equal(0);

        const loanCreditorStableTestTokenAsCreditor1 = LoanCreditorStableTestToken__factory.connect(loanCreditorStableTestToken.address, creditor1);
        const loanCreditorLpTestTokenAsCreditor1 = LoanCreditorLpTestToken__factory.connect(loanCreditorLpTestToken.address, creditor1);
        const loanAsCreditor1 = Loan__factory.connect(loan.address, creditor1);

        await expect(loanCreditorStableTestTokenAsCreditor1.approve(loan.address, creditorStableValue)).to.be.not.reverted;
        expect(await loanCreditorStableTestToken.allowance(creditor1.address, loan.address)).to.equal(creditorStableValue);
        await expect(loanAsCreditor1.addCreditorLiquidity(creditorStableValue)).to.be.not.reverted;
        expect(await loanCreditorStableTestToken.balanceOf(creditor1.address)).to.equal(0);
        expect(await loanCreditorStableTestToken.balanceOf(loan.address)).to.equal(creditorStableValue);
        expect(await loanCreditorLpTestToken.balanceOf(creditor1.address)).to.equal(creditorStableValue);
        expect(await loanCreditorLpTestToken.totalSupply()).to.equal(creditorStableValue);
        const creditorDataCreate = await loan.getCreditorData(creditor1.address);
        expect(creditorDataCreate.exists).to.equal(true);
        expect(creditorDataCreate.lpBalance.toString()).to.equal(creditorStableValue.toString());

        await expect(loanCreditorLpTestTokenAsCreditor1.approve(loan.address, creditorStableValue)).to.be.not.reverted;
        expect(await loanCreditorLpTestToken.allowance(creditor1.address, loan.address)).to.equal(creditorStableValue);
        await expect(loanAsCreditor1.removeCreditorLiquidity(creditorStableValue)).to.be.not.reverted;
        expect(await loanCreditorStableTestToken.balanceOf(creditor1.address)).to.equal(creditorStableValue);
        expect(await loanCreditorStableTestToken.balanceOf(loan.address)).to.equal(0);
        expect(await loanCreditorLpTestToken.balanceOf(creditor1.address)).to.equal(0);
        expect(await loanCreditorLpTestToken.totalSupply()).to.equal(0);
        const creditorDataRemove = await loan.getCreditorData(creditor1.address);
        expect(creditorDataRemove.exists).to.equal(true);
        expect(creditorDataRemove.lpBalance.toString()).to.equal("0");
    });

    it("Should successfully init borrow loan", async function () {
        const {
            LoanBorrowerLpTestToken, loanBorrowerLpTestToken,
            LoanCreditorLpTestToken, loanCreditorLpTestToken,
            LoanCreditorStableTestToken, loanCreditorStableTestToken,
            Loan, loan,
            owner, creditor1, creditor2, borrower1, borrower2
        } = await loadFixture(deployContractsFixture);

        const creditorStableValue = 100000000;
        const borrowerLpValue = 50000000;

        await expect(loanCreditorStableTestToken.transfer(creditor1.address, creditorStableValue)).to.be.not.reverted;
        expect(await loanCreditorStableTestToken.balanceOf(creditor1.address)).to.equal(creditorStableValue);
        expect(await loanCreditorStableTestToken.balanceOf(loan.address)).to.equal(0);
        expect(await loanCreditorLpTestToken.totalSupply()).to.equal(0);
        expect(await loanBorrowerLpTestToken.totalSupply()).to.equal(0);

        const loanCreditorStableTestTokenAsCreditor1 = LoanCreditorStableTestToken__factory.connect(loanCreditorStableTestToken.address, creditor1);
        const loanAsCreditor1 = Loan__factory.connect(loan.address, creditor1);
        const loanBorrowerLpTestTokenAsBorrower1 = LoanBorrowerLpTestToken__factory.connect(loanBorrowerLpTestToken.address, borrower1);
        const loanAsBorrower1 = Loan__factory.connect(loan.address, borrower1);

        await expect(loanCreditorStableTestTokenAsCreditor1.approve(loan.address, creditorStableValue)).to.be.not.reverted;
        expect(await loanCreditorStableTestToken.allowance(creditor1.address, loan.address)).to.equal(creditorStableValue);

        await expect(loanAsCreditor1.addCreditorLiquidity(creditorStableValue)).to.be.not.reverted;
        expect(await loanCreditorStableTestToken.balanceOf(creditor1.address)).to.equal(0);
        expect(await loanCreditorStableTestToken.balanceOf(loan.address)).to.equal(creditorStableValue);
        expect(await loanCreditorLpTestToken.balanceOf(creditor1.address)).to.equal(creditorStableValue);
        expect(await loanCreditorLpTestToken.totalSupply()).to.equal(creditorStableValue);
        const creditorData = await loan.getCreditorData(creditor1.address);
        expect(creditorData.exists).to.equal(true);
        expect(creditorData.lpBalance.toString()).to.equal(creditorStableValue.toString());

        await expect(loanBorrowerLpTestToken.mint(borrower1.address, borrowerLpValue)).to.be.not.reverted;
        expect(await loanBorrowerLpTestToken.balanceOf(borrower1.address)).to.equal(borrowerLpValue);
        await expect(loan.setBorrowersLPData(await loanBorrowerLpTestToken.totalSupply())).to.be.not.reverted;

        await expect(loanBorrowerLpTestTokenAsBorrower1.approve(loan.address, borrowerLpValue)).to.be.not.reverted;
        expect(await loanBorrowerLpTestToken.allowance(borrower1.address, loan.address)).to.equal(borrowerLpValue);

        const loanStableValue = borrowerLpValue * baseCollateralFactor / 100;
        await expect(loanAsBorrower1.initBorrowerLoan(borrowerLpValue)).to.be.not.reverted;
        expect(await loanCreditorStableTestToken.balanceOf(borrower1.address)).to.equal(loanStableValue);
        expect(await loanCreditorStableTestToken.balanceOf(loan.address)).to.equal(creditorStableValue - loanStableValue);
        expect(await loanBorrowerLpTestToken.balanceOf(borrower1.address)).to.equal(0);
        expect(await loanBorrowerLpTestToken.balanceOf(loan.address)).to.equal(borrowerLpValue);
        expect(await loanCreditorLpTestToken.totalSupply()).to.equal(creditorStableValue);

        const borrowerLoan = await loan.getBorrowerData(borrower1.address);
        expect(borrowerLoan.exists).to.equal(true);
        expect(borrowerLoan.hasLoan).to.equal(true);
        expect(borrowerLoan.lpBalanceInit.toString()).to.equal(borrowerLpValue.toString());
        expect(borrowerLoan.stableBalanceInit.toString()).to.equal((borrowerLpValue * baseCollateralFactor / 100).toString());
        expect(borrowerLoan.blockNumberInit.toString()).not.equal("0");
        expect(borrowerLoan.lpBalanceLast.toString()).to.equal(borrowerLpValue.toString());
        expect(borrowerLoan.stableBalanceLast.toString()).to.equal((borrowerLpValue * baseCollateralFactor / 100).toString());
    });

    it("Should successfully close borrow loan", async function () {
        const {
            LoanBorrowerLpTestToken, loanBorrowerLpTestToken,
            LoanCreditorLpTestToken, loanCreditorLpTestToken,
            LoanCreditorStableTestToken, loanCreditorStableTestToken,
            Loan, loan,
            owner, creditor1, creditor2, borrower1, borrower2
        } = await loadFixture(deployContractsFixture);

        const creditorStableValue = 100000000;
        const borrowerLpValue = 50000000;

        await expect(loanCreditorStableTestToken.transfer(creditor1.address, creditorStableValue)).to.be.not.reverted;
        expect(await loanCreditorStableTestToken.balanceOf(creditor1.address)).to.equal(creditorStableValue);
        expect(await loanCreditorStableTestToken.balanceOf(loan.address)).to.equal(0);
        expect(await loanCreditorLpTestToken.totalSupply()).to.equal(0);
        expect(await loanBorrowerLpTestToken.totalSupply()).to.equal(0);

        const loanCreditorStableTestTokenAsCreditor1 = LoanCreditorStableTestToken__factory.connect(loanCreditorStableTestToken.address, creditor1);
        const loanAsCreditor1 = Loan__factory.connect(loan.address, creditor1);
        const loanBorrowerLpTestTokenAsBorrower1 = LoanBorrowerLpTestToken__factory.connect(loanBorrowerLpTestToken.address, borrower1);
        const loanAsBorrower1 = Loan__factory.connect(loan.address, borrower1);
        const loanCreditorStableTestTokenAsBorrower1 = LoanCreditorStableTestToken__factory.connect(loanCreditorStableTestToken.address, borrower1);

        await expect(loanCreditorStableTestTokenAsCreditor1.approve(loan.address, creditorStableValue)).to.be.not.reverted;
        expect(await loanCreditorStableTestToken.allowance(creditor1.address, loan.address)).to.equal(creditorStableValue);

        await expect(loanAsCreditor1.addCreditorLiquidity(creditorStableValue)).to.be.not.reverted;
        expect(await loanCreditorStableTestToken.balanceOf(creditor1.address)).to.equal(0);
        expect(await loanCreditorStableTestToken.balanceOf(loan.address)).to.equal(creditorStableValue);
        expect(await loanCreditorLpTestToken.balanceOf(creditor1.address)).to.equal(creditorStableValue);
        expect(await loanCreditorLpTestToken.totalSupply()).to.equal(creditorStableValue);
        const creditorData = await loan.getCreditorData(creditor1.address);
        expect(creditorData.exists).to.equal(true);
        expect(creditorData.lpBalance.toString()).to.equal(creditorStableValue.toString());

        await loanBorrowerLpTestToken.mint(borrower1.address, borrowerLpValue);
        expect(await loanBorrowerLpTestToken.balanceOf(borrower1.address)).to.equal(borrowerLpValue);
        await expect(loan.setBorrowersLPData(await loanBorrowerLpTestToken.totalSupply())).to.be.not.reverted;

        await expect(loanBorrowerLpTestTokenAsBorrower1.approve(loan.address, borrowerLpValue)).to.be.not.reverted;
        expect(await loanBorrowerLpTestToken.allowance(borrower1.address, loan.address)).to.equal(borrowerLpValue);

        const loanStableValue = borrowerLpValue * baseCollateralFactor / 100;
        await expect(loanAsBorrower1.initBorrowerLoan(borrowerLpValue)).to.be.not.reverted;
        expect(await loanCreditorStableTestToken.balanceOf(borrower1.address)).to.equal(loanStableValue);
        expect(await loanCreditorStableTestToken.balanceOf(loan.address)).to.equal(creditorStableValue - loanStableValue);
        expect(await loanBorrowerLpTestToken.balanceOf(borrower1.address)).to.equal(0);
        expect(await loanBorrowerLpTestToken.balanceOf(loan.address)).to.equal(borrowerLpValue);
        expect(await loanCreditorLpTestToken.totalSupply()).to.equal(creditorStableValue);

        const borrowerOpenLoan = await loan.getBorrowerData(borrower1.address);
        expect(borrowerOpenLoan.exists).to.equal(true);
        expect(borrowerOpenLoan.hasLoan).to.equal(true);
        expect(borrowerOpenLoan.lpBalanceInit.toString()).to.equal(borrowerLpValue.toString());
        expect(borrowerOpenLoan.stableBalanceInit.toString()).to.equal((borrowerLpValue * baseCollateralFactor / 100).toString());
        expect(borrowerOpenLoan.blockNumberInit.toString()).not.equal("0");
        expect(borrowerOpenLoan.lpBalanceLast.toString()).to.equal(borrowerLpValue.toString());
        expect(borrowerOpenLoan.stableBalanceLast.toString()).to.equal((borrowerLpValue * baseCollateralFactor / 100).toString());

        await expect(loanCreditorStableTestTokenAsBorrower1.approve(loan.address, loanStableValue)).to.be.not.reverted;
        expect(await loanCreditorStableTestToken.allowance(borrower1.address, loan.address)).to.equal(loanStableValue);

        const loanLpValue = loanStableValue * 100 / baseCollateralFactor;
        await expect(loanAsBorrower1.closeBorrowerLoan()).to.be.not.reverted;
        expect(await loanBorrowerLpTestToken.balanceOf(borrower1.address)).to.equal(loanLpValue);
        expect(await loanBorrowerLpTestToken.balanceOf(loan.address)).to.equal(0);
        expect(await loanCreditorStableTestToken.balanceOf(borrower1.address)).to.equal(0);
        expect(await loanCreditorStableTestToken.balanceOf(loan.address)).to.equal(creditorStableValue);

        const borrowerCloseLoan = await loan.getBorrowerData(borrower1.address);
        expect(borrowerCloseLoan.exists).to.equal(true);
        expect(borrowerCloseLoan.hasLoan).to.equal(false);
        expect(borrowerCloseLoan.lpBalanceInit.toString()).to.equal("0");
        expect(borrowerCloseLoan.stableBalanceInit.toString()).to.equal("0");
        expect(borrowerCloseLoan.blockNumberInit.toString()).to.equal("0");
        expect(borrowerCloseLoan.lpBalanceLast.toString()).to.equal("0");
        expect(borrowerCloseLoan.stableBalanceLast.toString()).to.equal("0");
    });

    it("Should successfully init borrow loan with removing creditor liquidity", async function () {
        const {
            LoanBorrowerLpTestToken, loanBorrowerLpTestToken,
            LoanCreditorLpTestToken, loanCreditorLpTestToken,
            LoanCreditorStableTestToken, loanCreditorStableTestToken,
            Loan, loan,
            owner, creditor1, creditor2, borrower1, borrower2
        } = await loadFixture(deployContractsFixture);

        const creditorStableValue = 100000000;
        const borrowerLpValue = 50000000;

        await expect(loanCreditorStableTestToken.transfer(creditor1.address, creditorStableValue)).to.be.not.reverted;
        expect(await loanCreditorStableTestToken.balanceOf(creditor1.address)).to.equal(creditorStableValue);
        expect(await loanCreditorStableTestToken.balanceOf(loan.address)).to.equal(0);
        expect(await loanCreditorLpTestToken.totalSupply()).to.equal(0);
        expect(await loanBorrowerLpTestToken.totalSupply()).to.equal(0);

        const loanCreditorStableTestTokenAsCreditor1 = LoanCreditorStableTestToken__factory.connect(loanCreditorStableTestToken.address, creditor1);
        const loanAsCreditor1 = Loan__factory.connect(loan.address, creditor1);
        const loanBorrowerLpTestTokenAsBorrower1 = LoanBorrowerLpTestToken__factory.connect(loanBorrowerLpTestToken.address, borrower1);
        const loanAsBorrower1 = Loan__factory.connect(loan.address, borrower1);
        const loanCreditorLpTestTokenAsCreditor1 = LoanCreditorLpTestToken__factory.connect(loanCreditorLpTestToken.address, creditor1);

        await expect(loanCreditorStableTestTokenAsCreditor1.approve(loan.address, creditorStableValue)).to.be.not.reverted;
        expect(await loanCreditorStableTestToken.allowance(creditor1.address, loan.address)).to.equal(creditorStableValue);

        await loanAsCreditor1.addCreditorLiquidity(creditorStableValue);
        expect(await loanCreditorStableTestToken.balanceOf(creditor1.address)).to.equal(0);
        expect(await loanCreditorStableTestToken.balanceOf(loan.address)).to.equal(creditorStableValue);
        expect(await loanCreditorLpTestToken.balanceOf(creditor1.address)).to.equal(creditorStableValue);
        expect(await loanCreditorLpTestToken.totalSupply()).to.equal(creditorStableValue);
        const creditorData = await loan.getCreditorData(creditor1.address);
        expect(creditorData.exists).to.equal(true);
        expect(creditorData.lpBalance.toString()).to.equal(creditorStableValue.toString());

        await expect(loanBorrowerLpTestToken.mint(borrower1.address, borrowerLpValue)).to.be.not.reverted;
        expect(await loanBorrowerLpTestToken.balanceOf(borrower1.address)).to.equal(borrowerLpValue);
        await expect(loan.setBorrowersLPData(await loanBorrowerLpTestToken.totalSupply())).to.be.not.reverted;

        await loanBorrowerLpTestTokenAsBorrower1.approve(loan.address, borrowerLpValue);
        expect(await loanBorrowerLpTestToken.allowance(borrower1.address, loan.address)).to.equal(borrowerLpValue);

        const loanStableValue = borrowerLpValue * baseCollateralFactor / 100;
        await expect(loanAsBorrower1.initBorrowerLoan(borrowerLpValue)).to.be.not.reverted;
        expect(await loanCreditorStableTestToken.balanceOf(borrower1.address)).to.equal(loanStableValue);
        expect(await loanCreditorStableTestToken.balanceOf(loan.address)).to.equal(creditorStableValue - loanStableValue);
        expect(await loanBorrowerLpTestToken.balanceOf(borrower1.address)).to.equal(0);
        expect(await loanBorrowerLpTestToken.balanceOf(loan.address)).to.equal(borrowerLpValue);
        expect(await loanCreditorLpTestToken.totalSupply()).to.equal(creditorStableValue);

        const borrowerLoan = await loan.getBorrowerData(borrower1.address);
        expect(borrowerLoan.exists).to.equal(true);
        expect(borrowerLoan.hasLoan).to.equal(true);
        expect(borrowerLoan.lpBalanceInit.toString()).to.equal(borrowerLpValue.toString());
        expect(borrowerLoan.stableBalanceInit.toString()).to.equal((borrowerLpValue * baseCollateralFactor / 100).toString());
        expect(borrowerLoan.blockNumberInit.toString()).not.equal("0");
        expect(borrowerLoan.lpBalanceLast.toString()).to.equal(borrowerLpValue.toString());
        expect(borrowerLoan.stableBalanceLast.toString()).to.equal((borrowerLpValue * baseCollateralFactor / 100).toString());

        await expect(loanCreditorLpTestTokenAsCreditor1.approve(loan.address, creditorStableValue)).to.be.not.reverted;
        expect(await loanCreditorLpTestToken.allowance(creditor1.address, loan.address)).to.equal(creditorStableValue);
        await expect(loanAsCreditor1.removeCreditorLiquidity(creditorStableValue))
            .to.be.revertedWith("LoanCreditor: not enough liquidity");
        const creditorLpBalance = creditorData.lpBalance;
        const creditorAvailableLpBalance = await loan.getCreditorAvailableLpLiquidity(creditor1.address);
        const creditorAvailableStableBalance = await loan.getCreditorAvailableStableLiquidity(creditor1.address);
        expect(creditorAvailableLpBalance).to.equal(creditorLpBalance - loanStableValue);
        await expect(loanAsCreditor1.removeCreditorLiquidity(creditorAvailableLpBalance)).to.be.not.reverted;
        const creditorDataTemp = await loan.getCreditorData(creditor1.address);
        expect(await loanCreditorStableTestToken.balanceOf(creditor1.address)).to.equal(creditorAvailableStableBalance);
        expect(await loanCreditorStableTestToken.balanceOf(loan.address)).to.equal(0);
        expect(await loanCreditorLpTestToken.balanceOf(creditor1.address)).to.equal(creditorLpBalance - creditorAvailableLpBalance);
        expect(await loanCreditorLpTestToken.balanceOf(creditor1.address)).to.equal(creditorDataTemp.lpBalance);
        expect(await loanCreditorLpTestToken.balanceOf(loan.address)).to.equal(0);
    });
});
