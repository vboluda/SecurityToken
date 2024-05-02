import { expect, util } from "chai";
import { ethers } from "hardhat";
import { Signer,BigNumber, ZeroAddress } from "ethers";
import {ST_crypt__factory} from "../types/factories/contracts/ST/ST_crypt__factory";
import {ST_crypt} from "../types/contracts/ST/ST_crypt";

const TOTAL_SUPPLY:number=1000000;
const SYMBOL:string = "TST";
const NAME:string = "TEST1";


describe("SECURITY TOKEN", function () {
    let Deployer:Signer;
    let Account1:Signer;
    let Account2:Signer;
    let Approved:Signer;
    let DefaultReceiver:Signer;
    let Excluded:Signer;

    let deployerAddress:string;
    let account1Address:string;
    let account2Address:string;
    let approvedAddress:string;
    let defaultReceiverAddress:string;
    let excludedAddress:string;

    let St_Factory:ST_crypt__factory;
    let St:ST_crypt;


    this.beforeEach(async function () {
      [Deployer,Account1, Account2,Approved, DefaultReceiver, Excluded] = await ethers.getSigners();
      [
        deployerAddress, 
        account1Address, 
        account2Address,
        approvedAddress,
        defaultReceiverAddress,
        excludedAddress
      ] = await Promise.all([
        Deployer.getAddress(),
        Account1.getAddress(),
        Account2.getAddress(),
        Approved.getAddress(),
        DefaultReceiver.getAddress(),
        Excluded.getAddress()
      ]);
      [
        St_Factory
      ] = await Promise.all([
        ethers.getContractFactory("ST_crypt") as Promise<ST_crypt__factory>
      ]);

      St=await St_Factory.deploy(NAME,SYMBOL,TOTAL_SUPPLY,defaultReceiverAddress);
      
    });

    it("Check initial values", async function () {
      let [
        totalSupply,
        totalReceived,
        spent,
        balance,
        defaultRecipient,
        symbol,
        name
      ] = await Promise.all([
        St.totalSupply(),
        St.totalReceived(),
        St.spent(deployerAddress),
        St.balanceOf(deployerAddress),
        St.defaultRecipient(),
        St.symbol(),
        St.name()
      ]);

      expect(totalSupply).to.be.equal(TOTAL_SUPPLY);
      expect(totalReceived).to.be.equal(0);
      expect(spent).to.be.equal(0);
      expect(balance).to.be.equal(TOTAL_SUPPLY);
      expect(defaultRecipient).to.be.equal(defaultReceiverAddress);
      expect(symbol).to.be.equal(SYMBOL);
      expect(name).to.be.equal(NAME);
    })

    it("Check withdraw", async function () {
          await expect(St.withdraw())
          .to.emit(St,"withdrawEvent")
          .withArgs(deployerAddress,0);

          await Deployer.sendTransaction({to:await St.getAddress(), value:1000});

          await expect(St.withdraw())
          .to.emit(St,"withdrawEvent")
          .withArgs(deployerAddress,1000);

          await expect(St.withdraw())
          .to.emit(St,"withdrawEvent")
          .withArgs(deployerAddress,0);
    });

    describe("TRANSFER", function () {

      it("Check exceeds balance", async function () {
        await expect(St.connect(Account1).transfer(account1Address,TOTAL_SUPPLY/2))
        .to.be.revertedWith("Amount exceeds balance");
      });


      it("Check transfer zero funds", async function () {
        let totalReceived:BigNumber=await St.totalReceived();
        expect(totalReceived).to.be.equal(0);

        let spent:BigNumber=await St.spent(deployerAddress);
        expect(spent).to.be.equal(0);

        await expect(St.transfer(account1Address,TOTAL_SUPPLY/2))
        .to.emit(St, "recalculatePaid")
        .withArgs(deployerAddress,account1Address,0,0);

        let newSpent:BigNumber=await St.spent(deployerAddress);
        expect(newSpent).to.be.equal(0);

        totalReceived=await St.totalReceived();
        expect(totalReceived).to.be.equal(0)
    });

    it("Check transfer to accounts without previous funds", async function () {

      let spent:BigNumber=await St.spent(deployerAddress);
      expect(spent).to.be.equal(0);

      await Deployer.sendTransaction({to:await St.getAddress(), value:1000});
      let totalReceived:BigNumber=await St.totalReceived();
        expect(totalReceived).to.be.equal(1000);

      totalReceived=await St.totalReceived();
      expect(totalReceived).to.be.equal(1000);

      spent=await St.spent(deployerAddress);
      expect(spent).to.be.equal(0);

      await expect(St.connect(Deployer).transfer(account1Address,TOTAL_SUPPLY/2))
      .to.emit(St, "recalculatePaid")
      .withArgs(deployerAddress,account1Address,1000,0);

      spent=await St.spent(deployerAddress);
      expect(spent).to.be.equal(500);
      
      await Deployer.sendTransaction({to:await St.getAddress(), value:1000});
      totalReceived=await St.totalReceived();
      expect(totalReceived).to.be.equal(2000);

      await expect(St.connect(Account1).transfer(account2Address,TOTAL_SUPPLY/4))
      .to.emit(St, "recalculatePaid")
      .withArgs(account1Address,account2Address,500,0);

      spent=await St.spent(deployerAddress);
      expect(spent).to.be.equal(500);
      spent=await St.spent(account1Address);
      expect(spent).to.be.equal(500);
      spent=await St.spent(account2Address);
      expect(spent).to.be.equal(500);

      await expect(St.withdraw())
      .to.emit(St,"withdrawEvent")
      .withArgs(deployerAddress,500);

      await expect(St.connect(Account1).withdraw())
      .to.emit(St,"withdrawEvent")
      .withArgs(account1Address,0);

      await expect(St.connect(Account2).withdraw())
      .to.emit(St,"withdrawEvent")
      .withArgs(account2Address,0);
    });

    it("Check transfer to account with previous funds", async function () {

      let spent:BigNumber=await St.spent(deployerAddress);
      expect(spent).to.be.equal(0);

      await Deployer.sendTransaction({to: await St.getAddress(), value:1000});
      let totalReceived:BigNumber=await St.totalReceived();
        expect(totalReceived).to.be.equal(1000);

      totalReceived=await St.totalReceived();
      expect(totalReceived).to.be.equal(1000);

      spent=await St.spent(deployerAddress);
      expect(spent).to.be.equal(0);

      await expect(St.connect(Deployer).transfer(account1Address,TOTAL_SUPPLY/2))
      .to.emit(St, "recalculatePaid")
      .withArgs(deployerAddress,account1Address,1000,0);

      await expect(St.connect(Deployer).transfer(account2Address,TOTAL_SUPPLY/4))
      .to.emit(St, "recalculatePaid")
      .withArgs(deployerAddress,account2Address,0,0);

      await Deployer.sendTransaction({to: await St.getAddress(), value:1000});
      totalReceived=await St.totalReceived();
      expect(totalReceived).to.be.equal(2000);

      await expect(St.connect(Account1).transfer(account2Address,TOTAL_SUPPLY/4))
      .to.emit(St, "recalculatePaid")
      .withArgs(account1Address,account2Address,500,250);

      spent=await St.spent(deployerAddress);
      expect(spent).to.be.equal(250);
      spent=await St.spent(account1Address);
      expect(spent).to.be.equal(500);
      spent=await St.spent(account2Address);
      expect(spent).to.be.equal(1000);

      await expect(St.connect(Deployer).withdraw())
      .to.emit(St,"withdrawEvent")
      .withArgs(deployerAddress,250);
    });

    it("Check transfer to accounts without previous funds (excluded)", async function () {

      let spent:BigNumber=await St.spent(deployerAddress);
      expect(spent).to.be.equal(0);

      await St.connect(Deployer).updateExclusion(account1Address,true);

      await Deployer.sendTransaction({to:await St.getAddress(), value:1000});
      let totalReceived:BigNumber=await St.totalReceived();
        expect(totalReceived).to.be.equal(1000);

      totalReceived=await St.totalReceived();
      expect(totalReceived).to.be.equal(1000);

      spent=await St.spent(deployerAddress);
      expect(spent).to.be.equal(0);

      await expect(St.connect(Deployer).transfer(account1Address,TOTAL_SUPPLY/2))
      .to.emit(St, "recalculatePaid")
      .withArgs(deployerAddress,defaultReceiverAddress,1000,0);

      spent=await St.spent(deployerAddress);
      expect(spent).to.be.equal(500);
      
      await Deployer.sendTransaction({to:await St.getAddress(), value:1000});
      totalReceived=await St.totalReceived();
      expect(totalReceived).to.be.equal(2000);

      // console.log("account1Address: ",account1Address);
      // console.log("defaultReceiverAddress: ",defaultReceiverAddress);
      // console.log("account2Address: ",account2Address);
      // console.log("Deployer: ",deployerAddress);

      await expect(St.connect(Account1).transfer(account2Address,TOTAL_SUPPLY/4))
      .to.emit(St, "recalculatePaid")
      .withArgs(defaultReceiverAddress,account2Address,500,0);

      spent=await St.spent(deployerAddress);
      expect(spent).to.be.equal(500);
      spent=await St.spent(account1Address);
      expect(spent).to.be.equal(500);
      spent=await St.spent(account2Address);
      expect(spent).to.be.equal(500);

      await expect(St.withdraw())
      .to.emit(St,"withdrawEvent")
      .withArgs(deployerAddress,500);

      await expect(St.connect(Account1).withdraw())
      .to.be.revertedWithCustomError(St,"cannotTransferFromExcluded")
      .withArgs(account1Address);

      await expect(St.connect(Deployer).withdrawToDefaultRecipient(account1Address))
      .to.emit(St,"withdrawEvent")
      .withArgs(account1Address,0);

      await expect(St.connect(Account2).withdraw())
      .to.emit(St,"withdrawEvent")
      .withArgs(account2Address,0);
    });

    it("Check transfer to account with previous funds (excluded)", async function () {

      let spent:BigNumber=await St.spent(deployerAddress);
      expect(spent).to.be.equal(0);

      await St.connect(Deployer).updateExclusion(account1Address,true);

      await Deployer.sendTransaction({to: await St.getAddress(), value:1000});
      let totalReceived:BigNumber=await St.totalReceived();
        expect(totalReceived).to.be.equal(1000);

      totalReceived=await St.totalReceived();
      expect(totalReceived).to.be.equal(1000);

      spent=await St.spent(deployerAddress);
      expect(spent).to.be.equal(0);

      await expect(St.connect(Deployer).transfer(account1Address,TOTAL_SUPPLY/2))
      .to.emit(St, "recalculatePaid")
      .withArgs(deployerAddress,defaultReceiverAddress,1000,0);

      await expect(St.connect(Deployer).transfer(account2Address,TOTAL_SUPPLY/4))
      .to.emit(St, "recalculatePaid")
      .withArgs(deployerAddress,account2Address,0,0);

      await Deployer.sendTransaction({to: await St.getAddress(), value:1000});
      totalReceived=await St.totalReceived();
      expect(totalReceived).to.be.equal(2000);

      await expect(St.connect(Account1).transfer(account2Address,TOTAL_SUPPLY/4))
      .to.emit(St, "recalculatePaid")
      .withArgs(defaultReceiverAddress,account2Address,500,250);

      spent=await St.spent(deployerAddress);
      expect(spent).to.be.equal(250);
      spent=await St.spent(account1Address);
      expect(spent).to.be.equal(500);
      spent=await St.spent(account2Address);
      expect(spent).to.be.equal(1000);

      await expect(St.connect(Deployer).withdraw())
      .to.emit(St,"withdrawEvent")
      .withArgs(deployerAddress,250);
    });
  });

  describe("TRANSFER FROM", function () {

    this.beforeEach(async function () {
      St.connect(Account1).approve(approvedAddress,"10000000000000000000000");
      St.connect(Account2).approve(approvedAddress,"10000000000000000000000");
      St.connect(Deployer).approve(approvedAddress,"10000000000000000000000");
    });

    it("Check exceeds balance", async function () {
      await expect(St.connect(Approved).transferFrom(account1Address,account2Address,TOTAL_SUPPLY/2))
      .to.be.revertedWith("Amount exceeds balance");
    });


    it("Check transfer zero funds", async function () {
      let totalReceived:BigNumber=await St.totalReceived();
      expect(totalReceived).to.be.equal(0);

      let spent:BigNumber=await St.spent(deployerAddress);
      expect(spent).to.be.equal(0);

      await expect(St.connect(Approved).transferFrom(deployerAddress,account1Address,TOTAL_SUPPLY/2))
      .to.emit(St, "recalculatePaid")
      .withArgs(deployerAddress,account1Address,0,0);

      let newSpent:BigNumber=await St.spent(deployerAddress);
      expect(newSpent).to.be.equal(0);

      totalReceived=await St.totalReceived();
      expect(totalReceived).to.be.equal(0)
    });

    it("Check transfer to accounts without previous funds", async function () {

      let spent:BigNumber=await St.spent(deployerAddress);
      expect(spent).to.be.equal(0);

      await Deployer.sendTransaction({to:await St.getAddress(), value:1000});
      let totalReceived:BigNumber=await St.totalReceived();
        expect(totalReceived).to.be.equal(1000);

      totalReceived=await St.totalReceived();
      expect(totalReceived).to.be.equal(1000);

      spent=await St.spent(deployerAddress);
      expect(spent).to.be.equal(0);

      await expect(St.connect(Approved).transferFrom(deployerAddress,account1Address,TOTAL_SUPPLY/2))
      .to.emit(St, "recalculatePaid")
      .withArgs(deployerAddress,account1Address,1000,0);

      spent=await St.spent(deployerAddress);
      expect(spent).to.be.equal(500);
      
      await Deployer.sendTransaction({to:await St.getAddress(), value:1000});
      totalReceived=await St.totalReceived();
      expect(totalReceived).to.be.equal(2000);

      await expect(St.connect(Approved).transferFrom(account1Address,account2Address,TOTAL_SUPPLY/4))
      .to.emit(St, "recalculatePaid")
      .withArgs(account1Address,account2Address,500,0);

      spent=await St.spent(deployerAddress);
      expect(spent).to.be.equal(500);
      spent=await St.spent(account1Address);
      expect(spent).to.be.equal(500);
      spent=await St.spent(account2Address);
      expect(spent).to.be.equal(500);

      await expect(St.withdraw())
      .to.emit(St,"withdrawEvent")
      .withArgs(deployerAddress,500);

      await expect(St.connect(Account1).withdraw())
      .to.emit(St,"withdrawEvent")
      .withArgs(account1Address,0);

      await expect(St.connect(Account2).withdraw())
      .to.emit(St,"withdrawEvent")
      .withArgs(account2Address,0);
    });

    it("Check transfer to account with previous funds", async function () {

      let spent:BigNumber=await St.spent(deployerAddress);
      expect(spent).to.be.equal(0);

      await Deployer.sendTransaction({to:await St.getAddress(), value:1000});
      let totalReceived:BigNumber=await St.totalReceived();
        expect(totalReceived).to.be.equal(1000);

      totalReceived=await St.totalReceived();
      expect(totalReceived).to.be.equal(1000);

      spent=await St.spent(deployerAddress);
      expect(spent).to.be.equal(0);

      await expect(St.connect(Approved).transferFrom(deployerAddress,account1Address,TOTAL_SUPPLY/2))
      .to.emit(St, "recalculatePaid")
      .withArgs(deployerAddress,account1Address,1000,0);

      await expect(St.connect(Approved).transferFrom(deployerAddress,account2Address,TOTAL_SUPPLY/4))
      .to.emit(St, "recalculatePaid")
      .withArgs(deployerAddress,account2Address,0,0);

      await Deployer.sendTransaction({to:await St.getAddress(), value:1000});
      totalReceived=await St.totalReceived();
      expect(totalReceived).to.be.equal(2000);

      await expect(St.connect(Approved).transferFrom(account1Address,account2Address,TOTAL_SUPPLY/4))
      .to.emit(St, "recalculatePaid")
      .withArgs(account1Address,account2Address,500,250);

      spent=await St.spent(deployerAddress);
      expect(spent).to.be.equal(250);
      spent=await St.spent(account1Address);
      expect(spent).to.be.equal(500);
      spent=await St.spent(account2Address);
      expect(spent).to.be.equal(1000);

      await expect(St.connect(Deployer).withdraw())
      .to.emit(St,"withdrawEvent")
      .withArgs(deployerAddress,250);
    });

    it("Check transfer to accounts without previous funds (excluded)", async function () {

      let spent:BigNumber=await St.spent(deployerAddress);
      expect(spent).to.be.equal(0);

      await St.connect(Deployer).updateExclusion(account1Address,true);

      await Deployer.sendTransaction({to:await St.getAddress(), value:1000});
      let totalReceived:BigNumber=await St.totalReceived();
        expect(totalReceived).to.be.equal(1000);

      totalReceived=await St.totalReceived();
      expect(totalReceived).to.be.equal(1000);

      spent=await St.spent(deployerAddress);
      expect(spent).to.be.equal(0);

      await expect(St.connect(Approved).transferFrom(deployerAddress,account1Address,TOTAL_SUPPLY/2))
      .to.emit(St, "recalculatePaid")
      .withArgs(deployerAddress,defaultReceiverAddress,1000,0);

      spent=await St.spent(deployerAddress);
      expect(spent).to.be.equal(500);
      
      await Deployer.sendTransaction({to:await St.getAddress(), value:1000});
      totalReceived=await St.totalReceived();
      expect(totalReceived).to.be.equal(2000);

      await expect(St.connect(Approved).transferFrom(account1Address,account2Address,TOTAL_SUPPLY/4))
      .to.emit(St, "recalculatePaid")
      .withArgs(defaultReceiverAddress,account2Address,500,0);

      spent=await St.spent(deployerAddress);
      expect(spent).to.be.equal(500);
      spent=await St.spent(account1Address);
      expect(spent).to.be.equal(500);
      spent=await St.spent(account2Address);
      expect(spent).to.be.equal(500);

      await expect(St.withdraw())
      .to.emit(St,"withdrawEvent")
      .withArgs(deployerAddress,500);

      await expect(St.connect(Account1).withdraw())
      .to.be.revertedWithCustomError(St,"cannotTransferFromExcluded")
      .withArgs(account1Address);

      await expect(St.connect(Deployer).withdrawToDefaultRecipient(account1Address))
      .to.emit(St,"withdrawEvent")
      .withArgs(account1Address,0);

      await expect(St.connect(Account2).withdraw())
      .to.emit(St,"withdrawEvent")
      .withArgs(account2Address,0);
    });

    it("Check transfer to account with previous funds (exluded)", async function () {

      let spent:BigNumber=await St.spent(deployerAddress);
      expect(spent).to.be.equal(0);

      await Deployer.sendTransaction({to:await St.getAddress(), value:1000});
      let totalReceived:BigNumber=await St.totalReceived();
        expect(totalReceived).to.be.equal(1000);

      totalReceived=await St.totalReceived();
      expect(totalReceived).to.be.equal(1000);

      spent=await St.spent(deployerAddress);
      expect(spent).to.be.equal(0);

      await expect(St.connect(Approved).transferFrom(deployerAddress,account1Address,TOTAL_SUPPLY/2))
      .to.emit(St, "recalculatePaid")
      .withArgs(deployerAddress,account1Address,1000,0);

      await expect(St.connect(Approved).transferFrom(deployerAddress,account2Address,TOTAL_SUPPLY/4))
      .to.emit(St, "recalculatePaid")
      .withArgs(deployerAddress,account2Address,0,0);

      await Deployer.sendTransaction({to:await St.getAddress(), value:1000});
      totalReceived=await St.totalReceived();
      expect(totalReceived).to.be.equal(2000);

      await expect(St.connect(Approved).transferFrom(account1Address,account2Address,TOTAL_SUPPLY/4))
      .to.emit(St, "recalculatePaid")
      .withArgs(account1Address,account2Address,500,250);

      spent=await St.spent(deployerAddress);
      expect(spent).to.be.equal(250);
      spent=await St.spent(account1Address);
      expect(spent).to.be.equal(500);
      spent=await St.spent(account2Address);
      expect(spent).to.be.equal(1000);

      await expect(St.connect(Deployer).withdraw())
      .to.emit(St,"withdrawEvent")
      .withArgs(deployerAddress,250);
    });
  });

  describe("ADD/REMOVE EXCLUSIONS", function () {
    it("should only allow the owner to update exclusions", async function () {
        // This will revert because Account1 is not the owner.
        await expect(St.connect(Account1).updateExclusion(account2Address, true))
            .to.be.revertedWithCustomError(St, "OwnableUnauthorizedAccount")
            .withArgs(account1Address);
    });

    it("should prevent adding an already excluded address", async function () {
        // First exclude an address
        const contractAddress: string = await St.getAddress();
        await St.updateExclusion(contractAddress, true);
        // Try to exclude it again
        await expect(St.updateExclusion(contractAddress, true))
          .to.be.revertedWithCustomError(St, "alreadyExcluded")
          .withArgs(contractAddress);
    });

    it("should prevent removing a non-excluded address", async function () {
        // Attempt to include a non-excluded address
        await expect(St.updateExclusion(account1Address, false))
          .to.be.revertedWithCustomError(St, "alreadyNotExcluded")
          .withArgs(account1Address);
    });

    it("should disallow exclusions for invalid addresses", async function () {
        // Test with Zero address, contract's own address, and owner's address
        await expect(St.updateExclusion(ZeroAddress, true))
          .to.be.revertedWithCustomError(St, "notAllowedExlussion")
          .withArgs(ZeroAddress);

        await expect(St.updateExclusion(deployerAddress, true)) // Assuming deployer is the owner
          .to.be.revertedWithCustomError(St, "notAllowedExlussion")
          .withArgs(deployerAddress);

    });

    it("should effectively add and remove exclusions", async function () {
        // Assuming `someContractAddress` is an actual contract address
        const contractAddress: string = await St.getAddress();
        await expect(St.updateExclusion(contractAddress, true))
        .to.emit(St, "updateExclusionEvent")
        .withArgs(contractAddress, true);
        expect(await St.isExcluded(contractAddress)).to.equal(true);

        // Remove exclusion
        await expect(St.updateExclusion(contractAddress, false))
        .to.emit(St, "updateExclusionEvent")
        .withArgs(contractAddress, false);
        expect(await St.isExcluded(contractAddress)).to.equal(false);
    });
  });
});