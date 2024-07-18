package relayer

import (
	"context"
	"fmt"
	"time"

	"github.com/cosmos/cosmos-sdk/telemetry"
	sdk "github.com/cosmos/cosmos-sdk/types"
	"github.com/ojo-network/ojo-evm/relayer/config"
	"github.com/ojo-network/ojo-evm/relayer/relayer/client"
	gmptypes "github.com/ojo-network/ojo/x/gmp/types"
	pfsync "github.com/ojo-network/price-feeder/pkg/sync"
	"github.com/rs/zerolog"

	math "cosmossdk.io/math"
)

const (
	tickerSleep      = 500 * time.Millisecond
	broadcastTimeout = 5 // how many blocks to wait for a tx to be included
)

type asset struct {
	lastPrice float64
	lastRelay time.Time
	denom     string
}

// Relayer defines a structure that interfaces with the Ojo node.
type Relayer struct {
	logger      zerolog.Logger
	closer      *pfsync.Closer
	ChainHeight *client.ChainHeight

	relayerClient client.RelayerClient
	cfg           config.Config

	latestAssets []asset // latest price and relay time
}

func New(
	logger zerolog.Logger,
	relayerClient client.RelayerClient,
	cfg config.Config,
) (*Relayer, error) {
	return &Relayer{
		relayerClient: relayerClient,
		cfg:           cfg,
		logger:        logger.With().Str("module", "relayer").Logger(),
		closer:        pfsync.NewCloser(),
		latestAssets:  []asset{},
	}, nil
}

// Start starts the relayer process in a blocking fashion.
func (r *Relayer) Start(ctx context.Context) error {
	for {
		select {
		case <-ctx.Done():
			r.closer.Close()

		default:
			r.logger.Debug().Msg("starting relayer tick")

			startTime := time.Now()

			if err := r.tick(ctx); err != nil {
				telemetry.IncrCounter(1, "failure", "tick")
				r.logger.Err(err).Msg("relayer tick failed")
			}

			telemetry.MeasureSince(startTime, "runtime", "tick")
			telemetry.IncrCounter(1, "new", "tick")

			time.Sleep(tickerSleep)
		}
	}
}

// Stop stops the relayer process and waits for it to gracefully exit.
func (o *Relayer) Stop() {
	o.closer.Close()
	<-o.closer.Done()
}

// init initializes the relayer by submitting a relay for
// each asset in the config and setting the latest price info
// in memory.
func (r *Relayer) init(ctx context.Context) error {
	latestAssets := make([]asset, len(r.cfg.Assets))
	batch := []string{}
	for k, v := range r.cfg.Assets {
		// Get price
		price, err := r.relayerClient.GetPrice(ctx, v.Denom)
		if err != nil {
			r.logger.Err(err).Msg("unable to communicate with ojo node")
			return err
		}
		priceFl, err := price.Amount.Float64()
		if err != nil {
			r.logger.Err(err).Msg("unable to convert price to float64")
			return err
		}

		// Set latest update in memory
		latestAssets[k] = asset{
			lastPrice: priceFl,
			lastRelay: time.Now(),
			denom:     v.Denom,
		}

		// Add to batch
		batch = append(batch, v.Denom)
	}

	// Relay price
	if err := r.relay(batch); err != nil {
		r.logger.Err(err).Msg("unable to submit initial relays")
		return err
	}

	// Set to memory
	r.latestAssets = latestAssets
	return nil
}

// updateMemory takes a set of denoms and updates the memory with the latest price
// and timestamp.
func (r *Relayer) updateMemory(ctx context.Context, denoms []string) error {
	for _, v := range denoms {
		price, err := r.getPrice(ctx, v)
		if err != nil {
			r.logger.Err(err).Msg("unable to communicate with ojo node")
			return err
		}

		for k, a := range r.latestAssets {
			if a.denom == v {
				r.latestAssets[k].lastPrice = price
				r.latestAssets[k].lastRelay = time.Now()
			}
		}
	}

	return nil
}

func (r *Relayer) tick(ctx context.Context) error {
	r.logger.Debug().Msg("executing relayer tick")

	// check if it is our first tick
	if len(r.latestAssets) == 0 {
		err := r.init(ctx)
		if err != nil {
			return err
		}
		return nil
	}

	// if it's not our first tick, check to see if we need
	// to do any relays.

	// denomsBatch is a slice of denoms that we need to relay
	batch := []string{}

	// if not, check for heartbeats and deviations
	for _, v := range r.latestAssets {
		// if heartbeat needs to be sent, relay
		if heartbeat(r.cfg.Relayer.Interval, v.lastRelay) {
			batch = append(batch, v.denom)
			r.logger.Info().Str("denom", v.denom).Msg("heartbeat relay")
			continue
		}

		// if price has deviated, send a relay
		price, err := r.getPrice(ctx, v.denom)
		if err != nil {
			r.logger.Err(err).Msg("unable to communicate with ojo node")
			return err
		}
		pct, dev := deviated(v.lastPrice, price, r.cfg.Relayer.Deviation)
		if dev {
			batch = append(batch, v.denom)
			r.logger.Info().Str("denom", v.denom).
				Float64("last_updated_price", v.lastPrice).
				Float64("new_price", price).
				Float64("deviation_percentage", pct).
				Float64("deviation_threshold", r.cfg.Relayer.Deviation).
				Msg("deviation relay")
		}
	}

	// batch relays and then update memory
	if len(batch) > 0 {
		if err := r.relay(batch); err != nil {
			r.logger.Err(err).Msg("unable to relay price")
			return err
		}
		r.updateMemory(ctx, batch)
	} else {
		r.logger.Debug().Msg("no relays necessary")
	}

	return nil
}

// heartbeat checks the time since last relay and returns true if we need to relay.
func heartbeat(interval time.Duration, lastUpdate time.Time) bool {
	return time.Since(lastUpdate) >= interval
}

// deviated checks if the price has deviated from the last price by the deviation %.
func deviated(existingPrice float64, newestPrice float64, threshold float64) (float64, bool) {
	if existingPrice == 0 {
		return 0, false
	}

	// calculate the deviation percentage between price and lastPrice
	deviationPct := (newestPrice - existingPrice) / existingPrice

	// get absolute value
	if deviationPct < 0 {
		deviationPct *= -1
	}

	return deviationPct, deviationPct >= threshold
}

// relay sends a relay message to the Ojo node.
func (r Relayer) relay(denoms []string) error {
	r.logger.Info().Strs("denoms", denoms).Msg("submitting relay tx")

	gasFee, err := client.EstimateGasFee(
		r.cfg.Relayer.Destination,
		r.cfg.Relayer.Contract,
		r.cfg.AxelarGas.Default,
		r.cfg.AxelarGas.Multiplier,
	)
	if err != nil {
		r.logger.Err(err).Str("default", r.cfg.AxelarGas.Default).Msg("unable to estimate gas fee")
		defaultGasFee, ok := math.NewIntFromString(r.cfg.AxelarGas.Default)
		if !ok {
			return fmt.Errorf("unable to convert default gas fee to int")
		}
		gasFee = defaultGasFee
	}
	coins := sdk.Coin{
		Denom:  r.cfg.AxelarGas.Denom,
		Amount: gasFee,
	}
	r.logger.Info().Strs("gas_fee", []string{coins.String()}).Msg("estimated gas fee")

	msg := gmptypes.NewMsgRelay(
		r.cfg.Account.Address,
		r.cfg.Relayer.Destination,
		r.cfg.Relayer.Contract,
		"0x001",           // ojo contract address - empty
		coins,             // tokens we're paying with
		denoms,            // tokens we're relaying
		[]byte{},          // command selector - empty
		[]byte{},          // params - empty, no callback
		time.Now().Unix(), // unix timestamp
	)
	currentHeight, err := r.relayerClient.ChainHeight.GetChainHeight()
	if err != nil {
		return err
	}

	return r.relayerClient.BroadcastTx(currentHeight, broadcastTimeout, msg)
}

// getPrice is a util function to get the price of a given denom as a float64.
func (r Relayer) getPrice(ctx context.Context, denom string) (float64, error) {
	price, err := r.relayerClient.GetPrice(ctx, denom)
	if err != nil {
		return 0, err
	}

	return price.Amount.Float64()
}
