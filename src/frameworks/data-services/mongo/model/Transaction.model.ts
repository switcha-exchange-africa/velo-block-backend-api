import { UserDetail } from "src/core/entities/user.entity";
import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";

import { Types } from "mongoose";
import { CUSTOM_TRANSACTION_TYPE, CUSTOM_TRANSACTION_TYPES, Rates, TRANSACTION_STATUS, TRANSACTION_STATUS_LIST, TRANSACTION_SUBTYPE, TRANSACTION_SUBTYPE_LIST, TRANSACTION_TYPE, TRANSACTION_TYPE_LIST } from "src/core/entities/transaction.entity";
import { COIN_TYPES_LIST, CoinType } from "src/core/entities/wallet.entity";

export type TransactionDocument = Transaction & Document;

@Schema()
export class Transaction {
  @Prop({
    type: Types.ObjectId,
    ref: "User",
    required: true,
  })
  userId: string;

  @Prop({
    type: Types.ObjectId,
    ref: "Wallet",
    required: true,
  })
  walletId: string;


  @Prop({ enum: COIN_TYPES_LIST })
  currency: CoinType;

  @Prop()
  tatumTransactionId: string;

  @Prop()
  reference: string


  @Prop()
  generalTransactionReference: string

  @Prop()
  signedAmount: number;

  @Prop()
  senderAddress: string

  @Prop()
  amount: number;

  @Prop({ enum: TRANSACTION_TYPE_LIST })
  type: TRANSACTION_TYPE;

  @Prop({ enum: TRANSACTION_SUBTYPE_LIST })
  subType: TRANSACTION_SUBTYPE;

  @Prop({ type: Object })
  user: UserDetail;

  @Prop({ enum: TRANSACTION_STATUS_LIST })
  status: TRANSACTION_STATUS;

  @Prop()
  balanceAfter: number;

  @Prop()
  balanceBefore: number;

  @Prop({ type: Object })
  rate: Rates;

  @Prop({ enum: CUSTOM_TRANSACTION_TYPES })
  customTransactionType: CUSTOM_TRANSACTION_TYPE;

  @Prop()
  createdAt: Date;

  @Prop()
  updatedAt: Date;

  @Prop()
  description: string

  @Prop()
  hash: string


}

export const TransactionSchema = SchemaFactory.createForClass(Transaction);
