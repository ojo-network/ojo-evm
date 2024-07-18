package client

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"io"
	"os"
	"time"

	rpchttp "github.com/cometbft/cometbft/rpc/client/http"
	tmjsonclient "github.com/cometbft/cometbft/rpc/jsonrpc/client"
	"github.com/cosmos/cosmos-sdk/client"
	"github.com/cosmos/cosmos-sdk/client/flags"
	"github.com/cosmos/cosmos-sdk/client/rpc"
	"github.com/cosmos/cosmos-sdk/client/tx"
	"github.com/cosmos/cosmos-sdk/crypto/keyring"
	"github.com/cosmos/cosmos-sdk/telemetry"
	sdk "github.com/cosmos/cosmos-sdk/types"
	"github.com/cosmos/cosmos-sdk/types/module/testutil"
	"github.com/cosmos/cosmos-sdk/types/tx/signing"
	authtypes "github.com/cosmos/cosmos-sdk/x/auth/types"
	ojoparams "github.com/ojo-network/ojo/app/params"
	oracletypes "github.com/ojo-network/ojo/x/oracle/types"
	"github.com/rs/zerolog"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
)

type (
	// RelayerClient defines a structure that interfaces with the Ojo node.
	RelayerClient struct {
		Logger            zerolog.Logger
		ChainID           string
		KeyringBackend    string
		KeyringDir        string
		KeyringPass       string
		TMRPC             string
		RPCTimeout        time.Duration
		RelayerAddr       sdk.AccAddress
		RelayerAddrString string
		Encoding          testutil.TestEncodingConfig
		GasPrices         string
		Gas               uint64
		GRPCEndpoint      string
		KeyringPassphrase string
		ChainHeight       *ChainHeight
	}

	passReader struct {
		pass string
		buf  *bytes.Buffer
	}
)

func NewRelayerClient(
	ctx context.Context,
	logger zerolog.Logger,
	chainID string,
	keyringBackend string,
	keyringDir string,
	keyringPass string,
	tmRPC string,
	rpcTimeout time.Duration,
	relayerAddrString string,
	grpcEndpoint string,
	gas uint64,
	gasPrices string,
) (RelayerClient, error) {
	relayerAddr, err := sdk.AccAddressFromBech32(relayerAddrString)
	if err != nil {
		return RelayerClient{}, err
	}

	relayerClient := RelayerClient{
		Logger:            logger.With().Str("module", "relayer_client").Logger(),
		ChainID:           chainID,
		KeyringBackend:    keyringBackend,
		KeyringDir:        keyringDir,
		KeyringPass:       keyringPass,
		TMRPC:             tmRPC,
		RPCTimeout:        rpcTimeout,
		RelayerAddr:       relayerAddr,
		RelayerAddrString: relayerAddrString,
		Encoding:          ojoparams.MakeEncodingConfig(),
		Gas:               gas,
		GasPrices:         gasPrices,
		GRPCEndpoint:      grpcEndpoint,
	}

	clientCtx, err := relayerClient.CreateClientContext()
	if err != nil {
		return RelayerClient{}, err
	}

	blockHeight, err := rpc.GetChainHeight(clientCtx)
	if err != nil {
		return RelayerClient{}, err
	}

	chainHeight, err := NewChainHeight(
		ctx,
		clientCtx.Client,
		relayerClient.Logger,
		blockHeight,
	)
	if err != nil {
		return RelayerClient{}, err
	}
	relayerClient.ChainHeight = chainHeight

	return relayerClient, nil
}

func newPassReader(pass string) io.Reader {
	return &passReader{
		pass: pass,
		buf:  new(bytes.Buffer),
	}
}

func (r *passReader) Read(p []byte) (n int, err error) {
	n, err = r.buf.Read(p)
	if err == io.EOF || n == 0 {
		r.buf.WriteString(r.pass + "\n")

		n, err = r.buf.Read(p)
	}

	return n, err
}

// CreateClientContext creates an SDK client Context instance used for transaction
// generation, signing and broadcasting.
func (oc RelayerClient) CreateClientContext() (client.Context, error) {
	var keyringInput io.Reader
	if len(oc.KeyringPass) > 0 {
		keyringInput = newPassReader(oc.KeyringPass)
	} else {
		keyringInput = os.Stdin
	}

	kr, err := keyring.New("oracle", oc.KeyringBackend, oc.KeyringDir, keyringInput, oc.Encoding.Codec)
	if err != nil {
		return client.Context{}, err
	}

	httpClient, err := tmjsonclient.DefaultHTTPClient(oc.TMRPC)
	if err != nil {
		return client.Context{}, err
	}

	httpClient.Timeout = oc.RPCTimeout

	tmRPC, err := rpchttp.NewWithClient(oc.TMRPC, "/websocket", httpClient)
	if err != nil {
		return client.Context{}, err
	}

	keyInfo, err := kr.KeyByAddress(oc.RelayerAddr)
	if err != nil {
		return client.Context{}, err
	}
	clientCtx := client.Context{
		ChainID:           oc.ChainID,
		InterfaceRegistry: oc.Encoding.InterfaceRegistry,
		Output:            os.Stderr,
		BroadcastMode:     flags.BroadcastSync,
		TxConfig:          oc.Encoding.TxConfig,
		AccountRetriever:  authtypes.AccountRetriever{},
		Codec:             oc.Encoding.Codec,
		LegacyAmino:       oc.Encoding.Amino,
		Input:             os.Stdin,
		NodeURI:           oc.TMRPC,
		Client:            tmRPC,
		Keyring:           kr,
		FromAddress:       oc.RelayerAddr,
		FromName:          keyInfo.Name,
		From:              keyInfo.Name,
		OutputFormat:      "json",
		UseLedger:         false,
		Simulate:          false,
		GenerateOnly:      false,
		Offline:           false,
		SkipConfirm:       true,
	}

	return clientCtx, nil
}

// CreateTxFactory creates an SDK Factory instance used for transaction
// generation, signing and broadcasting.
func (oc RelayerClient) CreateTxFactory() (tx.Factory, error) {
	clientCtx, err := oc.CreateClientContext()
	if err != nil {
		return tx.Factory{}, err
	}

	return tx.Factory{}.
		WithAccountRetriever(clientCtx.AccountRetriever).
		WithChainID(oc.ChainID).
		WithTxConfig(clientCtx.TxConfig).
		WithGas(oc.Gas).
		WithGasPrices(oc.GasPrices).
		WithKeybase(clientCtx.Keyring).
		WithSignMode(signing.SignMode_SIGN_MODE_DIRECT).
		WithSimulateAndExecute(true), nil
}

// GetPrice gets the current price of an asset from the Ojo node.
func (r *RelayerClient) GetPrice(ctx context.Context, denom string) (sdk.DecCoin, error) {
	grpcConn, err := grpc.Dial(
		r.GRPCEndpoint,
		// the Cosmos SDK doesn't support any transport security mechanism
		grpc.WithTransportCredentials(insecure.NewCredentials()),
		grpc.WithContextDialer(dialerFunc),
	)
	// retry or switch rpc
	if err != nil {
		r.Logger.Debug().Msg("error querying exchange rates")
		return sdk.DecCoin{}, err
	}

	defer grpcConn.Close()

	queryClient := oracletypes.NewQueryClient(grpcConn)

	ctx, cancel := context.WithTimeout(ctx, r.RPCTimeout)
	defer cancel()

	queryResponse, err := queryClient.ExchangeRates(ctx, &oracletypes.QueryExchangeRates{
		Denom: denom,
	})

	if err != nil || queryResponse.ExchangeRates.Empty() {
		r.Logger.Debug().Msg("error querying exchange rates")
		return sdk.DecCoin{}, err
	}

	return queryResponse.ExchangeRates[0], nil
}

// BroadcastTx attempts to broadcast a signed transaction. If it fails, a few re-attempts
// will be made until the transaction succeeds or ultimately times out or fails.
func (rc RelayerClient) BroadcastTx(nextBlockHeight, timeoutHeight int64, msgs ...sdk.Msg) error {
	maxBlockHeight := nextBlockHeight + timeoutHeight
	lastCheckHeight := nextBlockHeight - 1

	clientCtx, err := rc.CreateClientContext()
	if err != nil {
		return err
	}

	factory, err := rc.CreateTxFactory()
	if err != nil {
		return err
	}

	// re-try voting until timeout
	for lastCheckHeight < maxBlockHeight {
		latestBlockHeight, err := rc.ChainHeight.GetChainHeight()
		if err != nil {
			return err
		}

		if latestBlockHeight <= lastCheckHeight {
			continue
		}

		// set last check height to latest block height
		lastCheckHeight = latestBlockHeight

		resp, err := BroadcastTx(clientCtx, factory, msgs...)
		if resp != nil && resp.Code != 0 {
			telemetry.IncrCounter(1, "failure", "tx", "code")
			err = fmt.Errorf("invalid response code from tx: %d. msg: %s",
				resp.Code,
				resp.RawLog,
			)
		}
		if err != nil {
			var (
				code uint32
				hash string
			)
			if resp != nil {
				code = resp.Code
				hash = resp.TxHash
			}

			rc.Logger.Debug().
				Err(err).
				Int64("max_height", maxBlockHeight).
				Int64("last_check_height", lastCheckHeight).
				Str("tx_hash", hash).
				Uint32("tx_code", code).
				Msg("failed to broadcast tx; retrying...")

			time.Sleep(time.Second * 1)
			continue
		}

		rc.Logger.Info().
			Uint32("tx_code", resp.Code).
			Str("tx_hash", resp.TxHash).
			Int64("tx_height", resp.Height).
			Msg("successfully broadcasted tx")

		return nil
	}

	return errors.New("broadcasting tx timed out")
}
