import { Injectable } from "@nestjs/common";
import { Transaction } from "src/core/entities/transaction.entity";
import { OptionalQuery } from "src/core/types/database";

@Injectable()
export class TransactionFactoryService {
  create(data: OptionalQuery<Transaction>) {
    const transaction = new Transaction();
    if (data.userId) transaction.userId = data.userId;
    if (data.walletId) transaction.walletId = data.walletId;
    if (data.currency) transaction.currency = data.currency;
    if (data.signedAmount) transaction.signedAmount = data.signedAmount;
    if (data.amount) transaction.amount = data.amount;
    if (data.type) transaction.type = data.type;
    if (data.subType) transaction.subType = data.subType;
    if (data.status) transaction.status = data.status;
    if (data.balanceAfter) transaction.balanceAfter = data.balanceAfter;
    if (data.balanceBefore) transaction.balanceBefore = data.balanceBefore;
    if (data.rate) transaction.rate = data.rate;
    if (data.customTransactionType) transaction.customTransactionType = data.customTransactionType;
    if (data.tatumTransactionId) transaction.tatumTransactionId = data.tatumTransactionId;
    if (data.senderAddress) transaction.senderAddress = data.senderAddress
    if (data.reference) transaction.reference = data.reference
    if (data.description) transaction.description = data.description
    if (data.generalTransactionReference) transaction.generalTransactionReference = data.generalTransactionReference
    if (data.hash) transaction.hash = data.hash
    if (data.p2pAdId) transaction.p2pAdId = data.p2pAdId
    if (data.p2pOrderId) transaction.p2pOrderId = data.p2pOrderId
    if (data.feeWalletId) transaction.feeWalletId = data.feeWalletId
    if (data.metadata) transaction.metadata = data.metadata
    if (data.accountId) transaction.accountId = data.accountId
    if (data.tatumWithdrawalId) transaction.tatumWithdrawalId = data.tatumWithdrawalId
    if (data.destination) transaction.destination = data.destination

    
    transaction.createdAt = new Date();
    transaction.updatedAt = new Date();
    return transaction;
  }
}
