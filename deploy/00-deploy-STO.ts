import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import { ethers } from "hardhat";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy,log} = deployments;
  const {deployer} = await getNamedAccounts();

  let configHardhat:any=hre.config.networks[hre.network.name];
  let config:any=configHardhat.DEPLOY;

  const ARGS=[
    config.STO_NAME,
    config.STO_SYMBOL,
    config.INITIAL_SUPPLY
  ]
  //console.log("Parameters: "+JSON.stringify(ARGS));
  let deployResult:any = await deploy('ST_crypt', {
    from: deployer,
    args: ARGS,
    log: true
  });
  if (!deployResult.newlyDeployed) {
    log(
      `Reusing STO_crypt deployed at ${deployResult.address}`
    );
  }else{
    log(
      ` NEW STO_crypt deployed at  ${deployResult.address}  using ${deployResult.receipt.gasUsed} gas`
    );

    if(config.VERIFY){
      await hre.run("verify:verify",{
        address:deployResult.address,
        constructorArguments:ARGS
      });
    };
  }
};

export default func;
func.tags = ['ST_crypt'];