# DreamDEX SDK Integration

This module is the application boundary for DreamDEX Event Contracts. It uses the existing DreamDEX contracts through `@somnia-chain/markets-sdk`; it does not deploy replacement prediction-market contracts.

## Architectural Decisions

- Shannon testnet configuration is environment-backed and uses the SDK's official chain and address constants.
- Market discovery first uses the indexer for breadth, then verifies the live `Trading` status and expiry on-chain before a market is considered tradable.
- Browser wallet binding is separate from market reads. No private key is accepted or stored here.
- The SDK's binary market identity is preserved as `marketId`; the pool address is used only for the associated order-book read because pools can be recycled.

## Files

- [config.ts](./config.ts) creates an unauthenticated Shannon SDK exchange.
- [markets.ts](./markets.ts) discovers tradable binary markets and reads their order books.
- [wallet.ts](./wallet.ts) binds and unbinds a connected wallet client without placing orders.
- [trading.ts](./trading.ts) loads a live binary market and submits Market IOC predictions through the connected browser wallet.

To find DreamDEX client configuration visit [config.ts](./config.ts).

To find live market discovery and order-book logic visit [markets.ts](./markets.ts).

To find the wallet connection boundary visit [wallet.ts](./wallet.ts).

To find live market reads and order submission visit [trading.ts](./trading.ts).

The DreamDEX SDK connection can be found in [config.ts](./config.ts).
