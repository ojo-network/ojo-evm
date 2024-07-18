package config

import (
	"errors"
	"time"

	"github.com/go-playground/validator/v10"
)

const (
	SampleNodeConfigPath = "relayer.toml"
)

var (
	validate = validator.New()

	// ErrEmptyConfigPath defines a sentinel error for an empty config path.
	ErrEmptyConfigPath = errors.New("empty configuration file path")
)

type (
	// Config defines all necessary configuration parameters.
	Config struct {
		ConfigDir string    `mapstructure:"config_dir"`
		Account   Account   `mapstructure:"account" validate:"required,gt=0,dive,required"`
		Keyring   Keyring   `mapstructure:"keyring" validate:"required,gt=0,dive,required"`
		RPC       RPC       `mapstructure:"rpc" validate:"required,gt=0,dive,required"`
		Gas       uint64    `mapstructure:"gas"`
		GasPrices string    `mapstructure:"gas_prices"`
		Relayer   Relayer   `mapstructure:"relayer" validate:"required,gt=0,dive,required"`
		Assets    []Assets  `mapstructure:"assets" validate:"required,gt=0,dive,required"`
		AxelarGas AxelarGas `mapstructure:"axelar_gas" validate:"required,gt=0,dive,required"`
	}

	// Account defines account related configuration that is related to the Ojo
	// network and transaction signing functionality.
	Account struct {
		ChainID string `mapstructure:"chain_id" validate:"required"`
		Address string `mapstructure:"address" validate:"required"`
	}

	// Keyring defines the required Ojo keyring configuration.
	Keyring struct {
		Backend string `mapstructure:"backend" validate:"required"`
		Dir     string `mapstructure:"dir" validate:"required"`
	}

	// RPC defines RPC configuration of both the Ojo gRPC and Tendermint nodes.
	RPC struct {
		TMRPCEndpoint string `mapstructure:"tmrpc_endpoint" validate:"required"`
		GRPCEndpoint  string `mapstructure:"grpc_endpoint" validate:"required"`
		RPCTimeout    string `mapstructure:"rpc_timeout" validate:"required"`
	}

	Relayer struct {
		Interval    time.Duration `mapstructure:"interval" validate:"required"`
		Deviation   float64       `mapstructure:"deviation" validate:"required"`
		Destination string        `mapstructure:"destination" validate:"required"`
		Contract    string        `mapstructure:"contract" validate:"required"`
	}

	AxelarGas struct {
		Denom      string `mapstructure:"denom" validate:"required"`
		Multiplier string `mapstructure:"multiplier" validate:"required"`
		Default    string `mapstructure:"default" validate:"required"`
	}

	Assets struct {
		Denom string `mapstructure:"denom" validate:"required"`
	}
)

// Validate returns an error if the Config object is invalid.
func (c Config) Validate() (err error) {
	return validate.Struct(c)
}

// noop
func (c *Config) setDefaults() {
}
