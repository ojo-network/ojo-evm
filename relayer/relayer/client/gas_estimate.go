package client

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"

	math "cosmossdk.io/math"
)

// Assuming the endpoint URL is something like this
const (
	endpointURL = "https://api.axelarscan.io/gmp/estimateGasFee"
	sourceChain = "ojo"
)

// executeData is an example value used to estimate
// the cost of a GMP relay. In practice, this value is constructed
// by the Ojo validators dynamically.
// Ref: https://github.com/ojo-network/ojo/blob/2965d45976ea63053dc84b910b37ea46a06730b5/x/gmp/keeper/keeper.go#L88
// nolint: lll
const executeData = "0x00000000000000000000000000000000000000000000000000000000000000a00000000000000000000000000000000000000000000000000000000000000b20000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000b60000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000205245374c52540000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000003a2642918000000000000000000000000000000000000000000000000000000000066960af100000000000000000000000000000000000000000000000000000000000000800000000000000000000000000000000000000000000000000000000000000060000000000000000000000000000000000000000000000000000000000000038000000000000000000000000000000000000000000000000000000000000006a0000000000000000000000000000000000000000000000000000000000000001800000000000000000000000000000000000000000000000000000000005eebff00000000000000000000000000000000000000000000000000000000005ee4f700000000000000000000000000000000000000000000000000000000005eddef00000000000000000000000000000000000000000000000000000000005ed6e700000000000000000000000000000000000000000000000000000000005ecfdf00000000000000000000000000000000000000000000000000000000005ec8d700000000000000000000000000000000000000000000000000000000005ec1cf00000000000000000000000000000000000000000000000000000000005ebac700000000000000000000000000000000000000000000000000000000005eb3bf00000000000000000000000000000000000000000000000000000000005eacb700000000000000000000000000000000000000000000000000000000005ea5af00000000000000000000000000000000000000000000000000000000005e9ea700000000000000000000000000000000000000000000000000000000005e979f00000000000000000000000000000000000000000000000000000000005e909700000000000000000000000000000000000000000000000000000000005e898f00000000000000000000000000000000000000000000000000000000005e828700000000000000000000000000000000000000000000000000000000005e7b7f00000000000000000000000000000000000000000000000000000000005e747700000000000000000000000000000000000000000000000000000000005e6d6f00000000000000000000000000000000000000000000000000000000005f0f2700000000000000000000000000000000000000000000000000000000005f081f00000000000000000000000000000000000000000000000000000000005f011700000000000000000000000000000000000000000000000000000000005efa0f00000000000000000000000000000000000000000000000000000000005ef307000000000000000000000000000000000000000000000000000000000000001800000000000000000000000000000000000000000000000000000396fb886e0000000000000000000000000000000000000000000000000000000390b235200000000000000000000000000000000000000000000000000000000392e8739f000000000000000000000000000000000000000000000000000000039341dbce000000000000000000000000000000000000000000000000000000038de6f3a8000000000000000000000000000000000000000000000000000000037fb311860000000000000000000000000000000000000000000000000000000376da178a00000000000000000000000000000000000000000000000000000003677c2f7600000000000000000000000000000000000000000000000000000003674094ac0000000000000000000000000000000000000000000000000000000365daf3f000000000000000000000000000000000000000000000000000000003693b3861000000000000000000000000000000000000000000000000000000036cd7179c0000000000000000000000000000000000000000000000000000000368e1d032000000000000000000000000000000000000000000000000000000036386e80c0000000000000000000000000000000000000000000000000000000364b0edfe00000000000000000000000000000000000000000000000000000003632d7fdd000000000000000000000000000000000000000000000000000000035f383873000000000000000000000000000000000000000000000000000000035d01f9f4000000000000000000000000000000000000000000000000000000035cc65f2a00000000000000000000000000000000000000000000000000000003b1dfde9100000000000000000000000000000000000000000000000000000003b46f853f00000000000000000000000000000000000000000000000000000003b522559d00000000000000000000000000000000000000000000000000000003a61dd5b8000000000000000000000000000000000000000000000000000000039e15797f000000000000000000000000000000000000000000000000000000000000000018000000000000000000000000000000000000000000000000000000029baff41400000000000000000000000000000000000000000000000000000001b79f446d000000000000000000000000000000000000000000000000000000025c7afe17000000000000000000000000000000000000000000000000000000026b4946bc000000000000000000000000000000000000000000000000000000016f821e43000000000000000000000000000000000000000000000000000000062b0deeee00000000000000000000000000000000000000000000000000000002882b577e00000000000000000000000000000000000000000000000000000003cf8ec3f800000000000000000000000000000000000000000000000000000000da9873a400000000000000000000000000000000000000000000000000000000fe66049e000000000000000000000000000000000000000000000000000000014fadc3c300000000000000000000000000000000000000000000000000000001912acb0e00000000000000000000000000000000000000000000000000000000ecec7ca600000000000000000000000000000000000000000000000000000002ffe0015500000000000000000000000000000000000000000000000000000001919cfdd300000000000000000000000000000000000000000000000000000003b249cbd0000000000000000000000000000000000000000000000000000000011c81159200000000000000000000000000000000000000000000000000000000d5a49cb800000000000000000000000000000000000000000000000000000000f1dedade00000000000000000000000000000000000000000000000000000001e84f443f00000000000000000000000000000000000000000000000000000001b9921fc6000000000000000000000000000000000000000000000000000000071e341559000000000000000000000000000000000000000000000000000000043b0ba83e000000000000000000000000000000000000000000000000000000021ec0616700000000000000000000000000000000000000000000000000000000000000015245374c525400000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000"

// RequestBody defines the structure of the request body.
// Adjust the fields according to the actual API requirements.
type RequestBody struct {
	DestinationChain   string `json:"destinationChain"`
	ExecuteData        string `json:"executeData"`
	DestinationAddress string `json:"destinationAddress"`
	GasLimit           string `json:"gasLimit"`
	SourceChain        string `json:"sourceChain"`
	ShowDetailedFees   bool   `json:"showDetailedFees"`
}
type ResponseBody struct {
	TotalFee string `json:"totalFee"`
	Message  string `json:"message"`
	Error    bool   `json:"error"`
}

// EstimateGasFee performs a JSON POST request to estimate gas fee on Axelar.
// Its output is a math.Int representing the total fee
// denominated in uaxl.
func EstimateGasFee(
	destinationChain,
	destinationAddress,
	gasLimit,
	multiplier string,
) (math.Int, error) {
	// construct and perform request
	body := RequestBody{
		DestinationChain:   destinationChain,
		ExecuteData:        executeData,
		DestinationAddress: destinationAddress,
		GasLimit:           gasLimit,
		SourceChain:        sourceChain,
		ShowDetailedFees:   true,
	}
	jsonBody, err := json.Marshal(body)
	if err != nil {
		return math.ZeroInt(), err
	}
	req, err := http.NewRequest("POST", endpointURL, bytes.NewBuffer(jsonBody))
	if err != nil {
		return math.ZeroInt(), err
	}
	req.Header.Set("Content-Type", "application/json")
	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return math.ZeroInt(), err
	}
	defer resp.Body.Close()

	// parse response
	responseBody := &ResponseBody{}
	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return math.ZeroInt(), err
	}
	err = json.Unmarshal(respBody, responseBody)
	if err != nil {
		return math.ZeroInt(), err
	}
	if responseBody.Error {
		return math.ZeroInt(), fmt.Errorf(responseBody.Message)
	}

	// execute multiplier
	fee, ok := math.NewIntFromString(responseBody.TotalFee)
	if !ok {
		return math.ZeroInt(), fmt.Errorf("failed to convert total fee to int")
	}
	m, ok := math.NewIntFromString(multiplier)
	if !ok {
		return fee, nil
	}
	return fee.Mul(m), nil
}
