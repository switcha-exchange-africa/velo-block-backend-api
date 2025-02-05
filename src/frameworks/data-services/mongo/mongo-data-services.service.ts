import { Transaction, TransactionDocument } from './model/Transaction.model';
import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MongoGenericRepository } from './mongo-generic-repository';
import { User, UserDocument } from './model/User';
import { Wallet, WalletDocument } from './model/Wallet';
import { IDataServices } from 'src/core/abstracts';
import { FaucetDocument, Faucet } from './model/Faucet';
import { Withdrawal, WithdrawalDocument } from './model/Withdrawal';
import { Bank, BankDocument } from './model/Bank';
import { Activity, ActivityDocument } from './model/Activity';
import { EmailChangeRequest, EmailChangeRequestDocument } from './model/Email-Change-Request.model';
import { CustomLogger, CustomLoggerDocument } from './model/CustomLogger';
import { Notification, NotificationDocument } from './model/Notification';
import { QuickTrade, QuickTradeDocument } from './model/Quick-Trade';
import { QuickTradeContract, QuickTradeContractDocument } from './model/Quick-Trade-Contract';
import { ExchangeRate, ExchangeRateDocument } from './model/ExchangeRate';
import { Admin, AdminDocument } from './model/Admin';
import { Kyc, KycDocument } from './model/Kyc';
import { Fee, FeeDocument } from './model/Fee';
import { FeeWallet, FeeWalletDocument } from './model/Fee-Wallet';
import { UserFeatureManagement, UserFeatureManagementDocument } from './model/UserFeatureManagement';
import { CoinWithdrawalFee, CoinWithdrawalFeeDocument } from './model/CoinWithdrawalFee';
import { Coin, CoinDocument } from './model/Coin';
import { P2pAds, P2pAdsDocument } from './model/P2P-Ads';
import { P2pAdBank, P2pAdBankDocument } from './model/P2P-Ad-Banks';
import { P2pOrder, P2pOrderDocument } from './model/P2p-Order';
import { WebPush, WebPushDocument } from "./model/Web-Push";
import { FeatureManagement, FeatureManagementDocument } from "./model/Feature-Management";
import { TradeDispute, TradeDisputeDocument } from "./model/Trade-Dispute";
import { ChatMessage, ChatMessageDocument } from "./model/Chat-Messages";
import { MutateUser, MutateUserDocument } from './model/MutateUser';
import { TwoFa, TwoFaDocument } from './model/TwoFa';
import { VirtualAccount, VirtualAccountDocument } from './model/Virtual-Account';
import { DepositAddress, DepositAddressDocument } from './model/Deposit-Addresses';
// import { Gondor } from './model/Gondor';
import { LockedBalance, LockedBalanceDocument } from "./model/Locked-Balances";
import { LoginHistory, LoginHistoryDocument } from "./model/LoginHistory";
import { Deactivated2faRequest, Deactivated2faRequestDocument } from './model/Deactivate2faRequests';
import { BlockchainFeesAccrued, BlockchainFeesAccruedDocument } from "./model/BlockchainFeesAccrued";



@Injectable()
export class MongoDataServices
  implements IDataServices, OnApplicationBootstrap {
  users: MongoGenericRepository<User>;
  wallets: MongoGenericRepository<Wallet>;
  transactions: MongoGenericRepository<Transaction>;
  faucets: MongoGenericRepository<Faucet>;
  withdrawals: MongoGenericRepository<Withdrawal>;
  banks: MongoGenericRepository<Bank>;
  activities: MongoGenericRepository<Activity>;
  emailChangeRequests: MongoGenericRepository<EmailChangeRequest>;
  customLogger: MongoGenericRepository<CustomLogger>;
  notifications: MongoGenericRepository<Notification>;
  quickTrades: MongoGenericRepository<QuickTrade>;
  quickTradeContracts: MongoGenericRepository<QuickTradeContract>;
  exchangeRates: MongoGenericRepository<ExchangeRate>;
  admins: MongoGenericRepository<Admin>;
  kyc: MongoGenericRepository<Kyc>;
  fees: MongoGenericRepository<Fee>;
  feeWallets: MongoGenericRepository<FeeWallet>;
  userFeatureManagement: MongoGenericRepository<UserFeatureManagement>;
  coinWithdrawalFee: MongoGenericRepository<CoinWithdrawalFee>;
  coins: MongoGenericRepository<Coin>;
  p2pAds: MongoGenericRepository<P2pAds>
  p2pAdBanks: MongoGenericRepository<P2pAdBank>
  p2pOrders: MongoGenericRepository<P2pOrder>
  webPush: MongoGenericRepository<WebPush>
  featureManagement: MongoGenericRepository<FeatureManagement>
  tradeDisputes: MongoGenericRepository<TradeDispute>
  chatMessages: MongoGenericRepository<ChatMessage>
  mutateUser: MongoGenericRepository<MutateUser>
  twoFa: MongoGenericRepository<TwoFa>
  virtualAccounts: MongoGenericRepository<VirtualAccount>
  depositAddresses: MongoGenericRepository<DepositAddress>
  lockedBalances: MongoGenericRepository<LockedBalance>
  loginHistory: MongoGenericRepository<LoginHistory>
  deactivated2faRequests: MongoGenericRepository<Deactivated2faRequest>
  blockchainFeesAccured: MongoGenericRepository<BlockchainFeesAccrued>
  // gondor: MongoGenericRepository<Gondor>


  constructor(
    @InjectModel(User.name)
    private UserRepository: Model<UserDocument>,

    @InjectModel(Wallet.name)
    private WalletRepository: Model<WalletDocument>,

    @InjectModel(Transaction.name)
    private TransactionRepository: Model<TransactionDocument>,

    @InjectModel(Faucet.name)
    private FaucetRepository: Model<FaucetDocument>,

    @InjectModel(Withdrawal.name)
    private WithdrawalRepository: Model<WithdrawalDocument>,

    @InjectModel(Bank.name)
    private BankRepository: Model<BankDocument>,

    @InjectModel(Activity.name)
    private ActivityRepository: Model<ActivityDocument>,

    @InjectModel(EmailChangeRequest.name)
    private EmailChangeRequestRepository: Model<EmailChangeRequestDocument>,

    @InjectModel(CustomLogger.name)
    private CustomLoggerRepository: Model<CustomLoggerDocument>,

    @InjectModel(Notification.name)
    private NotificationRepository: Model<NotificationDocument>,

    @InjectModel(QuickTrade.name)
    private QuickTradeRepository: Model<QuickTradeDocument>,

    @InjectModel(QuickTradeContract.name)
    private QuickTradeContractRepository: Model<QuickTradeContractDocument>,

    @InjectModel(ExchangeRate.name)
    private ExchangeRateRepository: Model<ExchangeRateDocument>,

    @InjectModel(Admin.name)
    private AdminRepository: Model<AdminDocument>,

    @InjectModel(Kyc.name)
    private KycRepository: Model<KycDocument>,

    @InjectModel(Fee.name)
    private FeeRepository: Model<FeeDocument>,

    @InjectModel(FeeWallet.name)
    private FeeWalletRepository: Model<FeeWalletDocument>,

    @InjectModel(UserFeatureManagement.name)
    private UserFeatureManagementRepository: Model<UserFeatureManagementDocument>,

    @InjectModel(CoinWithdrawalFee.name)
    private CoinWithdrawalFeeRepository: Model<CoinWithdrawalFeeDocument>,

    @InjectModel(Coin.name)
    private CoinRepository: Model<CoinDocument>,

    @InjectModel(P2pAds.name)
    private P2pAdsRepository: Model<P2pAdsDocument>,

    @InjectModel(P2pAdBank.name)
    private P2pAdBanksRepository: Model<P2pAdBankDocument>,


    @InjectModel(P2pOrder.name)
    private P2pOrderRepository: Model<P2pOrderDocument>,

    @InjectModel(WebPush.name)
    private WebPushRepository: Model<WebPushDocument>,


    @InjectModel(FeatureManagement.name)
    private FeatureManagementRepository: Model<FeatureManagementDocument>,

    @InjectModel(TradeDispute.name)
    private TradeDisputesRepository: Model<TradeDisputeDocument>,

    @InjectModel(ChatMessage.name)
    private ChatMessagesRepository: Model<ChatMessageDocument>,

    @InjectModel(MutateUser.name)
    private MutateUserRepository: Model<MutateUserDocument>,

    @InjectModel(TwoFa.name)
    private TwoFaRepository: Model<TwoFaDocument>,

    @InjectModel(VirtualAccount.name)
    private VirtualAccountRepository: Model<VirtualAccountDocument>,

    @InjectModel(DepositAddress.name)
    private DepositAddressRepository: Model<DepositAddressDocument>,


    @InjectModel(LockedBalance.name)
    private LockedBalanceRepository: Model<LockedBalanceDocument>,

    @InjectModel(LoginHistory.name)
    private LoginHistoryRepository: Model<LoginHistoryDocument>,

    @InjectModel(Deactivated2faRequest.name)
    private Deactivated2faRequestRepository: Model<Deactivated2faRequestDocument>,

    @InjectModel(BlockchainFeesAccrued.name)
    private BlockchainFeesAccruedRepository: Model<BlockchainFeesAccruedDocument>


  ) { }


  onApplicationBootstrap() {
    this.users = new MongoGenericRepository<User>(this.UserRepository);
    this.wallets = new MongoGenericRepository<Wallet>(this.WalletRepository)
    this.transactions = new MongoGenericRepository<Transaction>(this.TransactionRepository, ['userId'])
    this.faucets = new MongoGenericRepository<Faucet>(this.FaucetRepository)
    this.withdrawals = new MongoGenericRepository<Withdrawal>(this.WithdrawalRepository)
    this.banks = new MongoGenericRepository<Bank>(this.BankRepository)
    this.activities = new MongoGenericRepository<Activity>(this.ActivityRepository)
    this.emailChangeRequests = new MongoGenericRepository<EmailChangeRequest>(this.EmailChangeRequestRepository)
    this.customLogger = new MongoGenericRepository<CustomLogger>(this.CustomLoggerRepository)
    this.notifications = new MongoGenericRepository<Notification>(this.NotificationRepository)
    this.quickTrades = new MongoGenericRepository<QuickTrade>(this.QuickTradeRepository, ['buyerId', 'sellerId'])
    this.quickTradeContracts = new MongoGenericRepository<QuickTradeContract>(this.QuickTradeContractRepository)
    this.exchangeRates = new MongoGenericRepository<ExchangeRate>(this.ExchangeRateRepository)
    this.admins = new MongoGenericRepository<Admin>(this.AdminRepository)
    this.kyc = new MongoGenericRepository<Kyc>(this.KycRepository)
    this.fees = new MongoGenericRepository<Fee>(this.FeeRepository, ['userId'])
    this.feeWallets = new MongoGenericRepository<FeeWallet>(this.FeeWalletRepository, ['userId'])
    this.userFeatureManagement = new MongoGenericRepository<UserFeatureManagement>(this.UserFeatureManagementRepository, ['userId'])
    this.coinWithdrawalFee = new MongoGenericRepository<CoinWithdrawalFee>(this.CoinWithdrawalFeeRepository, ['userId'])
    this.coins = new MongoGenericRepository<Coin>(this.CoinRepository, ['userId'])
    this.p2pAds = new MongoGenericRepository<P2pAds>(this.P2pAdsRepository, ['userId'])
    this.p2pAdBanks = new MongoGenericRepository<P2pAdBank>(this.P2pAdBanksRepository, ['userId'])
    this.p2pOrders = new MongoGenericRepository<P2pOrder>(this.P2pOrderRepository)
    this.webPush = new MongoGenericRepository<WebPush>(this.WebPushRepository)
    this.featureManagement = new MongoGenericRepository<FeatureManagement>(this.FeatureManagementRepository)
    this.tradeDisputes = new MongoGenericRepository<TradeDispute>(this.TradeDisputesRepository)
    this.chatMessages = new MongoGenericRepository<ChatMessage>(this.ChatMessagesRepository)
    this.mutateUser = new MongoGenericRepository<MutateUser>(this.MutateUserRepository)
    this.twoFa = new MongoGenericRepository<TwoFa>(this.TwoFaRepository)
    this.virtualAccounts = new MongoGenericRepository<VirtualAccount>(this.VirtualAccountRepository)
    this.depositAddresses = new MongoGenericRepository<DepositAddress>(this.DepositAddressRepository)
    this.lockedBalances = new MongoGenericRepository<LockedBalance>(this.LockedBalanceRepository)
    this.loginHistory = new MongoGenericRepository<LoginHistory>(this.LoginHistoryRepository)
    this.deactivated2faRequests = new MongoGenericRepository<Deactivated2faRequest>(this.Deactivated2faRequestRepository)
    this.blockchainFeesAccured = new MongoGenericRepository<BlockchainFeesAccrued>(this.BlockchainFeesAccruedRepository)


  }
}
