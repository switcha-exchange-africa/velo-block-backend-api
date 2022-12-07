import { Body, Controller, Get, Param, Post, Put, Query, Req, Res } from "@nestjs/common";
import { Response, Request } from "express"
import { isAdminAuthenticated } from "src/core/decorators";
import { FindByIdDto } from "src/core/dtos/authentication/login.dto";
import { IUpdateFeeWalletWithAddress, UpdateFeeWalletAddresssDto } from "src/core/dtos/wallet/wallet.dto";
import { ByPass } from "src/decorator";
import { FeeWalletServices } from "src/services/use-cases/fee-wallet/fee-wallet.service";

@Controller('admin/fee-wallets')
export class AdminFeeWalletsController {

  constructor(private services: FeeWalletServices) { }


  @Post('/')
  @isAdminAuthenticated('strict')
  @ByPass('pass')
  async seedWallets(@Req() req: Request, @Res() res: Response) {
    try {

      const userId = req?.user?._id
      const response = await this.services.seedWallets(userId);

      return res.status(response.status).json(response);

    } catch (error) {
      return res.status(error.status || 500).json(error);

    }
  }
  @Get('/')
  @isAdminAuthenticated('strict')
  async getAllWallets(@Res() res: Response, @Query() query) {
    try {

      const { perpage, page, dateFrom, dateTo, sortBy, orderBy, userId, coin, reference } = query
      const response = await this.services.getAllWallets({ perpage, page, dateFrom, dateTo, sortBy, orderBy, userId, coin, reference });

      return res.status(response.status).json(response);

    } catch (error) {
      return res.status(error.status || 500).json(error);

    }
  }

  @Get('/:id')
  @isAdminAuthenticated('strict')
  async getSingleWallet(@Res() res: Response, @Param() param: FindByIdDto) {
    try {

      const { id } = param;
      const response = await this.services.getSingleWallet(id);

      return res.status(response.status).json(response);

    } catch (error) {
      return res.status(error.status || 500).json(error);

    }
  }

  @isAdminAuthenticated('strict')
  @Put('/:id/update-address')
  async updateWalletAddress(@Res() res: Response, @Param() param: FindByIdDto, @Body() body: UpdateFeeWalletAddresssDto) {
    try {

      const { id } = param;
      const payload: IUpdateFeeWalletWithAddress = {
        ...body,
        id
      }
      
      const response = await this.services.updateWalletAddress(payload);
      return res.status(response.status).json(response);

    } catch (error) {
      return res.status(error.status || 500).json(error);

    }
  }



}