
import { Processor, OnQueueActive, Process, OnGlobalQueueCompleted, OnQueueFailed } from '@nestjs/bull';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Job } from 'bull';
import { TATUM_API_KEY, TATUM_BASE_URL } from 'src/configuration';
import { IDataServices } from 'src/core/abstracts';
import { IHttpServices } from 'src/core/abstracts/http-services.abstract';
import { Wallet } from 'src/core/entities/wallet.entity';
import { COIN_TYPES } from 'src/lib/constants';
import { WalletFactoryService } from 'src/services/use-cases/wallet/wallet-factory.service';


const CONFIG = {
  headers: {
    "X-API-Key": TATUM_API_KEY
  },
};
@Processor('wallet')
export class WalletTaskConsumer {
  constructor(
    private http: IHttpServices,
    private data: IDataServices,
    private walletFactory: WalletFactoryService,
    private emitter: EventEmitter2,

  ) { }

  @OnQueueActive()
  onActive(job: Job) {
    console.log(
      `Processing job ${job.id} of type ${job.name} with data ${job.data}...`,
    );
  }

  @Process()
  async generateWallet(job: Job) {
    const { userId, coin, accountId, chain, userDetail } = job.data
    const wallet = await this.data.wallets.findOne({ userId, coin })
    if (!wallet) {
      if (coin === COIN_TYPES.NGN) {
        const walletPayload: Wallet = {
          address: "",
          userId,
          user: userDetail,
          accountId: "",
          coin: COIN_TYPES.NGN,
          isBlocked: false,
          lastDeposit: 0,
          lastWithdrawal: 0,
          network: null,
        };
        const factory = await this.walletFactory.create(walletPayload);
        await this.data.wallets.create(factory);
      }
      const { address, destinationTag, memo, message } = await this.http.post(`${TATUM_BASE_URL}/offchain/account/${accountId}/address`, {}, CONFIG)
      this.emitter.emit("send.webhook.subscription", { chain, address })

      const walletPayload: Wallet = {
        address,
        userId,
        user: userDetail,
        accountId,
        coin,
        isBlocked: false,
        lastDeposit: 0,
        lastWithdrawal: 0,
        network: null,
      };
      const factory = await this.walletFactory.create({ ...walletPayload, destinationTag, memo, tatumMessage: message });
      await this.data.wallets.create(factory);
    }
  }
  @OnGlobalQueueCompleted()
  async onGlobalCompleted(job: Job<unknown>, result: any) {
    console.log('(Global) on completed: job ', job.id, ' -> result: ', result);
  }

  @OnQueueFailed()
  async onQueueFailed(job: Job, err: Error) {
    console.log('JOB ID ', job.id);
    console.log(err)
  }

}
