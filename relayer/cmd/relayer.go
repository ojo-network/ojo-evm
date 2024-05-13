package cmd

import (
	"bufio"
	"context"
	"fmt"
	"io"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"github.com/cosmos/cosmos-sdk/client/input"
	"github.com/ojo-network/ojo-evm/relayer/config"
	"github.com/ojo-network/ojo-evm/relayer/relayer"
	"github.com/ojo-network/ojo-evm/relayer/relayer/client"
	"github.com/ojo-network/ojo/app/params"
	"github.com/rs/zerolog"
	"github.com/spf13/cobra"
	"golang.org/x/sync/errgroup"
)

const (
	logLevelJSON = "json"
	logLevelText = "text"

	flagLogLevel  = "log-level"
	flagLogFormat = "log-format"

	envVariablePass = "KEYRING_PASS"
)

var rootCmd = &cobra.Command{
	Use:   "relayer [config-file]",
	Args:  cobra.ExactArgs(1),
	Short: "relayer is a tool that interacts with the GMP module to relay price feeds to EVM.",
	Long: `A tool that anyone can use to trigger relays from the Ojo blockchain to a given EVM.
	This is used to support Ojo's "Core" price feeds, which receive periodic push updates in addition
	to the pull-based relayer events triggered by the two-way GMP calls.`,
	RunE: relayerCmdHandler,
}

func init() {
	// We need to set our bech32 address prefix because it was moved
	// out of ojo's init function.
	// Ref: https://github.com/ojo-network/ojo/pull/63
	params.SetAddressPrefixes()
	rootCmd.PersistentFlags().String(flagLogLevel, zerolog.InfoLevel.String(), "logging level")
	rootCmd.PersistentFlags().String(flagLogFormat, logLevelText, "logging format; must be either json or text")
}

// Execute adds all child commands to the root command and sets flags appropriately.
// This is called by main.main(). It only needs to happen once to the rootCmd.
func Execute() {
	if err := rootCmd.Execute(); err != nil {
		fmt.Println(err)
		os.Exit(1)
	}
}

func relayerCmdHandler(cmd *cobra.Command, args []string) error {
	logLvlStr, err := cmd.Flags().GetString(flagLogLevel)
	if err != nil {
		return err
	}

	logLvl, err := zerolog.ParseLevel(logLvlStr)
	if err != nil {
		return err
	}

	logFormatStr, err := cmd.Flags().GetString(flagLogFormat)
	if err != nil {
		return err
	}

	var logWriter io.Writer
	switch strings.ToLower(logFormatStr) {
	case logLevelJSON:
		logWriter = os.Stderr

	case logLevelText:
		logWriter = zerolog.ConsoleWriter{Out: os.Stderr}

	default:
		return fmt.Errorf("invalid logging format: %s", logFormatStr)
	}

	cfg, err := config.LoadConfigFromFlags(args[0], "")
	if err != nil {
		return err
	}

	ctx, cancel := context.WithCancel(cmd.Context())
	g, ctx := errgroup.WithContext(ctx)

	logger := zerolog.New(logWriter).Level(logLvl).With().Timestamp().Logger()

	// listen for and trap any OS signal to gracefully shutdown and exit
	trapSignal(cancel, logger)

	// Gather pass via env variable || std input
	keyringPass, err := getKeyringPassword()
	if err != nil {
		return err
	}

	// placeholder rpc timeout
	rpcTimeout := time.Second * 10

	relayerClient, err := client.NewRelayerClient(
		ctx,
		logger,
		cfg.Account.ChainID,
		cfg.Keyring.Backend,
		cfg.Keyring.Dir,
		keyringPass,
		cfg.RPC.TMRPCEndpoint,
		rpcTimeout,
		cfg.Account.Address,
		cfg.RPC.GRPCEndpoint,
		cfg.Gas,
		cfg.GasPrices,
	)
	if err != nil {
		return err
	}

	relayer, err := relayer.New(logger, relayerClient, cfg)
	if err != nil {
		return err
	}

	g.Go(func() error {
		// start the process that observes and publishes exchange prices
		return startRelayer(ctx, logger, relayer)
	})

	// Block main process until all spawned goroutines have gracefully exited and
	// signal has been captured in the main process or if an error occurs.
	return g.Wait()
}

// trapSignal will listen for any OS signal and invoke Done on the main
// WaitGroup allowing the main process to gracefully exit.
func trapSignal(cancel context.CancelFunc, logger zerolog.Logger) {
	sigCh := make(chan os.Signal, 1)

	signal.Notify(sigCh, syscall.SIGTERM)
	signal.Notify(sigCh, syscall.SIGINT)

	go func() {
		sig := <-sigCh
		logger.Info().Str("signal", sig.String()).Msg("caught signal; shutting down...")
		cancel()
	}()
}

func getKeyringPassword() (string, error) {
	reader := bufio.NewReader(os.Stdin)

	pass := os.Getenv(envVariablePass)
	if pass == "" {
		return input.GetString("Enter keyring password", reader)
	}
	return pass, nil
}

func startRelayer(ctx context.Context, logger zerolog.Logger, r *relayer.Relayer) error {
	srvErrCh := make(chan error, 1)

	go func() {
		logger.Info().Msg("starting relayer..")
		srvErrCh <- r.Start(ctx)
	}()

	for {
		select {
		case <-ctx.Done():
			logger.Info().Msg("shutting down relayer..")
			return nil

		case err := <-srvErrCh:
			logger.Err(err).Msg("error starting the relayer relayer")
			r.Stop()
			return err
		}
	}
}
