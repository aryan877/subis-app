## App README

The Subis app is a Next.js frontend application that serves as a dashboard for both subscription providers and subscribers. It provides an intuitive and user-friendly interface for managing subscriptions.

Subscription providers can:

- Create and manage subscription plans
- Set plan prices in USD using Chainlink Price Feeds
- View analytics and monitor subscriber activity
- Fund and create paymasters for gasless subscriptions for users

Subscribers can:

- Deploy their own smart contract wallets gasless through paymaster provided by subscription owner
- Explore available subscription plans
- Subscribe to plans
- Switch plans with prorated refunds and charges depending on upgrades and downgrades
- Manage their subscriptions
- Set daily spending limits in USD using price feeds
- View their subscription history

The app interacts with the deployed smart contracts to facilitate seamless subscription management. It leverages Next.js for efficient rendering and `zksync-ethers` for seamless interaction with the zkSync Sepolia testnet blockchain and smart contracts.

Subis focuses on usability, performance, and security, providing a reliable and user-friendly experience for both subscription providers and subscribers.
