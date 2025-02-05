import { VerifyUserDto } from 'src/core/dtos/verifyEmail.dto';
import { HttpStatus, Injectable, Logger } from "@nestjs/common";
import { IDataServices, INotificationServices } from "src/core/abstracts";
import { DISCORD_VERIFICATION_CHANNEL_LINK, INCOMPLETE_AUTH_TOKEN_VALID_TIME, JWT_EXPIRY_TIME_IN_SECONDS, JWT_USER_PAYLOAD_TYPE, ONE_HOUR_IN_SECONDS, RedisPrefix, RESET_PASSWORD_EXPIRY, SIGNUP_CODE_EXPIRY, USER_LEVEL_TYPE } from "src/lib/constants";
import jwtLib from "src/lib/jwtLib";
import { Response, Request } from "express"
import { env } from "src/configuration";
import { compareHash, hash, isEmpty, maybePluralize, randomFixedInteger, secondsToDhms } from "src/lib/utils";
import { IInMemoryServices } from "src/core/abstracts/in-memory.abstract";
import { randomBytes } from 'crypto'
import { LoginHistoryFactoryService, UserFactoryService, UserFeatureManagementFactoryService } from './user-factory.service';
import { ResponseState, ResponsesType } from 'src/core/types/response';
import { User } from 'src/core/entities/user.entity';
import { EventEmitter2 } from "@nestjs/event-emitter";
import { ILogin, ISignup, IWaitList } from 'src/core/dtos/authentication/login.dto';
import { ActivityFactoryService } from '../activity/activity-factory.service';
import { ActivityAction } from 'src/core/dtos/activity';
import { EmailTemplates } from 'src/core/types/email'
import { UtilsServices } from '../utils/utils.service';
import { IErrorReporter } from 'src/core/types/error';
import mongoose from 'mongoose';
import databaseHelper from 'src/frameworks/data-services/mongo/database-helper';
import { InjectConnection } from "@nestjs/mongoose";
import * as moment from "moment";
import { IHttpServices } from 'src/core/abstracts/http-services.abstract';

const SIGNUP_ATTEMPT_KEY = 'failed-signup-attempt'
const LOGIN_ATTEMPT_KEY = 'login-signup-attempt'

@Injectable()
export class AuthServices {
  constructor(
    private readonly data: IDataServices,
    private readonly discordServices: INotificationServices,
    private readonly inMemoryServices: IInMemoryServices,
    private readonly factory: UserFactoryService,
    private readonly emitter: EventEmitter2,
    private readonly userFeatureManagementFactory: UserFeatureManagementFactoryService,
    private readonly activityFactory: ActivityFactoryService,
    private readonly utilsService: UtilsServices,
    private readonly loginHistoryFactory: LoginHistoryFactoryService,
    private http: IHttpServices,

    @InjectConnection('switcha') private readonly connection: mongoose.Connection,

  ) { }

  async waitlist(payload: IWaitList) {
    try {
      const { email } = payload
      const userExists = await this.data.users.findOne({ email })
      if (userExists) return Promise.reject({
        status: HttpStatus.CONFLICT,
        state: ResponseState.ERROR,
        message: 'Email already added',
        error: null
      })

      const factory = await this.factory.createNewUser({
        ...payload,
        username: `${email}-${randomFixedInteger(5)}`,
        isWaitList: true,
      })
      await this.data.users.create(factory);
      return {
        status: HttpStatus.CREATED,
        message: "Email added to waitlist",
        data: {},
        state: ResponseState.SUCCESS
      };

    } catch (error) {
      Logger.error(error)
      const errorPayload: IErrorReporter = {
        action: 'WAITLIST',
        error,
        email: payload.email,
        message: error.message
      }

      this.utilsService.errorReporter(errorPayload)
      return Promise.reject({
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        state: ResponseState.ERROR,
        message: error.message,
        error: error
      })
    }
  }

  async signup(data: ISignup): Promise<ResponsesType<User>> {
    try {

      const { email, username, headers, ip } = data

      const [userExists, usernameExists] = await Promise.all([
        this.data.users.findOne({ email }),
        this.data.users.findOne({ username }),

      ])
      if (userExists) {

        // rate limiter
        const { state, retries } = await this.utilsService.shouldLimitUser({
          key: `${SIGNUP_ATTEMPT_KEY}-${email}`,
          max: 5
        })
        if (state) {
          return Promise.reject({
            status: HttpStatus.TOO_MANY_REQUESTS,
            state: ResponseState.ERROR,
            message: `Can't use this email in the next 1 hr`,
            error: null
          })
        }

        await this.inMemoryServices.set(
          `${SIGNUP_ATTEMPT_KEY}-${email}`,
          retries + 1,
          String(ONE_HOUR_IN_SECONDS)
        )
        // ban user
        return Promise.reject({
          status: HttpStatus.CONFLICT,
          state: ResponseState.ERROR,
          message: 'User already exists',
          error: null
        })
      }

      if (usernameExists) {

        // rate limiter
        const { state, retries } = await this.utilsService.shouldLimitUser({
          key: `${SIGNUP_ATTEMPT_KEY}-${username}`,
          max: 5
        })
        if (state) {
          return Promise.reject({
            status: HttpStatus.TOO_MANY_REQUESTS,
            state: ResponseState.ERROR,
            message: `Can't use this email in the next 1 hr`,
            error: null
          })
        }

        await this.inMemoryServices.set(
          `${SIGNUP_ATTEMPT_KEY}-${username}`,
          retries + 1,
          String(ONE_HOUR_IN_SECONDS)
        )
        // ban user
        return Promise.reject({
          status: HttpStatus.CONFLICT,
          state: ResponseState.ERROR,
          message: 'User already exists',
          error: null
        })
      }
      const factory = await this.factory.createNewUser({ ...data, email: data.email.toLowerCase() })
      const user = await this.data.users.create(factory);
      const redisKey = `${RedisPrefix.signupEmailCode}/${user?.email}`

      const jwtPayload: JWT_USER_PAYLOAD_TYPE = {
        _id: user._id,
        email: user.email
      }
      const token = await jwtLib.jwtSign(jwtPayload, `${INCOMPLETE_AUTH_TOKEN_VALID_TIME}h`) as string;
      const code = randomFixedInteger(6)
      const [hashedCode, activityFactory] = await Promise.all([
        hash(String(code)),
        this.activityFactory.create({
          action: ActivityAction.SIGNUP,
          description: 'Signed Up',
          userId: String(user._id)
        })
      ]);

      await Promise.all([
        this.discordServices.inHouseNotification({
          title: `Email Verification code :- ${env.env} environment`,
          message: `Verification code for ${user?.firstName} ${user.lastName}:- ${user?.email} is ${code}`,
          link: DISCORD_VERIFICATION_CHANNEL_LINK,
        }),
        this.inMemoryServices.set(redisKey, hashedCode, String(SIGNUP_CODE_EXPIRY)),
        this.data.activities.create(activityFactory),
        this.emitter.emit("send.email.mailjet", {
          fromEmail: 'verification@switcha.africa',
          fromName: "Verification",
          toEmail: user.email,
          toName: `${user.firstName} ${user.lastName}`,
          templateId: EmailTemplates.VERIFY_EMAIL,
          subject: 'Email Verification',
          variables: {
            code
          }
        }),
      ])

      // signup activity
      const location = env.isDev ? {} : await this.http.get(`http://ip-api.com/json/${ip}`)
      const loginHistoryFactory = await this.loginHistoryFactory.create({
        userId: String(user._id),
        platform: headers['sec-ch-ua-platform'],
        browser: headers['sec-ch-ua'],
        ip,
        location,
        headers,
        type: 'signup',
        userAgent: headers['user-agent'],
        country: env.isDev ? '' : location.country,
        countryCode: env.isDev ? '' : location.countryCode,
        region: env.isDev ? '' : location.region,
        regionName: env.isDev ? '' : location.regionName,
        city: env.isDev ? '' : location.city,
        lat: env.isDev ? '' : location.lat,
        lon: env.isDev ? '' : location.lon,
        timezone: env.isDev ? '' : location.timezone,
      })

      const loginHistory = await this.data.loginHistory.create(loginHistoryFactory)
      const loginHistoryRedisKey = `${email}-login-activity`
      await this.inMemoryServices.set(loginHistoryRedisKey, loginHistory._id, JWT_EXPIRY_TIME_IN_SECONDS)

      await this.data.users.update({ _id: user._id }, {
        signupLocation: location
      })

      return {
        status: HttpStatus.CREATED,
        message: "User signed up successfully",
        token: `Bearer ${token}`,
        data: jwtPayload,
        state: ResponseState.SUCCESS,
        extra: env.isDev || env.isStaging ? code : null,
      };

    } catch (error) {

      Logger.error(error)
      const payload: IErrorReporter = {
        action: 'SIGNUP',
        error,
        email: data.email,
        message: error.message
      }

      this.utilsService.errorReporter(payload)
      return Promise.reject({
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        state: ResponseState.ERROR,
        message: error.message,
        error: error
      })
    }
  }

  async verifyEmail(req: Request, res: Response, body: VerifyUserDto): Promise<ResponsesType<User>> {
    try {

      const { code } = body;
      const authUser = req?.user!;

      const redisKey = `${RedisPrefix.signupEmailCode}/${authUser?.email}`
      if (authUser.emailVerified) {
        return {
          message: 'User email already verified',
          status: HttpStatus.ACCEPTED,
          data: authUser,
          state: ResponseState.SUCCESS
        }
      }

      const savedCode = await this.inMemoryServices.get(redisKey);
      if (isEmpty(savedCode)) {
        return Promise.reject({
          status: HttpStatus.BAD_REQUEST,
          state: ResponseState.ERROR,
          message: 'Code is incorrect, invalid or has expired',
          error: null,
        })
      }

      const correctCode = await compareHash(String(code).trim(), (savedCode || '').trim())
      if (!correctCode) {
        return Promise.reject({
          status: HttpStatus.BAD_REQUEST,
          state: ResponseState.ERROR,
          message: 'Code is incorrect, invalid or has expired',
          error: null,
        })
      }

      const updatedUser = await this.data.users.update({ _id: authUser?._id }, {
        $set: {
          emailVerified: true,
          lastLoginDate: new Date(),
          level: USER_LEVEL_TYPE.ONE
        }
      })
      // Remove phone code for this user
      const jwtPayload: JWT_USER_PAYLOAD_TYPE = {
        _id: String(updatedUser._id),
        email: updatedUser.email,
      }
      const [token, , , userManagementFactory, activityFactory] = await Promise.all([
        jwtLib.jwtSign(jwtPayload),
        this.inMemoryServices.del(redisKey),
        this.emitter.emit("create.wallet", {
          userId: updatedUser._id,
          email: updatedUser.email,
          fullName: `${updatedUser.firstName} ${updatedUser.lastName}`
        }),
        this.userFeatureManagementFactory.manageUser({
          userId: String(updatedUser._id),
          canBuy: true,
          canSell: true,
          canSwap: true,
          canP2PBuy: true,
          canP2PSell: true,
          canWithdraw: true,
          canP2PCreateBuyAd: true,
          canP2PCreateSellAd: true
        }),
        this.activityFactory.create({
          action: ActivityAction.VERIFY_EMAIL,
          description: 'Verify Email',
          userId: String(updatedUser._id)
        })
      ])
      const atomicTransaction = async (session: mongoose.ClientSession) => {
        try {
          await this.data.userFeatureManagement.create(userManagementFactory, session)
          await this.data.activities.create(activityFactory, session)
        } catch (error) {
          Logger.error(error);
          throw new Error(error)
        }
      }
      await databaseHelper.executeTransactionWithStartTransaction(
        atomicTransaction,
        this.connection
      )


      if (!res.headersSent) res.set('Authorization', `Bearer ${token}`);
      return {
        status: 200,
        message: 'User email is verified successfully',
        token: `Bearer ${token}`,
        data: jwtPayload,
        state: ResponseState.SUCCESS,
      }

    } catch (error: Error | any | unknown) {
      Logger.error(error)
      const payload: IErrorReporter = {
        action: 'VERIFY EMAIL',
        error,
        email: req.user.email,
        message: error.message
      }

      this.utilsService.errorReporter(payload)
      return Promise.reject({
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        state: ResponseState.ERROR,
        message: error.message,
        error: error
      })
    }
  }

  async issueEmailVerificationCode(req: Request): Promise<ResponsesType<User>> {
    try {
      const authUser = req?.user!;
      if (authUser.emailVerified) {
        return {
          status: HttpStatus.ACCEPTED,
          message: `User already verified`,
          state: ResponseState.SUCCESS,
          data: null
        }
      }

      const redisKey = `${RedisPrefix.signupEmailCode}/${authUser?.email}`
      const codeSent = await this.inMemoryServices.get(redisKey) as number

      if (codeSent) {
        const codeExpiry = await this.inMemoryServices.ttl(redisKey) as Number || 0;
        // taking away 4 minutes from the wait time
        const nextRequest = Math.abs(Number(codeExpiry) / 60 - 4);
        if (Number(codeExpiry && Number(codeExpiry) > 4)) {
          return {
            status: HttpStatus.ACCEPTED,
            message: `if you have not received the verification code, please make another request in ${Math.ceil(
              nextRequest,
            )} ${maybePluralize(Math.ceil(nextRequest), 'minute', 's')}`,
            state: ResponseState.SUCCESS,
            data: null
          }
        }
      }

      const emailCode = randomFixedInteger(6)
      // Remove email code for this user
      const [user,] = await Promise.all([this.data.users.findOne({ email: authUser?.email }), this.inMemoryServices.del(redisKey)])
      if (!user) {
        return Promise.reject({
          status: HttpStatus.NOT_FOUND,
          state: ResponseState.ERROR,
          message: 'User does not exists',
          error: null
        })
      }


      // hash verification code in redis
      const hashedCode = await hash(String(emailCode));
      await Promise.all([
        this.inMemoryServices.set(redisKey, hashedCode, String(SIGNUP_CODE_EXPIRY)),
        this.discordServices.inHouseNotification({
          title: `Email Verification code :- ${env.env} environment`,
          message: `Verification code for ${user?.firstName} ${user?.lastName}-${user?.email} is ${emailCode}`,
          link: DISCORD_VERIFICATION_CHANNEL_LINK,
        })
      ])
      return {
        status: HttpStatus.OK,
        message: 'New code was successfully generated',
        data: env.isProd ? null : String(emailCode),
        state: ResponseState.SUCCESS,
      };

    } catch (error: Error | any | unknown) {
      Logger.error(error)
      const payload: IErrorReporter = {
        action: 'ISSUE VERIFICATION EMAIL',
        error,
        email: req.user.email,
        message: error.message
      }

      this.utilsService.errorReporter(payload)
      return Promise.reject({
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        state: ResponseState.ERROR,
        message: error.message,
        error: error
      })
    }
  }

  async resetPassword(res: Response, payload: { email: string, password: string, token: string }): Promise<ResponsesType<User>> {
    try {

      const { email, password, token } = payload
      const passwordResetCountKey = `${RedisPrefix.passwordResetCount}/${email}`
      const resetPasswordRedisKey = `${RedisPrefix.resetpassword}/${email}`

      const [userRequestReset, user] = await Promise.all([this.inMemoryServices.get(resetPasswordRedisKey), this.data.users.findOne({ email: String(email) })]);
      if (!userRequestReset) {
        return Promise.reject({
          status: HttpStatus.BAD_REQUEST,
          state: ResponseState.ERROR,
          message: 'Invalid or expired reset token',
          error: null
        })
      }
      if (!user) {
        return Promise.reject({
          status: HttpStatus.NOT_FOUND,
          state: ResponseState.ERROR,
          message: 'User does not exists',
          error: null
        })
      }

      // If reset link is valid and not expired
      const validReset = await compareHash(String(token), userRequestReset);
      if (!validReset) {
        return Promise.reject({
          status: HttpStatus.BAD_REQUEST,
          state: ResponseState.ERROR,
          message: 'Invalid or expired reset token',
          error: null
        })
      }

      // Store update users password
      const twenty4H = 1 * 60 * 60 * 24;

      const [hashedPassword, ,] = await Promise.all([hash(password), this.inMemoryServices.del(resetPasswordRedisKey), this.inMemoryServices.set(passwordResetCountKey, 1, String(twenty4H))]);
      res.cookie('deviceTag', '');
      await this.data.users.update(
        { email: user.email },
        {
          $set: {
            verified: true,
            emailVerified: true,
            phoneVerified: true,
            password: hashedPassword
          }
        })
      const activityFactory = await this.activityFactory.create({
        action: ActivityAction.RECOVER_PASSWORD,
        description: 'Reset Password',
        userId: String(user._id)
      })
      await this.data.activities.create(activityFactory)

      return {
        status: HttpStatus.OK,
        data: 'Password updated successfully',
        message: 'Password updated successfully',
        state: ResponseState.SUCCESS,
      }

    } catch (error: Error | any | unknown) {
      Logger.error(error)
      const errorPayload: IErrorReporter = {
        action: 'RESET PASSWORD',
        error,
        email: payload.email,
        message: error.message
      }

      this.utilsService.errorReporter(errorPayload)
      return Promise.reject({
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        state: ResponseState.ERROR,
        message: error.message,
        error: error
      })
    }
  }
  async recoverPassword(payload: { email: string, code: string }): Promise<ResponsesType<User>> {
    try {
      let { email, code } = payload;
      const passwordResetCountKey = `${RedisPrefix.passwordResetCount}/${email}`
      const resetPasswordRedisKey = `${RedisPrefix.resetpassword}/${email}`
      const resetCodeRedisKey = `${RedisPrefix.resetCode}/${email}`

      const resetInPast24H = await this.inMemoryServices.get(passwordResetCountKey)
      if (resetInPast24H) {
        const ttl = await this.inMemoryServices.ttl(passwordResetCountKey)
        const timeToRetry = Math.ceil(Number(ttl));
        const nextTryOpening = secondsToDhms(timeToRetry);
        return Promise.reject({
          status: HttpStatus.TOO_MANY_REQUESTS,
          state: ResponseState.ERROR,
          message: `Password was recently updated. Try again in ${nextTryOpening}`,
          error: null
        })
      }

      const user = await this.data.users.findOne({ email });
      if (!user) {
        return Promise.reject({
          status: HttpStatus.BAD_REQUEST,
          state: ResponseState.ERROR,
          message: `Code is invalid or has expired`,
          error: null
        })
      }

      // for mobile users only
      const codeSent = await this.inMemoryServices.get(resetCodeRedisKey);
      if (!code) {

        if (codeSent) {
          const codeExpiry = await this.inMemoryServices.ttl(resetCodeRedisKey) as Number || 0;
          return {
            status: HttpStatus.ACCEPTED,
            message: `Provide the code sent to your email or request another one in ${Math.ceil(
              Number(codeExpiry) / 60,
            )} minute`,
            data: `seconds ${codeExpiry}`,
            state: ResponseState.SUCCESS,
          }
        }

        const phoneCode = randomFixedInteger(6)
        const hashedPhoneCode = await hash(String(phoneCode));

        await Promise.all([
          this.emitter.emit("send.email.mailjet", {
            fromEmail: 'support@switcha.africa',
            fromName: "Support",
            toEmail: user.email,
            toName: user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.email,
            templateId: EmailTemplates.RECOVER_PASSWORD,
            subject: 'Recover Password',
            variables: {
              code: phoneCode
            }
          }),
          this.inMemoryServices.set(
            resetCodeRedisKey,
            hashedPhoneCode,
            String(RESET_PASSWORD_EXPIRY)
          )
        ])
        this.discordServices.inHouseNotification({
          title: `Recover Password :- ${env.env} environment`,
          message: `Recovery code for ${user.email} is ${phoneCode}`,
          link: DISCORD_VERIFICATION_CHANNEL_LINK,
        })

        const activityFactory = await this.activityFactory.create({
          action: ActivityAction.RECOVER_PASSWORD,
          description: 'Recover Password',
          userId: String(user._id)
        })
        await this.data.activities.create(activityFactory)

        return {
          status: HttpStatus.ACCEPTED,
          message: 'Provide the code sent to your email',
          data: env.isProd ? null : String(phoneCode),
          state: ResponseState.SUCCESS,
        };

      }

      const phoneVerifyDocument = codeSent as string;
      if (isEmpty(phoneVerifyDocument)) {
        return Promise.reject({
          status: HttpStatus.BAD_REQUEST,
          state: ResponseState.ERROR,
          message: `Code is invalid or has expired`,
          error: null
        })
      }

      const correctCode = await compareHash(String(code).trim(), (phoneVerifyDocument || '').trim());
      if (!correctCode) {
        return Promise.reject({
          status: HttpStatus.BAD_REQUEST,
          state: ResponseState.ERROR,
          message: `Code is invalid or has expired`,
          error: null
        })
      }

      // Generate Reset token
      const resetToken = randomBytes(32).toString('hex');
      const hashedResetToken = await hash(resetToken);

      // Remove all reset token for this user if it exists
      await Promise.all([
        this.inMemoryServices.del(resetCodeRedisKey),
        this.inMemoryServices.del(resetPasswordRedisKey),
        this.inMemoryServices.set(
          resetPasswordRedisKey,
          hashedResetToken,
          String(RESET_PASSWORD_EXPIRY)
        )
      ])
      this.discordServices.inHouseNotification({
        title: `Recover Generated TOKEN :- ${env.env} environment`,
        message: `Recovery token for ${user.email} is ${resetToken}`,
        link: DISCORD_VERIFICATION_CHANNEL_LINK,
      })
      return {
        status: HttpStatus.OK,
        message: 'You will receive an email with a link to reset your password if you have an account with this email.',
        data: resetToken,
        state: ResponseState.SUCCESS,
      }


    } catch (error: Error | any | unknown) {
      Logger.error(error)
      const errorPayload: IErrorReporter = {
        action: 'RECOVER PASSWORD',
        error,
        email: payload.email,
        message: error.message
      }

      this.utilsService.errorReporter(errorPayload)
      return Promise.reject({
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        state: ResponseState.ERROR,
        message: error.message,
        error: error
      })
    }
  }

  async login(payload: ILogin): Promise<ResponsesType<User>> {
    try {
      const { email, password, headers, ip } = payload
      const user = await this.data.users.findOne({ email });

      if (!user) {
        const { state, retries } = await this.utilsService.shouldLimitUser({
          key: `${LOGIN_ATTEMPT_KEY}-${email}`,
          max: 5
        })
        if (state) {
          return Promise.reject({
            status: HttpStatus.TOO_MANY_REQUESTS,
            state: ResponseState.ERROR,
            message: `Too many requests`,
            error: null
          })
        }

        await this.inMemoryServices.set(
          `${LOGIN_ATTEMPT_KEY}-${email}`,
          retries + 1,
          String(ONE_HOUR_IN_SECONDS)
        )

        return Promise.reject({
          status: HttpStatus.NOT_FOUND,
          state: ResponseState.ERROR,
          message: 'User does not exists',
          error: null
        })
      }

      if (user.lock) {
        return Promise.reject({
          status: HttpStatus.FORBIDDEN,
          state: ResponseState.ERROR,
          message: 'Account is temporary locked',
          error: null
        })
      }
      if (user.isDisabled) {
        return Promise.reject({
          status: HttpStatus.FORBIDDEN,
          state: ResponseState.ERROR,
          message: 'Account is disabled',
          error: null
        })
      }
      if (!user.password) {
        return Promise.reject({
          status: HttpStatus.BAD_REQUEST,
          state: ResponseState.ERROR,
          message: 'Please reset your password',
          error: null
        })
      }
      const correctPassword: boolean = await compareHash(password, user?.password!);
      if (!correctPassword) {
        const { state, retries } = await this.utilsService.shouldLimitUser({
          key: `${LOGIN_ATTEMPT_KEY}-${email}`,
          max: 5
        })
        if (state) {
          return Promise.reject({
            status: HttpStatus.TOO_MANY_REQUESTS,
            state: ResponseState.ERROR,
            message: `Too many requests`,
            error: null
          })
        }

        await this.inMemoryServices.set(
          `${LOGIN_ATTEMPT_KEY}-${email}`,
          retries + 1,
          String(ONE_HOUR_IN_SECONDS)
        )

        return Promise.reject({
          status: HttpStatus.BAD_REQUEST,
          state: ResponseState.ERROR,
          message: 'Password is incorrect',
          error: null
        })
      }

      if (!user.emailVerified) {

        const jwtPayload: JWT_USER_PAYLOAD_TYPE = {
          _id: String(user._id),
          email: user.email
        }

        const token = await jwtLib.jwtSign(jwtPayload, `${INCOMPLETE_AUTH_TOKEN_VALID_TIME}h`);
        return {
          status: HttpStatus.ACCEPTED,
          message: 'Email is not verified',
          data: 'Email is not verified',
          token: `Bearer ${token}`,
          state: ResponseState.SUCCESS,
        }
      }


      const updatedUser = await this.data.users.update({ _id: user._id }, {
        $set: {
          lastLoginDate: new Date()
        }
      })

      const jwtPayload: JWT_USER_PAYLOAD_TYPE = {
        _id: String(updatedUser._id),
        email: updatedUser.email
      }
      const token = await jwtLib.jwtSign(jwtPayload);

      const activityFactory = await this.activityFactory.create({
        action: ActivityAction.SIGNIN,
        description: 'Signin',
        userId: String(user._id)
      })
      const location = env.isDev ? {} : await this.http.get(`http://ip-api.com/json/${ip}`)
      const loginHistoryFactory = await this.loginHistoryFactory.create({
        userId: String(user._id),
        platform: headers['sec-ch-ua-platform'],
        browser: headers['sec-ch-ua'],
        ip,
        location,
        headers,
        userAgent: headers['user-agent'],
        country: env.isDev ? '' : location.country,
        countryCode: env.isDev ? '' : location.countryCode,
        region: env.isDev ? '' : location.region,
        regionName: env.isDev ? '' : location.regionName,
        city: env.isDev ? '' : location.city,
        lat: env.isDev ? '' : location.lat,
        lon: env.isDev ? '' : location.lon,
        timezone: env.isDev ? '' : location.timezone,
        type: 'login',

      })

      let loginHistory

      const atomicTransaction = async (session: mongoose.ClientSession) => {
        try {
          await this.data.activities.create(activityFactory, session)
          loginHistory = await this.data.loginHistory.create(loginHistoryFactory, session)
          const userManager = await this.data.userFeatureManagement.findOne({ userId: String(user._id) })
          if (!userManager) {
            const userManagerFactory = await this.userFeatureManagementFactory.manageUser({
              userId: String(updatedUser._id),
              canBuy: true,
              canSell: true,
              canSwap: true,
              canP2PBuy: true,
              canP2PSell: true,
              canWithdraw: true,
              canP2PCreateBuyAd: true,
              canP2PCreateSellAd: true
            })
            await this.data.userFeatureManagement.create(userManagerFactory, session)
          }


        } catch (error) {
          Logger.error(error);
          throw new Error(error);
        }
      }
      await databaseHelper.executeTransactionWithStartTransaction(
        atomicTransaction,
        this.connection
      )
      const loginHistoryRedisKey = `${email}-login-activity`
      await this.inMemoryServices.set(loginHistoryRedisKey, loginHistory._id, JWT_EXPIRY_TIME_IN_SECONDS)

      return {
        status: HttpStatus.OK,
        message: 'User logged in successfully',
        token: `Bearer ${token}`,
        data: jwtPayload,
        state: ResponseState.SUCCESS,
      }

    } catch (error: Error | any | unknown) {
      Logger.error(error)
      const errorPayload: IErrorReporter = {
        action: 'LOGIN ',
        error,
        email: payload.email,
        message: error.message
      }

      this.utilsService.errorReporter(errorPayload)
      return Promise.reject({
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        state: ResponseState.ERROR,
        message: error.message,
        error: error
      })
    }
  }

  async getUser(id: string) {
    let email
    try {
      const data = await this.data.users.findOne(
        { _id: id },
        null, {
        select: ['-password', '-transactionPin']
      })
      email = data.email
      const userManagement = await this.data.userFeatureManagement.findOne({ userId: String(data._id) })
      await this.data.userFeatureManagement.update({ _id: userManagement._id }, {
        canBuy: true,
        canSell: true,
        canSwap: true,
        canP2PBuy: true,
        canP2PSell: true,
        canWithdraw: true,
        canP2PCreateBuyAd: true,
        canP2PCreateSellAd: true
      })
      return {
        status: HttpStatus.OK,
        state: ResponseState.SUCCESS,
        message: 'User retrieved successfully',
        data
      }
    } catch (error) {
      Logger.error(error)
      const errorPayload: IErrorReporter = {
        action: 'GET AUTH USER',
        error,
        email,
        message: error.message
      }

      this.utilsService.errorReporter(errorPayload)
      return Promise.reject({
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        state: ResponseState.ERROR,
        message: error.message,
        error: error
      })
    }
  }
  async logoutUser(email: string) {
    try {
      const loginHistoryRedisKey = `${email}-login-activity`
      const loginHistoryRedis = await this.inMemoryServices.get(loginHistoryRedisKey)
      const loginHistory = await this.data.loginHistory.findOne({ _id: loginHistoryRedis })
      if (!loginHistory) {
        Logger.error('@login-history-failed', 'Login History does not exists')
        return {
          status: HttpStatus.OK,
          state: ResponseState.SUCCESS,
          message: 'Logged out successfully',
          data: {}
        }
      }

      const createdDate = moment(loginHistory.createdAt)
      const now = moment(new Date())
      const diffInSeconds = now.diff(createdDate, 'seconds', true)
      const diffInMinutes = now.diff(createdDate, 'minutes', true)

      await this.data.loginHistory.update({ _id: loginHistoryRedis }, {
        loggedOutDate: now,
        durationTimeInSec: diffInSeconds,
        durationTimeInMin: diffInMinutes
      })
      await this.inMemoryServices.del(loginHistoryRedisKey)

      return {
        status: HttpStatus.OK,
        state: ResponseState.SUCCESS,
        message: 'Logged out successfully',
        data: {
          createdDate,
          now,
          diffInSeconds,
          diffInMinutes
        }
      }
    } catch (error) {
      Logger.error(error)
      const errorPayload: IErrorReporter = {
        action: 'LOGOUT USER',
        error,
        email,
        message: error.message
      }

      this.utilsService.errorReporter(errorPayload)
      return Promise.reject({
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        state: ResponseState.ERROR,
        message: error.message,
        error: error
      })
    }
  }
}



// "diffInSeconds": -332,
// "diffInMinutes": -5