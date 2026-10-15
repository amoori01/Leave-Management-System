import { Test, TestingModule } from '@nestjs/testing';
import { BalancesService } from './balances.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';

describe('BalancesService', () => {
  let balancesService: BalancesService;
  let prismaService: any;

  const mockUser = { id: 'user-1', name: 'Jane Doe', email: 'jane@example.com' };
  const mockLeaveTypes = [
    { id: 'type-annual', name: 'Annual', description: 'Vacation', is_paid: true },
    { id: 'type-sick', name: 'Sick', description: 'Medical', is_paid: true },
  ];

  beforeEach(async () => {
    prismaService = {
      user: {
        findUnique: jest.fn(),
      },
      leaveType: {
        findMany: jest.fn(),
      },
      leaveBalance: {
        findMany: jest.fn(),
      },
      leaveRequest: {
        groupBy: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BalancesService,
        { provide: PrismaService, useValue: prismaService },
      ],
    }).compile();

    balancesService = module.get<BalancesService>(BalancesService);
  });

  it('should be defined', () => {
    expect(balancesService).toBeDefined();
  });

  it('should throw NotFoundException if user does not exist', async () => {
    prismaService.user.findUnique.mockResolvedValue(null);

    await expect(balancesService.getEmployeeBalances('invalid-user', 2026)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('should compute zero used days when employee has no approved requests', async () => {
    prismaService.user.findUnique.mockResolvedValue(mockUser);
    prismaService.leaveType.findMany.mockResolvedValue(mockLeaveTypes);
    prismaService.leaveBalance.findMany.mockResolvedValue([
      { leave_type_id: 'type-annual', total_days: 20, year: 2026 },
      { leave_type_id: 'type-sick', total_days: 10, year: 2026 },
    ]);
    prismaService.leaveRequest.groupBy.mockResolvedValue([]);

    const result = await balancesService.getEmployeeBalances('user-1', 2026);

    expect(result).toHaveLength(2);
    const annual = result.find((r) => r.leave_type_id === 'type-annual');
    expect(annual).toEqual({
      leave_type_id: 'type-annual',
      leave_type_name: 'Annual',
      description: 'Vacation',
      is_paid: true,
      year: 2026,
      total_days: 20,
      used_days: 0,
      remaining_days: 20,
    });
  });

  it('should compute partial used days accurately from SUM of approved requests', async () => {
    prismaService.user.findUnique.mockResolvedValue(mockUser);
    prismaService.leaveType.findMany.mockResolvedValue(mockLeaveTypes);
    prismaService.leaveBalance.findMany.mockResolvedValue([
      { leave_type_id: 'type-annual', total_days: 20, year: 2026 },
      { leave_type_id: 'type-sick', total_days: 10, year: 2026 },
    ]);
    // 5 days of Annual leave approved
    prismaService.leaveRequest.groupBy.mockResolvedValue([
      { leave_type_id: 'type-annual', _sum: { days_count: 5 } },
    ]);

    const result = await balancesService.getEmployeeBalances('user-1', 2026);

    const annual = result.find((r) => r.leave_type_id === 'type-annual');
    expect(annual?.used_days).toBe(5);
    expect(annual?.remaining_days).toBe(15);

    const sick = result.find((r) => r.leave_type_id === 'type-sick');
    expect(sick?.used_days).toBe(0);
    expect(sick?.remaining_days).toBe(10);
  });

  it('should handle exhausted balances (remaining_days = 0)', async () => {
    prismaService.user.findUnique.mockResolvedValue(mockUser);
    prismaService.leaveType.findMany.mockResolvedValue(mockLeaveTypes);
    prismaService.leaveBalance.findMany.mockResolvedValue([
      { leave_type_id: 'type-annual', total_days: 20, year: 2026 },
    ]);
    // 20 days used
    prismaService.leaveRequest.groupBy.mockResolvedValue([
      { leave_type_id: 'type-annual', _sum: { days_count: 20 } },
    ]);

    const result = await balancesService.getEmployeeBalances('user-1', 2026);
    const annual = result.find((r) => r.leave_type_id === 'type-annual');
    expect(annual?.used_days).toBe(20);
    expect(annual?.remaining_days).toBe(0);
  });
});
