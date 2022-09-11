import { Controller, Get, HttpException, Logger, Param, Query, Res, UseGuards } from "@nestjs/common";
import { TransactionServices } from "src/services/use-cases/transaction/transaction-services.services";
import { Response } from "express"
import { StrictAuthGuard } from "src/middleware-guards/auth-guard.middleware";
import { FindByIdDto } from "src/core/dtos/authentication/login.dto";

@Controller('admin/transactions')
export class AdminTransactionsController {

  constructor(private services: TransactionServices) { }

  @Get("/")
  @UseGuards(StrictAuthGuard)
  async findAll(@Query() query: any, @Res() res: Response) {
    try {

      const { perpage, page, dateFrom, dateTo, sortBy, orderBy, userId } = query

      const response = await this.services.getAllTransactions({ perpage, page, dateFrom, dateTo, sortBy, orderBy, userId });
      return res.status(response.status).json(response);

    } catch (error) {
      Logger.error(error);
      if (error.name === "TypeError")
        throw new HttpException(error.message, 500);
      throw new HttpException(error.message, 500);
    }
  }


  @Get('/:id')
  @UseGuards(StrictAuthGuard)
  async getSingleTransaction(
    @Res() res: Response,
    @Param() param: FindByIdDto
  ) {
    try {
      const { id } = param;
      const response = await this.services.getSingleTransaction(id);
      return res.status(response.status).json(response);
    } catch (error) {
      Logger.error(error);
      if (error.name === "TypeError")
        throw new HttpException(error.message, 500);
      throw new HttpException(error.message, 500);
    }
  }
}