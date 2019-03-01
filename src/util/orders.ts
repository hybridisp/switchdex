import { assetDataUtils, BigNumber, generatePseudoRandomSalt, Order } from '0x.js';

import { FEE_RECIPIENT, MAKER_FEE, TAKER_FEE, ZERO_ADDRESS } from '../common/constants';

import { getEthereumPriceInUSD } from './market_prices';
import { tokenAmountInUnits } from './tokens';
import { OrderSide } from './types';

interface BuildOrderParams {
    account: string;
    tokenAddress: string;
    wethAddress: string;
    amount: BigNumber;
    price: BigNumber;
    exchangeAddress: string;
}

export const buildOrder = (params: BuildOrderParams, side: OrderSide): Order => {
    const { account, exchangeAddress, amount, price, tokenAddress, wethAddress } = params;
    const tomorrow = new BigNumber(Math.floor(new Date().valueOf() / 1000) + 3600 * 24);

    const tokenAssetData = assetDataUtils.encodeERC20AssetData(tokenAddress);
    const wethAssetData = assetDataUtils.encodeERC20AssetData(wethAddress);

    return {
        exchangeAddress,
        expirationTimeSeconds: tomorrow,
        feeRecipientAddress: FEE_RECIPIENT,
        makerAddress: account,
        makerAssetAmount: side === OrderSide.Buy ? amount.mul(price) : amount,
        makerAssetData: side === OrderSide.Buy ? wethAssetData : tokenAssetData,
        takerAddress: ZERO_ADDRESS,
        takerAssetAmount: side === OrderSide.Buy ? amount : amount.mul(price),
        takerAssetData: side === OrderSide.Buy ? tokenAssetData : wethAssetData,
        makerFee: new BigNumber(MAKER_FEE),
        takerFee: new BigNumber(TAKER_FEE),
        salt: generatePseudoRandomSalt(),
        senderAddress: '0x0000000000000000000000000000000000000000',
    };
};

export const orderDetailsFeeEther = (
    makerAmount: BigNumber,
    takerAmount: BigNumber,
    orderType: OrderSide,
    makerFeeConstant: string = MAKER_FEE,
    takerFeeConstant: string = TAKER_FEE,
    tokenDecimals: number = 18,
): BigNumber => {
    let totalFee = new BigNumber(1);

    // Convert the makerAmount
    const makerAmountConverted = new BigNumber(tokenAmountInUnits(makerAmount, tokenDecimals));
    if (orderType === OrderSide.Sell) {
        // Calculate makerFee
        const makerFeeWithoutPrice = makerAmountConverted.mul(makerFeeConstant);
        const makerFeeWithPrice = makerFeeWithoutPrice.mul(takerAmount.div(makerAmountConverted));

        // Calculate takerFee
        const takerFee = takerAmount.mul(takerFeeConstant);

        // Total plus
        totalFee = makerFeeWithPrice.plus(takerFee);
    }

    if (orderType === OrderSide.Buy) {
        // Calculate makerFee
        const makerFee = makerAmountConverted.mul(makerFeeConstant);

        // Calculate takerFee
        const takerFeeWithoutPrice = takerAmount.mul(takerFeeConstant);
        const takerFeeWithPrice = takerFeeWithoutPrice.mul(makerAmountConverted.div(takerAmount));

        // Total plus
        totalFee = takerFeeWithPrice.plus(makerFee);
    }

    return totalFee;
};

export const orderDetailsFeeDollar = async (
    makerAmount: BigNumber,
    takerAmount: BigNumber,
    orderType: OrderSide,
    makerFeeConstant: string = MAKER_FEE,
    takerFeeConstant: string = TAKER_FEE,
    tokenDecimals: number = 18,
): Promise<any> => {
    const priceInEther = orderDetailsFeeEther(
        makerAmount,
        takerAmount,
        orderType,
        makerFeeConstant,
        takerFeeConstant,
        tokenDecimals,
    );
    const priceInDollar = await getEthereumPriceInUSD();
    return priceInEther.mul(priceInDollar);
};
