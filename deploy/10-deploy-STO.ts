import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import { ethers } from "hardhat";
import {UtilSTO_crypt__factory} from "../types/factories/contracts/STO/UtilSTO_crypt__factory";
import {UtilSTO_crypt} from "../types/contracts/STO/UtilSTO_crypt";


const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy,log} = deployments;
  const {deployer} = await getNamedAccounts();

  let config:any=hre.config.networks[hre.network.name];
  let stoConfig:any=config.STO;

  const ARGS=[
    stoConfig.NAME,
    stoConfig.SYMBOL,
    stoConfig.SUPPLY
  ]
  //console.log("Parameters: "+JSON.stringify(ARGS));
  let deployResult:any = await deploy('utilSTO_crypt', {
    from: deployer,
    args: ARGS,
    log: true
  });

  console.log("RECEIPT "+JSON.stringify(deployResult.receipt))

  if (!deployResult.newlyDeployed) {
    log(
      `Reusing utilSTO_crypt deployed at ${deployResult.address}`
    );
  }else{
    log(
      ` NEW utilSTO_crypt deployed at  ${deployResult.address}  using ${deployResult.receipt.gasUsed} gas`
    ); 
  }
  if(stoConfig.VERIFY){
    await hre.run("verify:verify",{
      address:deployResult.address,
      constructorArguments:ARGS
    });
  }
};

export default func;
func.tags = ['STO'];