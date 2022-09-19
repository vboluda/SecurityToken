import { expect, util } from "chai";
import { ethers } from "hardhat";
import { Signer,BigNumber } from "ethers";
import {UtilSTO_crypt__factory} from "../types/factories/contracts/STO/utilSTO.sol";
import {UtilSTO_crypt} from "../types/contracts/STO/utilSTO.sol"

const TOTAL_SUPPLY:number=1000000;

describe("STO UTIL", function () {
    let Deployer:Signer;
    let Account1:Signer;
    let Account2:Signer;
    let Approved:Signer;

    let deployerAddress:string;
    let account1Address:string;
    let account2Address:string;
    let approvedAddress:string;

    let UtilSto_Factory:UtilSTO_crypt__factory;
    let UtilSto:UtilSTO_crypt;


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
        UtilSto_Factory
      ] = await Promise.all([
        ethers.getContractFactory("utilSTO_crypt") as Promise<UtilSTO_crypt__factory>
      ]);

      UtilSto=await UtilSto_Factory.deploy("TEST1","TST",TOTAL_SUPPLY);
      await UtilSto.deployed();
      
    });


    it("Check withdraw", async function () {
          await expect(UtilSto.withdraw())
          .to.emit(UtilSto,"withdrawEvent")
          .withArgs(deployerAddress,0);

          await Deployer.sendTransaction({to:UtilSto.address, value:1000});

          await expect(UtilSto.withdraw())
          .to.emit(UtilSto,"withdrawEvent")
          .withArgs(deployerAddress,1000);

          await expect(UtilSto.withdraw())
          .to.emit(UtilSto,"withdrawEvent")
          .withArgs(deployerAddress,0);
    });

    describe("TRANSFER", function () {

      it("Check exceeds balance", async function () {
        await expect(UtilSto.connect(Account1).transfer(account1Address,TOTAL_SUPPLY/2))
        .to.be.revertedWith("Amount exceeds balance");
      });


      it("Check transfer zero funds", async function () {
        let totalReceived:BigNumber=await UtilSto.totalReceived();
        expect(totalReceived).to.be.equal(0);

        let spent:BigNumber=await UtilSto.spent(deployerAddress);
        expect(spent).to.be.equal(0);

        await expect(UtilSto.transfer(account1Address,TOTAL_SUPPLY/2))
        .to.emit(UtilSto, "recalculatePaid")
        .withArgs(deployerAddress,account1Address,0,0);

        let newSpent:BigNumber=await UtilSto.spent(deployerAddress);
        expect(newSpent).to.be.equal(0);

        totalReceived=await UtilSto.totalReceived();
        expect(totalReceived).to.be.equal(0)
    });

    it("Check transfer to accounts without previous funds", async function () {

      let spent:BigNumber=await UtilSto.spent(deployerAddress);
      expect(spent).to.be.equal(0);

      await Deployer.sendTransaction({to:UtilSto.address, value:1000});
      let totalReceived:BigNumber=await UtilSto.totalReceived();
        expect(totalReceived).to.be.equal(1000);

      totalReceived=await UtilSto.totalReceived();
      expect(totalReceived).to.be.equal(1000);

      spent=await UtilSto.spent(deployerAddress);
      expect(spent).to.be.equal(0);

      await expect(UtilSto.connect(Deployer).transfer(account1Address,TOTAL_SUPPLY/2))
      .to.emit(UtilSto, "recalculatePaid")
      .withArgs(deployerAddress,account1Address,1000,0);

      spent=await UtilSto.spent(deployerAddress);
      expect(spent).to.be.equal(500);
      
      await Deployer.sendTransaction({to:UtilSto.address, value:1000});
      totalReceived=await UtilSto.totalReceived();
      expect(totalReceived).to.be.equal(2000);

      await expect(UtilSto.connect(Account1).transfer(account2Address,TOTAL_SUPPLY/4))
      .to.emit(UtilSto, "recalculatePaid")
      .withArgs(account1Address,account2Address,500,0);

      spent=await UtilSto.spent(deployerAddress);
      expect(spent).to.be.equal(500);
      spent=await UtilSto.spent(account1Address);
      expect(spent).to.be.equal(500);
      spent=await UtilSto.spent(account2Address);
      expect(spent).to.be.equal(500);

      await expect(UtilSto.withdraw())
      .to.emit(UtilSto,"withdrawEvent")
      .withArgs(deployerAddress,500);

      await expect(UtilSto.connect(Account1).withdraw())
      .to.emit(UtilSto,"withdrawEvent")
      .withArgs(account1Address,0);

      await expect(UtilSto.connect(Account2).withdraw())
      .to.emit(UtilSto,"withdrawEvent")
      .withArgs(account2Address,0);
    });

    it("Check transfer to account with previous funds", async function () {

      let spent:BigNumber=await UtilSto.spent(deployerAddress);
      expect(spent).to.be.equal(0);

      await Deployer.sendTransaction({to:UtilSto.address, value:1000});
      let totalReceived:BigNumber=await UtilSto.totalReceived();
        expect(totalReceived).to.be.equal(1000);

      totalReceived=await UtilSto.totalReceived();
      expect(totalReceived).to.be.equal(1000);

      spent=await UtilSto.spent(deployerAddress);
      expect(spent).to.be.equal(0);

      await expect(UtilSto.connect(Deployer).transfer(account1Address,TOTAL_SUPPLY/2))
      .to.emit(UtilSto, "recalculatePaid")
      .withArgs(deployerAddress,account1Address,1000,0);

      await expect(UtilSto.connect(Deployer).transfer(account2Address,TOTAL_SUPPLY/4))
      .to.emit(UtilSto, "recalculatePaid")
      .withArgs(deployerAddress,account2Address,0,0);

      await Deployer.sendTransaction({to:UtilSto.address, value:1000});
      totalReceived=await UtilSto.totalReceived();
      expect(totalReceived).to.be.equal(2000);

      await expect(UtilSto.connect(Account1).transfer(account2Address,TOTAL_SUPPLY/4))
      .to.emit(UtilSto, "recalculatePaid")
      .withArgs(account1Address,account2Address,500,250);

      spent=await UtilSto.spent(deployerAddress);
      expect(spent).to.be.equal(250);
      spent=await UtilSto.spent(account1Address);
      expect(spent).to.be.equal(500);
      spent=await UtilSto.spent(account2Address);
      expect(spent).to.be.equal(1000);

      await expect(UtilSto.connect(Deployer).withdraw())
      .to.emit(UtilSto,"withdrawEvent")
      .withArgs(deployerAddress,250);
    });
  });

  describe("TRANSFER FROM", function () {

    this.beforeEach(async function () {
      UtilSto.connect(Account1).approve(approvedAddress,"10000000000000000000000");
      UtilSto.connect(Account2).approve(approvedAddress,"10000000000000000000000");
      UtilSto.connect(Deployer).approve(approvedAddress,"10000000000000000000000");
    });

    it("Check exceeds balance", async function () {
      await expect(UtilSto.connect(Approved).transferFrom(account1Address,account2Address,TOTAL_SUPPLY/2))
      .to.be.revertedWith("Amount exceeds balance");
    });


    it("Check transfer zero funds", async function () {
      let totalReceived:BigNumber=await UtilSto.totalReceived();
      expect(totalReceived).to.be.equal(0);

      let spent:BigNumber=await UtilSto.spent(deployerAddress);
      expect(spent).to.be.equal(0);

      await expect(UtilSto.connect(Approved).transferFrom(deployerAddress,account1Address,TOTAL_SUPPLY/2))
      .to.emit(UtilSto, "recalculatePaid")
      .withArgs(deployerAddress,account1Address,0,0);

      let newSpent:BigNumber=await UtilSto.spent(deployerAddress);
      expect(newSpent).to.be.equal(0);

      totalReceived=await UtilSto.totalReceived();
      expect(totalReceived).to.be.equal(0)
  });

  it("Check transfer to accounts without previous funds", async function () {

    let spent:BigNumber=await UtilSto.spent(deployerAddress);
    expect(spent).to.be.equal(0);

    await Deployer.sendTransaction({to:UtilSto.address, value:1000});
    let totalReceived:BigNumber=await UtilSto.totalReceived();
      expect(totalReceived).to.be.equal(1000);

    totalReceived=await UtilSto.totalReceived();
    expect(totalReceived).to.be.equal(1000);

    spent=await UtilSto.spent(deployerAddress);
    expect(spent).to.be.equal(0);

    await expect(UtilSto.connect(Approved).transferFrom(deployerAddress,account1Address,TOTAL_SUPPLY/2))
    .to.emit(UtilSto, "recalculatePaid")
    .withArgs(deployerAddress,account1Address,1000,0);

    spent=await UtilSto.spent(deployerAddress);
    expect(spent).to.be.equal(500);
    
    await Deployer.sendTransaction({to:UtilSto.address, value:1000});
    totalReceived=await UtilSto.totalReceived();
    expect(totalReceived).to.be.equal(2000);

    await expect(UtilSto.connect(Approved).transferFrom(account1Address,account2Address,TOTAL_SUPPLY/4))
    .to.emit(UtilSto, "recalculatePaid")
    .withArgs(account1Address,account2Address,500,0);

    spent=await UtilSto.spent(deployerAddress);
    expect(spent).to.be.equal(500);
    spent=await UtilSto.spent(account1Address);
    expect(spent).to.be.equal(500);
    spent=await UtilSto.spent(account2Address);
    expect(spent).to.be.equal(500);

    await expect(UtilSto.withdraw())
    .to.emit(UtilSto,"withdrawEvent")
    .withArgs(deployerAddress,500);

    await expect(UtilSto.connect(Account1).withdraw())
    .to.emit(UtilSto,"withdrawEvent")
    .withArgs(account1Address,0);

    await expect(UtilSto.connect(Account2).withdraw())
    .to.emit(UtilSto,"withdrawEvent")
    .withArgs(account2Address,0);
  });

  it("Check transfer to account with previous funds", async function () {

    let spent:BigNumber=await UtilSto.spent(deployerAddress);
    expect(spent).to.be.equal(0);

    await Deployer.sendTransaction({to:UtilSto.address, value:1000});
    let totalReceived:BigNumber=await UtilSto.totalReceived();
      expect(totalReceived).to.be.equal(1000);

    totalReceived=await UtilSto.totalReceived();
    expect(totalReceived).to.be.equal(1000);

    spent=await UtilSto.spent(deployerAddress);
    expect(spent).to.be.equal(0);

    await expect(UtilSto.connect(Approved).transferFrom(deployerAddress,account1Address,TOTAL_SUPPLY/2))
    .to.emit(UtilSto, "recalculatePaid")
    .withArgs(deployerAddress,account1Address,1000,0);

    await expect(UtilSto.connect(Approved).transferFrom(deployerAddress,account2Address,TOTAL_SUPPLY/4))
    .to.emit(UtilSto, "recalculatePaid")
    .withArgs(deployerAddress,account2Address,0,0);

    await Deployer.sendTransaction({to:UtilSto.address, value:1000});
    totalReceived=await UtilSto.totalReceived();
    expect(totalReceived).to.be.equal(2000);

    await expect(UtilSto.connect(Approved).transferFrom(account1Address,account2Address,TOTAL_SUPPLY/4))
    .to.emit(UtilSto, "recalculatePaid")
    .withArgs(account1Address,account2Address,500,250);

    spent=await UtilSto.spent(deployerAddress);
    expect(spent).to.be.equal(250);
    spent=await UtilSto.spent(account1Address);
    expect(spent).to.be.equal(500);
    spent=await UtilSto.spent(account2Address);
    expect(spent).to.be.equal(1000);

    await expect(UtilSto.connect(Deployer).withdraw())
    .to.emit(UtilSto,"withdrawEvent")
    .withArgs(deployerAddress,250);
  });
  });
});