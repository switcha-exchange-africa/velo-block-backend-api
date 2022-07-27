import { CanActivate, ExecutionContext, Injectable, Logger } from "@nestjs/common";
import { ADMIN_CYPHER_SECRET } from "src/configuration";
import { IDataServices } from "src/core/abstracts";
import jwtLib from "src/lib/jwtLib";
import { DoesNotExistsException, UnAuthorizedException } from "src/services/use-cases/user/exceptions";

@Injectable()
export class StrictAuthGuard implements CanActivate {
  constructor(
    private readonly dataServices: IDataServices

  ) { }

  async canActivate(context: ExecutionContext): Promise<boolean> {

    try {
      const request: any = context.switchToHttp().getRequest();

      let token = request.headers.authorization;
      if (!token) throw new UnAuthorizedException("Unauthorized")
      token = token.replace('Bearer ', '');

      const decoded = await jwtLib.jwtVerify(token);
      if (!decoded) throw new UnAuthorizedException("unauthorized")

      const user = await this.dataServices.users.findOne({ _id: decoded._id });
      if (!user) throw new DoesNotExistsException('unauthorized.User does not exists')

      if (!decoded.emailVerified) throw new UnAuthorizedException('unauthorized. Please verify email')
      request.user = decoded;

      return true;
    } catch (error) {
      Logger.error('@jwt-middleware-error', error)
      throw new UnAuthorizedException("unauthorized")
    }
  }
}


@Injectable()
export class LooseAuthGuard implements CanActivate {
  constructor(
    private readonly dataServices: IDataServices

  ) { }

  async canActivate(context: ExecutionContext): Promise<boolean> {

    try {
      const request: any = context.switchToHttp().getRequest();

      let token = request.headers.authorization;
      if (!token) throw new UnAuthorizedException("unauthorized")
      token = token.replace('Bearer ', '');

      const decoded = await jwtLib.jwtVerify(token);
      if (!decoded) throw new UnAuthorizedException("unauthorized")

      const user = await this.dataServices.users.findOne({ _id: decoded._id });
      if (!user) throw new DoesNotExistsException('user does not exists')

      request.user = decoded;

      return true;
    } catch (error) {
      Logger.error('@jwt-middleware-error', error)
      throw new UnAuthorizedException("unauthorized")
    }
  }
}


@Injectable()
export class BypassGuard implements CanActivate {
  constructor() { }

  async canActivate(context: ExecutionContext): Promise<boolean> {

    try {
      const request: any = context.switchToHttp().getRequest();

      const token = request.headers.bypass;
      if (token !== ADMIN_CYPHER_SECRET) throw new UnAuthorizedException("unauthorized")

      return true;
    } catch (error) {
      Logger.error('@jwt-bypass-error', error)
      throw new UnAuthorizedException("unauthorized")
    }
  }
}
