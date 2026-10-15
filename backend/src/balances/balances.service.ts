import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RequestStatus } from '@prisma/client';

export interface DynamicBalanceResult {
  leave_type_id: string;
  leave_type_name: string;
  description: string | null;
  is_paid: boolean;
  year: number;
  total_days: number;
  used_days: number;
  remaining_days: number;
}

@Injectable()
export class BalancesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Computes dynamic balances for all leave types for a given user and calendar year.
   * remaining_days = total_days - SUM(APPROVED request days in that year)
   */
  async getEmployeeBalances(
    userId: string,
    year: number = new Date().getFullYear(),
  ): Promise<DynamicBalanceResult[]> {
    // 1. Fetch user to ensure existence
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    // 2. Fetch all leave types
    const leaveTypes = await this.prisma.leaveType.findMany();

    // 3. Fetch allowance records for the user and year
    const balances = await this.prisma.leaveBalance.findMany({
      where: {
        user_id: userId,
        year: year,
      },
    });

    const balanceMap = new Map<string, number>();
    for (const b of balances) {
      balanceMap.set(b.leave_type_id, b.total_days);
    }

    // 4. Calculate used days per leave type using SUM(days_count) where status = APPROVED
    // Filter by requests within the specified year
    const startOfYear = new Date(year, 0, 1);
    const endOfYear = new Date(year, 11, 31, 23, 59, 59, 999);

    const approvedAggregations = await this.prisma.leaveRequest.groupBy({
      by: ['leave_type_id'],
      where: {
        user_id: userId,
        status: RequestStatus.APPROVED,
        start_date: {
          gte: startOfYear,
          lte: endOfYear,
        },
      },
      _sum: {
        days_count: true,
      },
    });

    const usedMap = new Map<string, number>();
    for (const agg of approvedAggregations) {
      usedMap.set(agg.leave_type_id, agg._sum.days_count || 0);
    }

    // 5. Construct dynamic balance response
    return leaveTypes.map((type) => {
      const totalDays = balanceMap.get(type.id) || 0;
      const usedDays = usedMap.get(type.id) || 0;
      const remainingDays = Math.max(0, totalDays - usedDays);

      return {
        leave_type_id: type.id,
        leave_type_name: type.name,
        description: type.description,
        is_paid: type.is_paid,
        year,
        total_days: totalDays,
        used_days: usedDays,
        remaining_days: remainingDays,
      };
    });
  }

  /**
   * Retrieves dynamic remaining balance for a specific leave type and year.
   */
  async getRemainingDays(
    userId: string,
    leaveTypeId: string,
    year: number = new Date().getFullYear(),
  ): Promise<{ totalDays: number; usedDays: number; remainingDays: number }> {
    const balances = await this.getEmployeeBalances(userId, year);
    const balance = balances.find((b) => b.leave_type_id === leaveTypeId);

    if (!balance) {
      return { totalDays: 0, usedDays: 0, remainingDays: 0 };
    }

    return {
      totalDays: balance.total_days,
      usedDays: balance.used_days,
      remainingDays: balance.remaining_days,
    };
  }
}
