import React, { useState, useEffect } from 'react';
// import { SwapWidget } from '@uniswap/widgets/dist/index.js';
import { useShallowSelector } from 'hooks/useShallowSelector';
import { selectMain } from 'store/main/selectors';
import { ethers } from 'ethers';
import styles from './styles.module.scss';
import { getUnderlyingToken } from 'utils/getUnderlyingToken';
import { getContract } from 'utils/getContract';
import { erc20ABI, swapABI } from 'constants/abis';
import { SwapModal } from './SwapModal';
import { AlphaRouter } from '@uniswap/smart-order-router';
import { CurrencyAmount, Percent, Token, TradeType } from '@uniswap/sdk-core';
import { Protocol } from '@uniswap/router-sdk';
import { JSBI } from '@uniswap/sdk';
import { swapContractAddress } from 'constants/polygon_config';
// import '@uniswap/widgets/dist/fonts.css';

interface IProps {}

export const SwapContainer: React.FC<IProps> = () => {
	const { web3, address } = useShallowSelector(selectMain);
	const [isLoading, setIsLoading] = useState<boolean>(true);
	const [provider, setProvider] = useState<ethers.providers.Web3Provider>();
	const [router, setRouter] = useState<AlphaRouter>();
	const [inputSuperToken, setInputSuperToken] = useState('');
	const [outputSuperToken, setOutputSuperToken] = useState('');
	const [inputToken, setInputToken] = useState<Token>();
	const [outputToken, setOutputToken] = useState<Token>();
	const [inputAmount, setInputAmount] = useState('');
	const [outputAmount, setOutputAmount] = useState('');
	const [swapConfig, setSwapConfig] = useState<{
		fromTokenAddress: string;
		toTokenAddress: string;
		multi: number;
		key:
			| 'hasDaixApprove'
			| 'hasUsdcxApprove'
			| 'hasWethxApprove'
			| 'hasMkrxApprove'
			| 'hasWbtcxApprove'
			| 'hasMaticxApprove'
			| 'hasSushixApprove'
			| 'hasIdlexApprove';
	}>();
	const jsonRpcEndpoint = 'https://polygon-rpc.com/';
	const providerX = new ethers.providers.Web3Provider(web3.currentProvider as any);
	const signer = providerX.getSigner();

	const swapContract = getContract(swapContractAddress, swapABI, signer);

	useEffect(() => {
		if (web3.currentProvider) {
			const web3Provider = new ethers.providers.Web3Provider(web3.currentProvider as any);
			setProvider(web3Provider);
			const newRouter = new AlphaRouter({
				chainId: 137,
				provider: provider as any,
			});
			setRouter(newRouter);
		}
	}, [web3.currentProvider]);

	const setChosenInputToken = (token: string) => {
		const underlyingToken = getUnderlyingToken(token);
		setInputToken(underlyingToken);
		console.log('setChosenInputToken', underlyingToken);
	};

	const setChosenOutputToken = (token: string) => {
		const underlyingToken = getUnderlyingToken(token);
		setOutputToken(underlyingToken);
	};

	const handleApprove = async () => {
		setChosenInputToken(inputSuperToken);
		setChosenOutputToken(outputSuperToken);
		console.log(inputSuperToken, inputToken);
		try {
			// @ts-ignore
			const tokenContract = getContract(inputToken.address, erc20ABI, web3);
			await tokenContract.methods.approve(inputToken?.address, inputAmount).send({
				from: address,
			});
		} catch (e) {
			console.log(e);
		}
	};

	const handleSwapButtonClick = async () => {
		setChosenInputToken(inputSuperToken);
		setChosenOutputToken(outputSuperToken);
		// console.log(
		// 	'this shows us our progress 2 ',
		// 	inputSuperToken,
		// 	outputSuperToken,
		// 	inputToken,
		// 	outputToken,
		// 	inputAmount,
		// 	outputAmount,
		// );
		// console.log('test 3');
		try {
			await handleSwap();
		} catch (error) {
			console.log(error);
		}
	};

	async function handleSwap() {
		if (inputToken === undefined || outputToken === undefined || address === undefined) {
			console.log('In handleSwap() this wont work');
			return;
		}

		const currencyAmount = CurrencyAmount.fromRawAmount(
			/* @ts-ignore */
			inputToken,
			JSBI.BigInt(inputAmount),
		);

		const route = await router.route(
			currencyAmount,
			// @ts-ignore
			outputToken,
			TradeType.EXACT_INPUT,
			{
				recipient: address,
				slippageTolerance: new Percent(5, 100),
				deadline: 10000,
			},
			{ minSplits: 0, protocols: [Protocol.V3, Protocol.V2] },
		);

		const path = route?.route[0].route.tokenPath.map((token) => token.address);

		const fees = route?.route[0].route.pools.map((pool) => pool.fee);

		if (route && inputToken !== undefined && outputToken !== undefined) {
			const response = swapContract.methods
				.swap(
					inputToken.address,
					outputToken.address,
					inputAmount + '0'.repeat(inputToken.decimals),
					0,
					path,
					fees,
				)
				.send({
					from: address,
					maxPriorityFeePerGas: 30 * 10 ** 9,
				});
			console.log(response);
		} else {
			console.log(inputToken, outputToken);
		}
	}

	return (
		<div className={styles.outer_container}>
			{provider !== null ? (
				<SwapModal
					inputAmount={inputAmount}
					outputAmount={outputAmount}
					inputSuperToken={inputSuperToken}
					outputSuperToken={outputSuperToken}
					setInputSuperToken={setInputSuperToken}
					setInputAmount={setInputAmount}
					setOutputSuperToken={setOutputSuperToken}
					setOutputAmount={setOutputAmount}
					handleSwap={handleSwapButtonClick}
					handleApprove={handleApprove}
				/>
			) : (
				'this is a failing test'
			)}
		</div>
	);
};
