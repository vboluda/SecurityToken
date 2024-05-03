import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "hardhat-deploy";
import 'dotenv/config';

const DUMMY_PK:string     = "0x0000000000000000000000000000000000000000000000000000000000000000";

const config: HardhatUserConfig = {
  solidity: {
    compilers: [
      {version: "0.8.0"},
      {version: "0.8.4"},
      {version: "0.8.8"},
      {version: "0.8.9"},
      {version: "0.8.20"}
    ]
  },
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
    outDir: "types",
    target: "ethers-v6",
  },
  etherscan: {
    apiKey: `${process.env.ETHERSCAN_API_KEY}`,
  },
  networks: {
    hardhat: {
      chainId: 1337,
      live:false,
      blockGasLimit:10000000000,
      DEPLOY:{
        STO_NAME:"TEST001",
        STO_SYMBOL:"T001",
        INITIAL_SUPPLY:"1000000000000000000000000", //1M
        DEFAULT_RECIPENT:"0x5FbDB2315678afecb367f032d93F642f64180aa3",
        VERIFY:false
      }
    },
    sepolia: {
      url: "https://rpc2.sepolia.org",
      accounts: [`${process.env.DEV_PK_SEPOLIA_DEPLOYER ? process.env.DEV_PK_SEPOLIA_DEPLOYER : DUMMY_PK}`],
      chainId: 11155111,
      DEPLOY:{
        STO_NAME:"TEST002",
        STO_SYMBOL:"T002",
        INITIAL_SUPPLY:"1000000000000000000000000", // 1M
        DEFAULT_RECIPENT:"0x5FbDB2315678afecb367f032d93F642f64180aa3",
        VERIFY:true
      }
    },  
  }
};

export default config;
