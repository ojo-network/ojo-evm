package relayer

import (
	"context"
	"strings"
	"time"

	"github.com/cosmos/cosmos-sdk/telemetry"
	sdk "github.com/cosmos/cosmos-sdk/types"
	ibctransfertypes "github.com/cosmos/ibc-go/v8/modules/apps/transfer/types"
	"github.com/ojo-network/ojo-evm/relayer/config"
	"github.com/ojo-network/ojo-evm/relayer/relayer/client"
	gmptypes "github.com/ojo-network/ojo/x/gmp/types"
	pfsync "github.com/ojo-network/price-feeder/pkg/sync"
	"github.com/rs/zerolog"
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

func (r *Relayer) tick(ctx context.Context) error {
	r.logger.Debug().Msg("executing relayer tick")

	// Check if it is our first tick
	if len(r.latestAssets) == 0 {
		latestAssets := make([]asset, len(r.cfg.Assets))
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

			// Relay price
			if err := r.relay(v.Denom); err != nil {
				r.logger.Err(err).Msg("unable to relay price")
				return err
			}
		}

		// Set to memory
		r.latestAssets = latestAssets
		return nil
	}

	// if not, check for heartbeats and deviations
	for _, v := range r.latestAssets {
		// if heartbeat needs to be sent, relay
		if heartbeat(r.cfg.Relayer.Interval, v.lastRelay) {
			err := r.relay(v.denom)
			if err != nil {
				return err
			}

			// update memory
			v.lastRelay = time.Now()
			v.lastPrice, err = r.getPrice(ctx, v.denom)
			if err != nil {
				r.logger.Err(err).Msg("unable to communicate with ojo node")
				return err
			}
			return nil
		}

		// if price has deviated, send a relay
		price, err := r.getPrice(ctx, v.denom)
		if err != nil {
			r.logger.Err(err).Msg("unable to communicate with ojo node")
			return err
		}
		if deviated(price, r.cfg.Relayer.Deviation, v.lastPrice) {

			err := r.relay(v.denom)
			if err != nil {
				return err
			}

			v.lastRelay = time.Now()
			v.lastPrice = price
			return nil
		}
	}

	return nil
}

// heartbeat checks the time since last relay and returns true if we need to relay.
func heartbeat(interval time.Duration, lastUpdate time.Time) bool {
	return time.Since(lastUpdate) > interval
}

// deviated checks if the price has deviated from the last price by the deviation %.
func deviated(price float64, deviation float64, lastPrice float64) bool {
	return price > lastPrice*(1+deviation) || price < lastPrice*(1-deviation)
}

// relay sends a relay message to the Ojo node.
func (r Relayer) relay(denom string) error {
	// normalize the coin denom
	coins, err := sdk.ParseCoinNormalized(r.cfg.Relayer.Tokens)
	if err != nil {
		return err
	}
	if !strings.HasPrefix(coins.Denom, "ibc/") {
		denomTrace := ibctransfertypes.ParseDenomTrace(coins.Denom)
		coins.Denom = denomTrace.IBCDenom()
	}

	msg := gmptypes.NewMsgRelay(
		r.cfg.Account.Address,
		r.cfg.Relayer.Destination,
		"0x001", // ojo contract address - empty
		r.cfg.Relayer.Contract,
		coins, // tokens we're paying with
		[]string{denom},
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
