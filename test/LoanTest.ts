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

        await loanCreditorStableTestToken.transfer(creditor1.address, creditorStableValue);
        expect(await loanCreditorStableTestToken.balanceOf(creditor1.address)).to.equal(creditorStableValue);
        expect(await loanCreditorStableTestToken.balanceOf(loan.address)).to.equal(0);
        expect(await loanCreditorLpTestToken.totalSupply()).to.equal(0);

        const loanCreditorStableTestTokenAsCreditor1 = LoanCreditorStableTestToken__factory.connect(loanCreditorStableTestToken.address, creditor1);
        const loanAsCreditor1 = Loan__factory.connect(loan.address, creditor1);

        await loanCreditorStableTestTokenAsCreditor1.approve(loan.address, creditorStableValue);
        expect(await loanCreditorStableTestToken.allowance(creditor1.address, loan.address)).to.equal(creditorStableValue);

        await loanAsCreditor1.addCreditorLiquidity(creditorStableValue);
        expect(await loanCreditorStableTestToken.balanceOf(creditor1.address)).to.equal(0);
        expect(await loanCreditorStableTestToken.balanceOf(loan.address)).to.equal(creditorStableValue);
        expect(await loanCreditorLpTestToken.balanceOf(creditor1.address)).to.equal(creditorStableValue);
        expect(await loanCreditorLpTestToken.totalSupply()).to.equal(creditorStableValue);
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

        await loanCreditorStableTestToken.transfer(creditor1.address, creditorStableValue);
        expect(await loanCreditorStableTestToken.balanceOf(creditor1.address)).to.equal(creditorStableValue);
        expect(await loanCreditorStableTestToken.balanceOf(loan.address)).to.equal(0);
        expect(await loanCreditorLpTestToken.totalSupply()).to.equal(0);

        const loanCreditorStableTestTokenAsCreditor1 = LoanCreditorStableTestToken__factory.connect(loanCreditorStableTestToken.address, creditor1);
        const loanCreditorLpTestTokenAsCreditor1 = LoanCreditorLpTestToken__factory.connect(loanCreditorLpTestToken.address, creditor1);
        const loanAsCreditor1 = Loan__factory.connect(loan.address, creditor1);

        await loanCreditorStableTestTokenAsCreditor1.approve(loan.address, creditorStableValue);
        expect(await loanCreditorStableTestToken.allowance(creditor1.address, loan.address)).to.equal(creditorStableValue);
        await loanAsCreditor1.addCreditorLiquidity(creditorStableValue);
        expect(await loanCreditorStableTestToken.balanceOf(creditor1.address)).to.equal(0);
        expect(await loanCreditorStableTestToken.balanceOf(loan.address)).to.equal(creditorStableValue);
        expect(await loanCreditorLpTestToken.balanceOf(creditor1.address)).to.equal(creditorStableValue);
        expect(await loanCreditorLpTestToken.totalSupply()).to.equal(creditorStableValue);

        await loanCreditorLpTestTokenAsCreditor1.approve(loan.address, creditorStableValue);
        expect(await loanCreditorLpTestToken.allowance(creditor1.address, loan.address)).to.equal(creditorStableValue);
        await loanAsCreditor1.removeCreditorLiquidity(creditorStableValue);
        expect(await loanCreditorStableTestToken.balanceOf(creditor1.address)).to.equal(creditorStableValue);
        expect(await loanCreditorStableTestToken.balanceOf(loan.address)).to.equal(0);
        expect(await loanCreditorLpTestToken.balanceOf(creditor1.address)).to.equal(0);
        expect(await loanCreditorLpTestToken.totalSupply()).to.equal(0);
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

        await loanCreditorStableTestToken.transfer(creditor1.address, creditorStableValue);
        expect(await loanCreditorStableTestToken.balanceOf(creditor1.address)).to.equal(creditorStableValue);
        expect(await loanCreditorStableTestToken.balanceOf(loan.address)).to.equal(0);
        expect(await loanCreditorLpTestToken.totalSupply()).to.equal(0);
        expect(await loanBorrowerLpTestToken.totalSupply()).to.equal(0);

        const loanCreditorStableTestTokenAsCreditor1 = LoanCreditorStableTestToken__factory.connect(loanCreditorStableTestToken.address, creditor1);
        const loanAsCreditor1 = Loan__factory.connect(loan.address, creditor1);
        const loanBorrowerLpTestTokenAsBorrower1 = LoanBorrowerLpTestToken__factory.connect(loanBorrowerLpTestToken.address, borrower1);
        const loanAsBorrower1 = Loan__factory.connect(loan.address, borrower1);

        await loanCreditorStableTestTokenAsCreditor1.approve(loan.address, creditorStableValue);
        expect(await loanCreditorStableTestToken.allowance(creditor1.address, loan.address)).to.equal(creditorStableValue);

        await loanAsCreditor1.addCreditorLiquidity(creditorStableValue);
        expect(await loanCreditorStableTestToken.balanceOf(creditor1.address)).to.equal(0);
        expect(await loanCreditorStableTestToken.balanceOf(loan.address)).to.equal(creditorStableValue);
        expect(await loanCreditorLpTestToken.balanceOf(creditor1.address)).to.equal(creditorStableValue);
        expect(await loanCreditorLpTestToken.totalSupply()).to.equal(creditorStableValue);

        await loanBorrowerLpTestToken.mint(borrower1.address, borrowerLpValue);
        expect(await loanBorrowerLpTestToken.balanceOf(borrower1.address)).to.equal(borrowerLpValue);
        await loan.setBorrowersLPData(await loanBorrowerLpTestToken.totalSupply());

        await loanBorrowerLpTestTokenAsBorrower1.approve(loan.address, borrowerLpValue);
        expect(await loanBorrowerLpTestToken.allowance(borrower1.address, loan.address)).to.equal(borrowerLpValue);

        const loanStableValue = borrowerLpValue * baseCollateralFactor / 100;
        await loanAsBorrower1.initBorrowerLoan(borrowerLpValue);
        expect(await loanCreditorStableTestToken.balanceOf(borrower1.address)).to.equal(loanStableValue);
        expect(await loanCreditorStableTestToken.balanceOf(loan.address)).to.equal(creditorStableValue - loanStableValue);
        expect(await loanBorrowerLpTestToken.balanceOf(borrower1.address)).to.equal(0);
        expect(await loanBorrowerLpTestToken.balanceOf(loan.address)).to.equal(borrowerLpValue);
        expect(await loanCreditorLpTestToken.totalSupply()).to.equal(creditorStableValue);

        const borrowerLoan = await loan.getBorrowerData(borrower1.address);
        expect(borrowerLoan.exists).to.equal(true);
        expect(borrowerLoan.hasLoan).to.equal(true);
        expect(borrowerLoan.lpBalanceInit.toString()).to.equal("50000000");
        expect(borrowerLoan.stableBalanceInit.toString()).to.equal("50000000");
        expect(borrowerLoan.blockNumberInit.toString()).not.equal("0");
        expect(borrowerLoan.lpBalanceCurrent.toString()).to.equal("50000000");
        expect(borrowerLoan.stableBalanceCurrent.toString()).to.equal("50000000");
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

        await loanCreditorStableTestToken.transfer(creditor1.address, creditorStableValue);
        expect(await loanCreditorStableTestToken.balanceOf(creditor1.address)).to.equal(creditorStableValue);
        expect(await loanCreditorStableTestToken.balanceOf(loan.address)).to.equal(0);
        expect(await loanCreditorLpTestToken.totalSupply()).to.equal(0);
        expect(await loanBorrowerLpTestToken.totalSupply()).to.equal(0);

        const loanCreditorStableTestTokenAsCreditor1 = LoanCreditorStableTestToken__factory.connect(loanCreditorStableTestToken.address, creditor1);
        const loanAsCreditor1 = Loan__factory.connect(loan.address, creditor1);
        const loanBorrowerLpTestTokenAsBorrower1 = LoanBorrowerLpTestToken__factory.connect(loanBorrowerLpTestToken.address, borrower1);
        const loanAsBorrower1 = Loan__factory.connect(loan.address, borrower1);
        const loanCreditorStableTestTokenAsBorrower1 = LoanCreditorStableTestToken__factory.connect(loanCreditorStableTestToken.address, borrower1);

        await loanCreditorStableTestTokenAsCreditor1.approve(loan.address, creditorStableValue);
        expect(await loanCreditorStableTestToken.allowance(creditor1.address, loan.address)).to.equal(creditorStableValue);

        await loanAsCreditor1.addCreditorLiquidity(creditorStableValue);
        expect(await loanCreditorStableTestToken.balanceOf(creditor1.address)).to.equal(0);
        expect(await loanCreditorStableTestToken.balanceOf(loan.address)).to.equal(creditorStableValue);
        expect(await loanCreditorLpTestToken.balanceOf(creditor1.address)).to.equal(creditorStableValue);
        expect(await loanCreditorLpTestToken.totalSupply()).to.equal(creditorStableValue);

        await loanBorrowerLpTestToken.mint(borrower1.address, borrowerLpValue);
        expect(await loanBorrowerLpTestToken.balanceOf(borrower1.address)).to.equal(borrowerLpValue);
        await loan.setBorrowersLPData(await loanBorrowerLpTestToken.totalSupply());

        await loanBorrowerLpTestTokenAsBorrower1.approve(loan.address, borrowerLpValue);
        expect(await loanBorrowerLpTestToken.allowance(borrower1.address, loan.address)).to.equal(borrowerLpValue);

        const loanStableValue = borrowerLpValue * baseCollateralFactor / 100;
        await loanAsBorrower1.initBorrowerLoan(borrowerLpValue);
        expect(await loanCreditorStableTestToken.balanceOf(borrower1.address)).to.equal(loanStableValue);
        expect(await loanCreditorStableTestToken.balanceOf(loan.address)).to.equal(creditorStableValue - loanStableValue);
        expect(await loanBorrowerLpTestToken.balanceOf(borrower1.address)).to.equal(0);
        expect(await loanBorrowerLpTestToken.balanceOf(loan.address)).to.equal(borrowerLpValue);
        expect(await loanCreditorLpTestToken.totalSupply()).to.equal(creditorStableValue);

        const borrowerOpenLoan = await loan.getBorrowerData(borrower1.address);
        expect(borrowerOpenLoan.exists).to.equal(true);
        expect(borrowerOpenLoan.hasLoan).to.equal(true);
        expect(borrowerOpenLoan.lpBalanceInit.toString()).to.equal("50000000");
        expect(borrowerOpenLoan.stableBalanceInit.toString()).to.equal("50000000");
        expect(borrowerOpenLoan.blockNumberInit.toString()).not.equal("0");
        expect(borrowerOpenLoan.lpBalanceCurrent.toString()).to.equal("50000000");
        expect(borrowerOpenLoan.stableBalanceCurrent.toString()).to.equal("50000000");

        await loanCreditorStableTestTokenAsBorrower1.approve(loan.address, loanStableValue);
        expect(await loanCreditorStableTestToken.allowance(borrower1.address, loan.address)).to.equal(loanStableValue);

        const loanLpValue = loanStableValue * 100 / baseCollateralFactor;
        await loanAsBorrower1.closeBorrowerLoan(loanStableValue);
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
        expect(borrowerCloseLoan.lpBalanceCurrent.toString()).to.equal("0");
        expect(borrowerCloseLoan.stableBalanceCurrent.toString()).to.equal("0");
    });
});
