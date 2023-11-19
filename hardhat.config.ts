import "@nomicfoundation/hardhat-toolbox";
import "@openzeppelin/hardhat-upgrades";

require('dotenv').config();

import './tasks/accounts_task';
import './tasks/deployloan_task';
import './tasks/deploystable_task';
import './tasks/deployborrowerlp_task';

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
    arbitrumMainnet: {
      url: process.env.NETWORK_HOST_ARBITRUM,
      accounts: [process.env.OWNER_PK_FINANCE],
      chainId: 42161
    },
    polygonMainnet: {
      url: process.env.NETWORK_HOST_POLYGON,
      accounts: [process.env.OWNER_PK_FINANCE],
      chainId: 137
    },
    polygonZkMainnet: {
      url: process.env.NETWORK_HOST_POLYGONZK,
      accounts: [process.env.OWNER_PK_FINANCE],
      chainId: 1101
    },
    gnosisMainnet: {
      url: process.env.NETWORK_HOST_GNOSIS,
      accounts: [process.env.OWNER_PK_FINANCE],
      chainId: 100
    },
    mantleMainnet: {
      url: process.env.NETWORK_HOST_MANTLE,
      accounts: [process.env.OWNER_PK_FINANCE],
      chainId: 5000
    },
    celoMainnet: {
      url: process.env.NETWORK_HOST_CELO,
      accounts: [process.env.OWNER_PK_FINANCE],
      chainId: 42220
    },
    baseMainnet: {
      url: process.env.NETWORK_HOST_BASE,
      accounts: [process.env.OWNER_PK_FINANCE],
      chainId: 8453
    },
    xdcMainnet: {
      url: process.env.NETWORK_HOST_XDC,
      accounts: [process.env.OWNER_PK_FINANCE],
      chainId: 50
    },
    lineaMainnet: {
      url: process.env.NETWORK_HOST_LINEA,
      accounts: [process.env.OWNER_PK_FINANCE],
      chainId: 59144
    },
    scrollMainnet: {
      url: process.env.NETWORK_HOST_SCROLL,
      accounts: [process.env.OWNER_PK_FINANCE],
      chainId: 534352
    },
    scrollTestnet: {
      url: process.env.NETWORK_HOST_SCROLL_TESTNET,
      accounts: [process.env.OWNER_PK_FINANCE_TESTNET],
      chainId: 534351
    },
    ethereumTestnet: {
      url: process.env.NETWORK_HOST_ETHEREUM_TESTNET,
      accounts: [process.env.OWNER_PK_FINANCE_TESTNET],
      chainId: 11155111
    },
    polygonTestnet: {
      url: process.env.NETWORK_HOST_POLYGON_TESTNET,
      accounts: [process.env.OWNER_PK_FINANCE_TESTNET],
      chainId: 80001
    },
  },
};

export default config;
