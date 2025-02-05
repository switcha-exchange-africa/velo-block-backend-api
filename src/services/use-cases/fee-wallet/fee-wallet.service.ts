import { HttpStatus, Injectable, Logger } from "@nestjs/common";
import { Types } from "mongoose";
import { TATUM_PRIVATE_KEY_USER_NAME, TATUM_PRIVATE_KEY_USER_ID, TATUM_PRIVATE_KEY_PIN } from "src/configuration";
import { IDataServices } from "src/core/abstracts";
import { ICreateFeeWallet, IGetWallets, IUpdateFeeWalletAccountId, IUpdateFeeWalletPrivatekey, IUpdateFeeWalletWithAddress, IWithdrawFromFeeWallet } from "src/core/dtos/wallet/wallet.dto";
import { FeeWallet } from "src/core/entities/FeeWallet";
import { CoinType } from "src/core/types/coin";
import { ResponseState, ResponsesType } from "src/core/types/response";
import { encryptData, generateReference } from "src/lib/utils";
import { WithdrawalLib } from "../withdrawal/withdrawal.lib";
import { FeeWalletFactoryService } from "./fee-wallet-factory.service";

@Injectable()
export class FeeWalletServices {
  constructor(
    private readonly data: IDataServices,
    private readonly factory: FeeWalletFactoryService,
    private readonly withdrawalLib: WithdrawalLib
  ) { }
  cleanQueryPayload(payload: IGetWallets) {
    let key = {}
    if (payload.userId) key['userId'] = payload.userId
    if (payload.coin) key['coin'] = payload.coin
    if (payload.perpage) key['perpage'] = payload.perpage
    if (payload.page) key['page'] = payload.page
    if (payload.dateFrom) key['dateFrom'] = payload.dateFrom
    if (payload.dateTo) key['dateTo'] = payload.dateTo
    if (payload.sortBy) key['sortBy'] = payload.sortBy
    if (payload.orderBy) key['orderBy'] = payload.orderBy
    if (payload.reference) key['reference'] = payload.reference

    return key
  }

  async seedWallets(userId: string): Promise<ResponsesType<FeeWallet[]>> {
    try {
      const seed = [
        {
          userId,
          coin: CoinType.BTC,
          reference: generateReference('general')
        },
        {
          userId,
          coin: CoinType.USD,
          reference: generateReference('general')
        },
        {
          userId,
          coin: CoinType.USDC,
          reference: generateReference('general')

        },
        {
          userId,
          coin: CoinType.USDT,
          reference: generateReference('general')

        },
        {
          userId,
          coin: CoinType.USDT_TRON,
          reference: generateReference('general')

        },
        {
          userId,
          coin: CoinType.ETH,
          reference: generateReference('general')

        },
        {
          userId,
          coin: CoinType.NGN,
          reference: generateReference('general')

        },
      ]

      const data = await this.data.feeWallets.create(seed)
      return {
        status: HttpStatus.OK,
        message: "Wallets seeded successfully",
        data,
        state: ResponseState.SUCCESS
      };

    } catch (error) {
      Logger.error(error)
      return Promise.reject({
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        state: ResponseState.ERROR,
        message: error.message,
        error: error
      })
    }
  }

  async getAllWallets(payload: IGetWallets): Promise<ResponsesType<FeeWallet>> {
    try {
      const cleanedPayload = this.cleanQueryPayload(payload)
      const { data, pagination } = await this.data.feeWallets.findAllWithPagination({
        query: cleanedPayload,
        queryFields: {},
        misc: {
          populated: {
            path: 'userId',
            select: '_id firstName lastName email phone'
          }
        }
      });

      return {
        status: HttpStatus.OK,
        message: "Fee Wallets retrieved successfully",
        data,
        pagination,
        state: ResponseState.SUCCESS
      };
    } catch (error) {
      Logger.error(error)
      return Promise.reject({
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        state: ResponseState.ERROR,
        message: error.message,
        error: error
      })
    }
  }

  async getSingleWallet(id: Types.ObjectId): Promise<ResponsesType<FeeWallet>> {
    try {
      const data = await this.data.feeWallets.findOne({ _id: id });
      if (!data) return Promise.reject({
        status: HttpStatus.NOT_FOUND,
        state: ResponseState.ERROR,
        message: 'Wallet does not exist',
        error: null,
      })
      return { status: HttpStatus.OK, message: "Wallet retrieved successfully", data, state: ResponseState.SUCCESS };
    } catch (error) {
      Logger.error(error)
      return Promise.reject({
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        state: ResponseState.ERROR,
        message: error.message,
        error: error
      })
    }
  }



  async updateWalletAddress(payload: IUpdateFeeWalletWithAddress): Promise<ResponsesType<FeeWallet>> {
    try {

      const { id, address, xpub, derivationKey } = payload

      const data = await this.data.feeWallets.findOne({ _id: id });
      if (!data) return Promise.reject({
        status: HttpStatus.NOT_FOUND,
        state: ResponseState.ERROR,
        message: 'Wallet does not exist',
        error: null,
      })

      await this.data.feeWallets.update({ _id: id }, { xpub, derivationKey, address })
      return { status: HttpStatus.OK, message: "Wallet updated successfully", data, state: ResponseState.SUCCESS };

    } catch (error) {
      Logger.error(error)
      return Promise.reject({
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        state: ResponseState.ERROR,
        message: error.message,
        error: error
      })
    }
  }
  async updateWalletAccountId(payload: IUpdateFeeWalletAccountId): Promise<ResponsesType<FeeWallet>> {
    try {

      const { id, accountId } = payload

      const data = await this.data.feeWallets.findOne({ _id: id });
      if (!data) return Promise.reject({
        status: HttpStatus.NOT_FOUND,
        state: ResponseState.ERROR,
        message: 'Wallet does not exist',
        error: null,
      })

      await this.data.feeWallets.update({ _id: id }, { accountId })
      return { status: HttpStatus.OK, message: "Wallet updated successfully", data, state: ResponseState.SUCCESS };

    } catch (error) {
      Logger.error(error)
      return Promise.reject({
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        state: ResponseState.ERROR,
        message: error.message,
        error: error
      })
    }
  }

  async updatePrivateKey(payload: IUpdateFeeWalletPrivatekey): Promise<ResponsesType<FeeWallet>> {
    try {

      const { id, privateKey } = payload

      const data = await this.data.feeWallets.findOne({ _id: id });
      if (!data) return Promise.reject({
        status: HttpStatus.NOT_FOUND,
        state: ResponseState.ERROR,
        message: 'Wallet does not exist',
        error: null,
      })
      const encrypt = encryptData({
        text: privateKey,
        username: TATUM_PRIVATE_KEY_USER_NAME,
        userId: TATUM_PRIVATE_KEY_USER_ID,
        pin: TATUM_PRIVATE_KEY_PIN
      })

      await this.data.feeWallets.update({ _id: id }, { privateKey: encrypt })
      return {
        status: HttpStatus.OK,
        message: "Wallet updated successfully",
        data: {},
        state: ResponseState.SUCCESS
      };

    } catch (error) {
      Logger.error(error)
      return Promise.reject({
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        state: ResponseState.ERROR,
        message: error.message,
        error: error
      })
    }
  }

  async createWallet(payload: ICreateFeeWallet) {
    try {
      const { coin } = payload

      const wallet = await this.data.feeWallets.findOne({ coin })
      if (wallet) {
        return Promise.reject({
          status: HttpStatus.CONFLICT,
          state: ResponseState.ERROR,
          message: 'Wallet already exists',
          error: null
        })
      }

      const factory = await this.factory.create(payload)
      const data = await this.data.feeWallets.create(factory)

      return {
        status: HttpStatus.OK,
        message: "Wallet created successfully",
        data,
        state: ResponseState.SUCCESS,
      };

    } catch (error) {
      Logger.error(error)
      return Promise.reject({
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        state: ResponseState.ERROR,
        message: error.message,
        error: error
      })
    }
  }


  async withdrawWalletAddress(payload: IWithdrawFromFeeWallet) {
    try {

      const { coin, amount, destination, id } = payload
      const wallet = await this.data.feeWallets.findOne({ _id: id, coin })
      if (!wallet) {
        return Promise.reject({
          status: HttpStatus.BAD_REQUEST,
          state: ResponseState.ERROR,
          message: 'Wallet does not exists',
          error: null
        })
      }
      const transfer = await this.withdrawalLib.withdrawal({
        accountId: wallet.accountId,
        coin: wallet.coin,
        amount: String(amount),
        destination,
        index: wallet.derivationKey
      })

      return {
        status: HttpStatus.OK,
        message: "Wallet created successfully",
        data: transfer,
        state: ResponseState.SUCCESS,
      };

    } catch (error) {
      Logger.error(error)
      return Promise.reject({
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        state: ResponseState.ERROR,
        message: error.message,
        error: error
      })
    }
  }
}