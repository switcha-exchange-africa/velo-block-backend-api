import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Types, Document } from "mongoose";
import { CounterpartConditionsType, P2pAdsList, P2pAdsType, P2pPriceType, P2pPriceTypeList } from "src/core/entities/P2pAds";
import { Status, STATUS_LIST } from "src/core/types/status";

export type P2pAdsDocument = P2pAds & Document;

@Schema({
  toJSON: {
    virtuals: true,
  },
  timestamps: true
})
export class P2pAds {
  @Prop()
  coin: string

  @Prop()
  cash: string

  @Prop()
  remark: string

  @Prop({ default: false })
  isPublished: boolean

  @Prop({ default: true })
  isSwitchaMerchant: boolean

  @Prop()
  paymentTimeLimit: string

  @Prop()
  reply: string

  @Prop({
    type: Types.ObjectId,
    ref: "User",
    required: true
  })
  userId: string;

  @Prop({ enum: P2pAdsList })
  type: P2pAdsType;

  @Prop({ enum: STATUS_LIST, default: Status.PENDING })
  status: Status

  @Prop({ enum: P2pPriceTypeList })
  priceType: P2pPriceType;

  @Prop()
  price: number

  @Prop()
  totalAmount: number

  @Prop({ default: 0 })
  lockedBalance: number

  @Prop()
  minLimit: number

  @Prop()
  maxLimit: number

  @Prop()
  highestPriceOrder: number

  @Prop({ type: { kyc: Boolean, registeredZeroDaysAgo: Boolean, moreThanDot1Btc: Boolean } })
  counterPartConditions: CounterpartConditionsType

  @Prop({ type: [{ type: Types.ObjectId, ref: 'P2pAdBank' }] })
  banks: string[];

  @Prop({ default: true })
  isOnline: boolean

  @Prop()
  createdAt: Date;

  @Prop()
  updatedAt: Date;
}

const P2pAdsSchema = SchemaFactory.createForClass(P2pAds);
P2pAdsSchema.virtual('user', {
  ref: 'User',
  localField: 'userId',
  foreignField: '_id',
});
P2pAdsSchema.virtual('bank', {
  ref: 'P2pAdBank',
  localField: 'banks',
  foreignField: '_id'
});

P2pAdsSchema.pre<P2pAdsDocument>(/^find/, function (next) {
  this.populate({
    path: 'user',
    options: { select: 'username noOfP2pOrderCompleted noOfP2pOrderCreated noOfP2pAdsCreated' } // <-- wrap `select` in `options` here...
  })

  next();
});
P2pAdsSchema.pre<P2pAdsDocument>(/^find/, function (next) {
  this.populate({
    path: 'bank',
    options: { select: 'name code accountName accountNumber isActive isWillingToPayTo isAcceptingToPaymentTo type' } // <-- wrap `select` in `options` here...
  })

  next();
});

P2pAdsSchema.index({
  _id: 'text',
  id: 'text',
  price: 'text',
  totalAmount: 'text',
  minLimit: 'text',
  maxLimit: 'text'
},
  {
    weights: {
      _id: 5,
      price: 5,
      totalAmount: 5,
      minLimit: 5,
      maxLimit: 5,
    },
  },);

export { P2pAdsSchema }


// 4245519
