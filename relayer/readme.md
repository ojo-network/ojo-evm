# Ojo Relayer

Ojo Relayer is a service that anyone can run to periodically push price feeds from the Ojo blockchain to an Ojo contract deployed to an EVM chain. This service is normally run by the Ojo core team, but anyone can run it.

## Quick Start

1. Install the Ojo Relayer
2. Set up your configuration file
3. Run the relayer

For detailed instructions, see the [Installation](#installation), [Configuration](#configuration), and [Usage](#usage) sections.

## Installation

To install the Ojo Relayer:

1. Ensure you have Go 1.21 or later installed.
2. Clone the repository: `git clone https://github.com/ojo-network/ojo-evm.git`
3. Navigate to the project directory: `cd ojo-evm/relayer`
4. Run `make install`

Alternatively, you can download a pre-built binary from our recent [releases](https://github.com/ojo-network/ojo-evm/releases).

## Compatibility

| Ojo Relayer Version | Ojo Version |
|---------------------|-------------|
| v0.1.x              | v0.3.x      |

## Configuration

The Ojo relayer uses a toml file for configuration. You can find an example [here](./relayer.toml).

### `gas`

The `gas` field is the amount of gas to use for the transaction.
The `gas_prices` field is the amount of gas to use for the transaction.

### `account`

The `account` section is used to specify the account that will be used to sign transactions on the Ojo blockchain. The chain-id should always be `agamotto`.

For example:
```toml
[account]
address = "ojo1kjqcup59v5jtlykewz90em6v0cz7tqpd7u7nyr"
chain_id = "agamotto"
```

### `keyring`

The `keyring` field is the keyring to use for the transaction.

Our keyring must be set up to sign transactions before running the relayer.
Additional info on the different keyring modes is available [here](https://docs.cosmos.network/v0.46/run-node/keyring.html).
**Please note that the `test` and `memory` modes are only for testing purposes.**
**Do not use these modes for running the relayer against mainnet.**

The keyring `dir` and `backend` are defined in the config file.
You may use the `KEYRING_PASS` environment variable to set up the keyring password.

Ex :
`export KEYRING_PASS=keyringPassword`

If this environment variable is not set, the relayer will prompt the user for input.

### `rpc`

The `rpc` section is used to specify the RPC endpoints for the Ojo blockchain. We generally suggest using a local Ojo node for development purposes. Please see [these docs](https://docs.ojo.network/networks/agamotto#start-a-full-node) for running a node on the Ojo blockchain.

For example:
```toml
[rpc]
grpc_endpoint = "localhost:9090"
rpc_timeout = "100ms"
tmrpc_endpoint = "http://localhost:26657"
```

### `relayer`

These config values are used to specify how often the relayer pushed prices, and to where.

```toml
[relayer]
interval = "24h"
deviation = "0.05"
destination = "Arbitrum"
contract = "0x001"
```

The `interval` field will determine how often to send a heartbeat, if the price doesn't deviate by more than `deviation` percentage in a given period.
The `deviation` field is the percentage of deviation allowed before a new price update is sent.
The `destination` field is the name of the EVM chain that you want to push the price feeds to. This directory is managed by Axelar and can be found [here](https://docs.axelar.dev/resources/contract-addresses/mainnet/).

The `contract` field is the address of the Ojo contract on the EVM chain.

Here are the publicly supported contract addresses:

| Chain    | Contract Address |
|----------|------------------|
| Ethereum | [0x5BB3E85f91D08fe92a3D123EE35050b763D6E6A7](https://etherscan.io/address/0x5BB3E85f91D08fe92a3D123EE35050b763D6E6A7) |
| Arbitrum | [0x5BB3E85f91D08fe92a3D123EE35050b763D6E6A7](https://arbiscan.io/address/0x5BB3E85f91D08fe92a3D123EE35050b763D6E6A7) |

### `assets`

The assets array specifies which assets you want to push. You can have one relayer instance per asset or have it handle multiple assets.

```toml
[[assets]]
denom = "BTC"
[[assets]]
denom = "ETH"
```

### `axelar_gas`

This section determines how much gas to pay the Axelar relayer for the transaction. The relayer will use axelar's gas estimator to determine how much AXL gas is used for each transaction.

This is an example with the IBC representation of the AXL token on agamotto:
```toml
[axelar_gas]
denom = "ibc/0E1517E2771CA7C03F2ED3F9BAECCAEADF0BFD79B89679E834933BC0F179AD98"
multiplier = "1.2"
default = "1000000"
```

How much each transaction will cost in AXL is different for each chain, and will vary with the usage of each chain (for example, pushing prices to Ethereum is more expensive than Arbitrum).

## Running

To run the relayer, you can use the following commands:

`relayer config.toml`
`relayer version`
