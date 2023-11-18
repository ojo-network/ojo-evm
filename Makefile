test-unit:
	yarn hardhat test

compile-contracts:
	yarn hardhat compile && yarn hardhat export-abi

lint-contracts:
	yarn solhint 'contracts/**/*.sol'

update-abi:
	yarn hardhat export-abi
