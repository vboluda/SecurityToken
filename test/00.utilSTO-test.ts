import { expect, util } from "chai";
import { ethers } from "hardhat";
import { Signer,BigNumber } from "ethers";
import {ST_crypt__factory} from "../types/factories/contracts/ST/ST_crypt__factory";
import {ST_crypt} from "../types/contracts/ST/ST_crypt";

const TOTAL_SUPPLY:number=1000000;

describe("SECURITY TOKEN", function () {
    let Deployer:Signer;
    let Account1:Signer;
    let Account2:Signer;
    let Approved:Signer;

    let deployerAddress:string;
    let account1Address:string;
    let account2Address:string;
    let approvedAddress:string;

    let St_Factory:ST_crypt__factory;
    let St:ST_crypt;


    this.beforeEach(async function () {
      [Deployer,Account1, Account2,Approved] = await ethers.getSigners();
      [
        deployerAddress, 
        account1Address, 
        account2Address,
        approvedAddress
      ] = await Promise.all([
        Deployer.getAddress(),
        Account1.getAddress(),
        Account2.getAddress(),
        Approved.getAddress()
      ]);
      [
        St_Factory
      ] = await Promise.all([
        ethers.getContractFactory("ST_crypt") as Promise<ST_crypt__factory>
      ]);

      St=await St_Factory.deploy("TEST1","TST",TOTAL_SUPPLY);
      
    });


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
  });
});