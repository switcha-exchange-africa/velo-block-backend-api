import { TransactionFactoryService } from "src/services/use-cases/transaction/transaction-factory.services";
import { Transaction } from "src/core/entities/transaction.entity";
import { TransactionReference } from "src/core/entities/transaction-reference.entity";
import {
  BadRequestsException,
  DoesNotExistsException,
} from "src/services/use-cases/user/exceptions";
import { Injectable, Logger } from "@nestjs/common";
import { IDataServices } from "src/core/abstracts";
import { SwapDto } from "src/core/dtos/trade/swap.dto";
import { CRYPTO_API_KEY, TATUM_BASE_URL } from "src/configuration";
import { IHttpServices } from "src/core/abstracts/http-services.abstract";
import {
  COIN_TYPES,
  CUSTOM_TRANSACTION_TYPE,
  TRANSACTION_STATUS,
  TRANSACTION_SUBTYPE,
  TRANSACTION_TYPE,
} from "src/lib/constants";

import * as mongoose from "mongoose";
import databaseHelper from "src/frameworks/data-services/mongo/database-helper";
import { InjectConnection } from "@nestjs/mongoose";
import { ResponsesType } from "src/core/types/response";

@Injectable()
export class SwapServices {
  constructor(
    private dataServices: IDataServices,
    private http: IHttpServices,
    private txFactoryServices: TransactionFactoryService,
    @InjectConnection() private readonly connection: mongoose.Connection
  ) {}

  async swap(body: SwapDto, userId: string): Promise<ResponsesType<any>> {
    const { amount, currency1, currency2 } = body;
    const [user, buyCryptoWallet, sellCryptoWallet] = await Promise.all([
      this.dataServices.users.findOne({ _id: userId }),
      this.dataServices.wallets.findOne({
        userId,
        coin: currency1,
      }),
      this.dataServices.wallets.findOne({
        userId,
        coin: currency2,
      }),
    ]);
    if (!user) throw new DoesNotExistsException("user does not exist");
    if (!buyCryptoWallet || !sellCryptoWallet)
      throw new DoesNotExistsException("wallet does not exist");
    const url1 = `${TATUM_BASE_URL}/rate/${buyCryptoWallet.coin}?basePair=${COIN_TYPES.NGN}`;
    const url2 = `${TATUM_BASE_URL}/rate/${sellCryptoWallet.coin}?basePair=${COIN_TYPES.NGN}`;
    const config = {
      headers: {
        "X-API-Key": CRYPTO_API_KEY,
      },
    };
    const [{ value: value1 }, { value: value2 }] = await Promise.all([
      this.http.get(url1, config),
      this.http.get(url2, config),
    ]);

    const currencyAmount = parseFloat(((value1 * amount) / value2).toFixed(4));

    let updatedBuyCryptoWallet, updatedSellCryptoWallet, txFactory: any;
    const atomicTransaction = async (session: mongoose.ClientSession) => {
      try {
        updatedBuyCryptoWallet = await this.dataServices.wallets.update(
          {
            _id: buyCryptoWallet._id,
          },
          {
            $inc: {
              balance: amount,
            },
          },
          session
        );

        if (!updatedBuyCryptoWallet) {
          Logger.error("Error Occurred");
          throw new BadRequestsException("Error Occurred");
        }

        updatedSellCryptoWallet = await this.dataServices.wallets.update(
          {
            _id: sellCryptoWallet,
            balance: { $gt: 0, $gte: currencyAmount },
          },
          {
            $inc: {
              balance: -currencyAmount,
            },
          },
          session
        );
        if (!updatedSellCryptoWallet) {
          Logger.error("Error Occurred");
          throw new BadRequestsException("Error Occurred");
        }
        const txRefPayload: TransactionReference = {
          userId,
          amount,
        };
        const txRef = await this.dataServices.transactionReferences.create(
          txRefPayload,
          session
        );
        const txPayload: Transaction = {
          userId,
          walletId: updatedBuyCryptoWallet?._id,
          txRefId: txRef?._id,
          currency: currency1,
          amount,
          signedAmount: amount,
          type: TRANSACTION_TYPE.CREDIT,
          description: "swap currency",
          status: TRANSACTION_STATUS.COMPLETED,
          balanceAfter: updatedBuyCryptoWallet?.balance,
          balanceBefore: buyCryptoWallet?.balance,
          hash: txRef?.hash,
          subType: TRANSACTION_SUBTYPE.CREDIT,
          customTransactionType: CUSTOM_TRANSACTION_TYPE.SWAP,
        };

        txFactory = await this.txFactoryServices.create(txPayload);
        await this.dataServices.transactions.create(txFactory, session);
      } catch (error) {
        Logger.error(error);
        throw new Error(error);
      }
    };
    await databaseHelper.executeTransaction(atomicTransaction, this.connection);
    return {
      message: `swap successful`,
      data: { ...txFactory, currency1Rate: value1, currency2Rate: value2 },
      status: 200,
    };
  }
}
