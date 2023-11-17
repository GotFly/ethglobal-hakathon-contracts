import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@openzeppelin/hardhat-upgrades";

require('dotenv').config();

const config = {
  solidity: {
    version: "0.8.17",
    settings: {
      optimizer: {
        enabled: true,
        runs: 1000,
      }
    },
  },
  defaultNetwork: "localhost",
  gasReporter: {
    enabled: true,
  },
  networks: {
    // hardhat: {
    //   chainId: 1
    // },
    localhost: {
      url: process.env.NETWORK_HOST_LOCALHOST,
      accounts: [
        process.env.OWNER_1_PK_LOCALHOST,
        process.env.OWNER_2_PK_LOCALHOST,
        process.env.OWNER_3_PK_LOCALHOST,
        process.env.OWNER_4_PK_LOCALHOST,
        process.env.OWNER_5_PK_LOCALHOST,
      ],
      chainId: 31337
    },
  },
};

export default config;
