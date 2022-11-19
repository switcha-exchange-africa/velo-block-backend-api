import {
    Prop,
    Schema,
    SchemaFactory
} from '@nestjs/mongoose';
import { Types, Document } from 'mongoose';
import { STATUS_LIST, Status } from 'src/core/types/status';


export type DepositAddressDocument = DepositAddress & Document;


@Schema({
    timestamps: true

})
export class DepositAddress {

    @Prop({
        type: Types.ObjectId,
        ref: "User",
        required: true
    })
    userId: string;

    @Prop({
        type: Types.ObjectId,
        ref: "VirtualAccount",
        required: true
    })
    virtualAccountId: string;

    @Prop()
    coin: string

    @Prop()
    address: string 

    @Prop({ enum: STATUS_LIST, default: Status.PENDING })
    status: Status

    @Prop()
    createdAt: Date;

    @Prop()
    updatedAt: Date;

}

export const DepositAddressSchema = SchemaFactory.createForClass(DepositAddress);
