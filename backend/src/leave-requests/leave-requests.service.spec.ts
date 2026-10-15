import { Test, TestingModule } from '@nestjs/testing';
import { LeaveRequestsService } from './leave-requests.service';
import { PrismaService } from '../prisma/prisma.service';
import { BalancesService } from '../balances/balances.service';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { RequestStatus, Role } from '@prisma/client';

describe('LeaveRequestsService', () => {
  let service: LeaveRequestsService;
  let prisma: any;
  let balancesService: any;

  const mockLeaveType = {
    id: 'type-annual',
    name: 'Annual',
    is_paid: true,
  };

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  const futureEnd = new Date();
  futureEnd.setDate(futureEnd.getDate() + 3);
  const futureEndStr = futureEnd.toISOString().split('T')[0];

  beforeEach(async () => {
    prisma = {
      leaveType: {
        findUnique: jest.fn(),
      },
      leaveRequest: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };

    balancesService = {
      getRemainingDays: jest.fn(),
      getEmployeeBalances: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LeaveRequestsService,
        { provide: PrismaService, useValue: prisma },
        { provide: BalancesService, useValue: balancesService },
      ],
    }).compile();

    service = module.get<LeaveRequestsService>(LeaveRequestsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should successfully create a pending leave request when all validations pass', async () => {
      prisma.leaveType.findUnique.mockResolvedValue(mockLeaveType);
      prisma.leaveRequest.findMany.mockResolvedValue([]); // No overlaps
      balancesService.getRemainingDays.mockResolvedValue({
        totalDays: 20,
        usedDays: 0,
        remainingDays: 20,
      });

      const mockCreated = {
        id: 'req-1',
        user_id: 'user-1',
        leave_type_id: 'type-annual',
        start_date: new Date(tomorrowStr),
        end_date: new Date(futureEndStr),
        days_count: 3,
        status: RequestStatus.PENDING,
      };
      prisma.leaveRequest.create.mockResolvedValue(mockCreated);

      const result = await service.create('user-1', {
        leave_type_id: 'type-annual',
        start_date: tomorrowStr,
        end_date: futureEndStr,
        reason: 'Holiday trip',
      });

      expect(result).toEqual(mockCreated);
      expect(prisma.leaveRequest.create).toHaveBeenCalled();
    });

    it('should reject a request with start date in the past', async () => {
      await expect(
        service.create('user-1', {
          leave_type_id: 'type-annual',
          start_date: '2020-01-01',
          end_date: '2020-01-05',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject a request where end_date is before start_date', async () => {
      await expect(
        service.create('user-1', {
          leave_type_id: 'type-annual',
          start_date: futureEndStr,
          end_date: tomorrowStr,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject a request if dates overlap with an existing PENDING or APPROVED request', async () => {
      prisma.leaveType.findUnique.mockResolvedValue(mockLeaveType);
      // Existing request overlaps with tomorrow -> futureEnd
      prisma.leaveRequest.findMany.mockResolvedValue([
        {
          start_date: new Date(tomorrowStr),
          end_date: new Date(futureEndStr),
          status: RequestStatus.PENDING,
        },
      ]);

      await expect(
        service.create('user-1', {
          leave_type_id: 'type-annual',
          start_date: tomorrowStr,
          end_date: futureEndStr,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject a request if requested days exceed remaining balance', async () => {
      prisma.leaveType.findUnique.mockResolvedValue(mockLeaveType);
      prisma.leaveRequest.findMany.mockResolvedValue([]);
      // Only 1 day remaining, but requested 3 days
      balancesService.getRemainingDays.mockResolvedValue({
        totalDays: 20,
        usedDays: 19,
        remainingDays: 1,
      });

      await expect(
        service.create('user-1', {
          leave_type_id: 'type-annual',
          start_date: tomorrowStr,
          end_date: futureEndStr,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('approve', () => {
    it('should approve a pending request and record admin decision and timestamp', async () => {
      const pendingRequest = {
        id: 'req-1',
        user_id: 'user-1',
        leave_type_id: 'type-annual',
        start_date: new Date(tomorrowStr),
        days_count: 3,
        status: RequestStatus.PENDING,
      };

      prisma.leaveRequest.findUnique.mockResolvedValue(pendingRequest);
      balancesService.getRemainingDays.mockResolvedValue({
        totalDays: 20,
        usedDays: 0,
        remainingDays: 20,
      });
      prisma.leaveRequest.update.mockResolvedValue({
        ...pendingRequest,
        status: RequestStatus.APPROVED,
        approved_by: 'admin-1',
        approved_at: new Date(),
      });

      const result = await service.approve('req-1', 'admin-1');

      expect(result.status).toBe(RequestStatus.APPROVED);
      expect(prisma.leaveRequest.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'req-1' },
          data: expect.objectContaining({
            status: RequestStatus.APPROVED,
            approved_by: 'admin-1',
          }),
        }),
      );
    });

    it('should throw ConflictException (409) if request is already decided', async () => {
      const approvedRequest = {
        id: 'req-1',
        user_id: 'user-1',
        status: RequestStatus.APPROVED,
      };
      prisma.leaveRequest.findUnique.mockResolvedValue(approvedRequest);

      await expect(service.approve('req-1', 'admin-1')).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('reject', () => {
    it('should reject a pending request with optional admin comment', async () => {
      const pendingRequest = {
        id: 'req-1',
        user_id: 'user-1',
        status: RequestStatus.PENDING,
      };

      prisma.leaveRequest.findUnique.mockResolvedValue(pendingRequest);
      prisma.leaveRequest.update.mockResolvedValue({
        ...pendingRequest,
        status: RequestStatus.REJECTED,
        approved_by: 'admin-1',
        admin_comment: 'Insufficient coverage',
      });

      const result = await service.reject('req-1', 'admin-1', {
        admin_comment: 'Insufficient coverage',
      });

      expect(result.status).toBe(RequestStatus.REJECTED);
      expect(prisma.leaveRequest.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'req-1' },
          data: expect.objectContaining({
            status: RequestStatus.REJECTED,
            admin_comment: 'Insufficient coverage',
          }),
        }),
      );
    });

    it('should throw ConflictException (409) when rejecting an already rejected request', async () => {
      const alreadyRejected = {
        id: 'req-1',
        status: RequestStatus.REJECTED,
      };
      prisma.leaveRequest.findUnique.mockResolvedValue(alreadyRejected);

      await expect(service.reject('req-1', 'admin-1')).rejects.toThrow(
        ConflictException,
      );
    });
  });
});
