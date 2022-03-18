import { Transaction, TransactionDocument } from './model/transaction.model';
import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MongoGenericRepository } from './mongo-generic-repository';
import { User, UserDocument } from './model/user.model';
import { Wallet, WalletDocument } from './model/wallet.model';
import { IDataServices, IGenericRepository} from 'src/core/abstracts';
import { TransactionReference, TransactionReferenceDocument } from './model/transaction-reference.model';
import { Faucet } from 'src/core/entities/faucet.entity';
import { FaucetDocument } from './model/faucet.model';


@Injectable()
export class MongoDataServices
  implements IDataServices, OnApplicationBootstrap
{
  users: MongoGenericRepository<User>;
  wallets: MongoGenericRepository<Wallet>;
  transactionReferences: MongoGenericRepository<TransactionReference>;
  transactions: MongoGenericRepository<Transaction>;
  faucets: MongoGenericRepository<Faucet>;


  constructor(
    @InjectModel(User.name)
    private UserRepository: Model<UserDocument>,
    @InjectModel(Wallet.name)
    private WalletRepository: Model<WalletDocument>,
    @InjectModel(TransactionReference.name)
    private TransactionReferenceRepository: Model<TransactionReferenceDocument>,
    @InjectModel(Transaction.name)
    private TransactionRepository: Model<TransactionDocument>,
    @InjectModel(Faucet.name)
    private FaucetRepository: Model<FaucetDocument>,
   
  ) {}
  

  onApplicationBootstrap() {
    this.users = new MongoGenericRepository<User>(this.UserRepository);
    this.wallets = new MongoGenericRepository<Wallet>(this.WalletRepository)
    this.transactions = new MongoGenericRepository<Transaction>(this.TransactionRepository)
    this.transactionReferences = new MongoGenericRepository<TransactionReference>(this.TransactionReferenceRepository)
    this.faucets = new MongoGenericRepository<Faucet>(this.FaucetRepository)
    // this.books = new MongoGenericRepository<Book>(this.BookRepository, [
    //   'author',
    //   'genre',
    // ]);
  }
}
