import { task } from "hardhat/config";
import  "hardhat-deploy";
import 'hardhat-deploy-ethers';
import '@typechain/hardhat'
import '@nomiclabs/hardhat-ethers'
import '@nomiclabs/hardhat-waffle'
import '@nomiclabs/hardhat-etherscan'
import 'solidity-coverage'
import 'dotenv/config';

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  solidity: {
    compilers: [
      {version: "0.8.8"}
    ]
  },
  defaultNetwork: "hardhat",
  paths: {
    deploy: 'deploy',
    deployments: 'deployments',
    imports: 'imports'
  },
  namedAccounts: {
    deployer: {
        default: 0, 
        137: 0, 
        80001: 0, 
    }
  },
  typechain: {
    outDir: 'types',
    target: 'ethers-v5',
    alwaysGenerateOverloads: false, // should overloads with full signatures like deposit(uint256) be generated always, even if there are no overloads?
    externalArtifacts: ['externalArtifacts/*.json'], // optional array of glob patterns with external artifacts to process (for example external libs from node_modules)
  },
  etherscan: {
    apiKey: "4XEX8ASQ6CQXE44V4VQSSC2CV34CWE3XPK"
 },
  networks: {
    hardhat: {
      chainId: 1337,
      live:false,
      blockGasLimit:5000000000,
      STO:{
        NAME:"EXAMPLE",
        SYMBOL:"EXE",
        SUPPLY:"1000000000000000000000000",
        VERIFY:false
      }
    },
    mumbai: {
      url: "https://polygon-mumbai.g.alchemy.com/v2/OUBRXjHqGBRh15xnv-rX5cgNBfgId0YH",
      accounts: [`${process.env.maticwallet}`],
      chainId: 80001,
      STO:{
        NAME:"EXAMPLE",
        SYMBOL:"EXE",
        SUPPLY:"1000000000000000000000000",
        VERIFY:true
      }
    }
  }
};
