// SPDX-License-Identifier: BSL-1.1
pragma solidity ^0.8.20;

import "./IValidator.sol";

/**
 * @title IAllowAllValidator
 * @notice Interface for a validator that allows all transactions without additional checks.
 */
interface IAllowAllValidator is IValidator {}
