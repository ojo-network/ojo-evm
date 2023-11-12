test-unit-contract:
	yarn hardhat test

compile-contract:
	yarn hardhat compile && yarn hardhat export-abi

lint-contract:
	yarn solhint 'contracts/**/*.sol'

update-abi:
	yarn hardhat export-abi
