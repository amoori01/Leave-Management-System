import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { BalancesService, DynamicBalanceResult } from './balances.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, type AuthenticatedUser } from '../auth/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('balances')
export class BalancesController {
  constructor(private readonly balancesService: BalancesService) {}

  @Get('me')
  async getMyBalances(
    @CurrentUser() user: AuthenticatedUser,
    @Query('year') yearQuery?: string,
  ): Promise<DynamicBalanceResult[]> {
    const year = yearQuery ? parseInt(yearQuery, 10) : new Date().getFullYear();
    return this.balancesService.getEmployeeBalances(user.userId, year);
  }
}
