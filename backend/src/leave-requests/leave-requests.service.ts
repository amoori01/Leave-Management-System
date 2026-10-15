import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BalancesService } from '../balances/balances.service';
import { CreateLeaveRequestDto } from './dto/create-leave-request.dto';
import { RejectLeaveRequestDto } from './dto/reject-leave-request.dto';
import {
  isValidDateRange,
  isDateInPast,
  calculateLeaveDays,
  hasOverlappingRequests,
} from '../common/validation/date-validation';
import { RequestStatus, Role } from '@prisma/client';
import { AuthenticatedUser } from '../auth/decorators/current-user.decorator';

@Injectable()
export class LeaveRequestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly balancesService: BalancesService,
  ) {}

  /**
   * Submits a new leave request with comprehensive validation rules.
   */
  async create(userId: string, dto: CreateLeaveRequestDto) {
    // 1. Validate date logic: end_date >= start_date
    if (!isValidDateRange(dto.start_date, dto.end_date)) {
      throw new BadRequestException('end_date must be on or after start_date');
    }

    // 2. Validate start date not in the past
    if (isDateInPast(dto.start_date)) {
      throw new BadRequestException('start_date cannot be in the past');
    }

    // 3. Verify leave type exists
    const leaveType = await this.prisma.leaveType.findUnique({
      where: { id: dto.leave_type_id },
    });
    if (!leaveType) {
      throw new NotFoundException(`Leave type with ID ${dto.leave_type_id} not found`);
    }

    // 4. Calculate total requested calendar days
    const daysCount = calculateLeaveDays(dto.start_date, dto.end_date);
    if (daysCount <= 0) {
      throw new BadRequestException('Requested leave duration must be at least 1 day');
    }

    // 5. Overlap check: ensure no existing PENDING or APPROVED requests overlap
    const existingRequests = await this.prisma.leaveRequest.findMany({
      where: {
        user_id: userId,
        status: { in: [RequestStatus.PENDING, RequestStatus.APPROVED] },
      },
      select: {
        start_date: true,
        end_date: true,
        status: true,
      },
    });

    const hasOverlap = hasOverlappingRequests(
      { startDate: dto.start_date, endDate: dto.end_date },
      existingRequests.map((r) => ({
        startDate: r.start_date,
        endDate: r.end_date,
        status: r.status,
      })),
    );

    if (hasOverlap) {
      throw new BadRequestException(
        'Requested dates overlap with an existing pending or approved leave request',
      );
    }

    // 6. Balance check: requested days cannot exceed dynamic remaining balance
    const startYear = new Date(dto.start_date).getFullYear();
    const balance = await this.balancesService.getRemainingDays(
      userId,
      dto.leave_type_id,
      startYear,
    );

    if (daysCount > balance.remainingDays) {
      throw new BadRequestException(
        `Requested days (${daysCount}) exceed remaining balance (${balance.remainingDays}) for ${leaveType.name} leave`,
      );
    }

    // 7. Persist new leave request in database
    return this.prisma.leaveRequest.create({
      data: {
        user_id: userId,
        leave_type_id: dto.leave_type_id,
        start_date: new Date(dto.start_date),
        end_date: new Date(dto.end_date),
        days_count: daysCount,
        reason: dto.reason,
        status: RequestStatus.PENDING,
      },
      include: {
        leaveType: true,
      },
    });
  }

  /**
   * Retrieves list of requests based on user role.
   * Admins view all requests; Employees view only their own.
   */
  async findAll(user: AuthenticatedUser) {
    if (user.role === Role.ADMIN) {
      return this.prisma.leaveRequest.findMany({
        orderBy: { created_at: 'desc' },
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
          leaveType: true,
          decider: {
            select: { id: true, name: true, email: true },
          },
        },
      });
    }

    return this.prisma.leaveRequest.findMany({
      where: { user_id: user.userId },
      orderBy: { created_at: 'desc' },
      include: {
        leaveType: true,
      },
    });
  }

  /**
   * Detail view for Admin: includes request, requester's dynamic balance, and leave history.
   */
  async findOne(id: string) {
    const request = await this.prisma.leaveRequest.findUnique({
      where: { id },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
        leaveType: true,
        decider: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (!request) {
      throw new NotFoundException(`Leave request with ID ${id} not found`);
    }

    const year = request.start_date.getFullYear();
    const [requesterBalances, requesterHistory] = await Promise.all([
      this.balancesService.getEmployeeBalances(request.user_id, year),
      this.prisma.leaveRequest.findMany({
        where: { user_id: request.user_id },
        orderBy: { created_at: 'desc' },
        include: { leaveType: true },
      }),
    ]);

    return {
      ...request,
      requester_balances: requesterBalances,
      requester_history: requesterHistory,
    };
  }

  /**
   * Approves a pending request and updates state.
   * Re-evaluates dynamic balance before committing approval.
   */
  async approve(id: string, adminId: string) {
    const request = await this.prisma.leaveRequest.findUnique({
      where: { id },
      include: { leaveType: true },
    });

    if (!request) {
      throw new NotFoundException(`Leave request with ID ${id} not found`);
    }

    // State machine check: only PENDING requests can be decided
    if (request.status !== RequestStatus.PENDING) {
      throw new ConflictException(
        `Cannot approve request with status '${request.status}'. Only PENDING requests can be decided.`,
      );
    }

    // Dynamic balance validation before approval
    const year = request.start_date.getFullYear();
    const balance = await this.balancesService.getRemainingDays(
      request.user_id,
      request.leave_type_id,
      year,
    );

    if (request.days_count > balance.remainingDays) {
      throw new BadRequestException(
        `Cannot approve: requested days (${request.days_count}) exceed remaining balance (${balance.remainingDays})`,
      );
    }

    return this.prisma.leaveRequest.update({
      where: { id },
      data: {
        status: RequestStatus.APPROVED,
        approved_by: adminId,
        approved_at: new Date(),
      },
      include: {
        leaveType: true,
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });
  }

  /**
   * Rejects a pending request with optional admin comment.
   */
  async reject(id: string, adminId: string, dto?: RejectLeaveRequestDto) {
    const request = await this.prisma.leaveRequest.findUnique({
      where: { id },
    });

    if (!request) {
      throw new NotFoundException(`Leave request with ID ${id} not found`);
    }

    // State machine check: only PENDING requests can be decided
    if (request.status !== RequestStatus.PENDING) {
      throw new ConflictException(
        `Cannot reject request with status '${request.status}'. Only PENDING requests can be decided.`,
      );
    }

    return this.prisma.leaveRequest.update({
      where: { id },
      data: {
        status: RequestStatus.REJECTED,
        approved_by: adminId,
        approved_at: new Date(),
        admin_comment: dto?.admin_comment,
      },
      include: {
        leaveType: true,
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });
  }
}
