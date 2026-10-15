import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma/prisma.service';
import { ConflictException, BadRequestException, NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

describe('UsersService', () => {
  let service: UsersService;
  let prisma: any;

  const mockLeaveTypes = [
    { id: 'lt-annual-id', name: 'Annual', is_paid: true },
    { id: 'lt-sick-id', name: 'Sick', is_paid: true },
  ];

  beforeEach(async () => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
        findMany: jest.fn(),
        delete: jest.fn(),
      },
      leaveType: {
        findMany: jest.fn().mockResolvedValue(mockLeaveTypes),
      },
      leaveBalance: {
        upsert: jest.fn().mockResolvedValue({}),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should successfully create a new employee user, hash password, and allocate default balances', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockImplementation(({ data }: any) => {
        return Promise.resolve({
          id: 'user-new-123',
          name: data.name,
          email: data.email,
          password_hash: data.password_hash,
          role: data.role,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      });

      const result = await service.create({
        name: 'Alice Wonder',
        email: 'alice@example.com',
        password: 'Password123!',
      });

      expect(result).toHaveProperty('id', 'user-new-123');
      expect(result).toHaveProperty('name', 'Alice Wonder');
      expect(result).toHaveProperty('email', 'alice@example.com');
      expect(result).toHaveProperty('role', Role.EMPLOYEE);
      expect((result as any).password_hash).toBeUndefined();

      // Verify password was hashed
      const createCall = prisma.user.create.mock.calls[0][0];
      const isHashed = await bcrypt.compare('Password123!', createCall.data.password_hash);
      expect(isHashed).toBe(true);

      // Verify leave balance allocations (Annual = 20, Sick = 10)
      expect(prisma.leaveBalance.upsert).toHaveBeenCalledTimes(2);
      expect(prisma.leaveBalance.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            user_id: 'user-new-123',
            leave_type_id: 'lt-annual-id',
            total_days: 20,
          }),
        }),
      );
      expect(prisma.leaveBalance.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            user_id: 'user-new-123',
            leave_type_id: 'lt-sick-id',
            total_days: 10,
          }),
        }),
      );
    });

    it('should throw ConflictException if email is already registered', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'existing-id',
        email: 'alice@example.com',
      });

      await expect(
        service.create({
          name: 'Alice Duplicate',
          email: 'alice@example.com',
          password: 'Password123!',
        }),
      ).rejects.toThrow(ConflictException);

      expect(prisma.user.create).not.toHaveBeenCalled();
    });

    it('should allow custom starting days for annual and sick leave', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({
        id: 'custom-user-id',
        name: 'Bob Custom',
        email: 'bob@example.com',
        role: Role.EMPLOYEE,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await service.create({
        name: 'Bob Custom',
        email: 'bob@example.com',
        password: 'Password123!',
        annual_days: 25,
        sick_days: 15,
      });

      expect(prisma.leaveBalance.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            total_days: 25,
          }),
        }),
      );
      expect(prisma.leaveBalance.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            total_days: 15,
          }),
        }),
      );
    });
  });

  describe('findAll', () => {
    it('should return list of all users without password_hash', async () => {
      const mockUsers = [
        {
          id: '1',
          name: 'Admin',
          email: 'admin@example.com',
          role: Role.ADMIN,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: '2',
          name: 'Employee',
          email: 'employee@example.com',
          role: Role.EMPLOYEE,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      prisma.user.findMany.mockResolvedValue(mockUsers);

      const users = await service.findAll();
      expect(users).toHaveLength(2);
      expect(users[0].email).toBe('admin@example.com');
      expect((users[0] as any).password_hash).toBeUndefined();
    });
  });

  describe('remove', () => {
    it('should successfully remove an employee user', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-to-delete',
        name: 'Sarah Connor',
        role: Role.EMPLOYEE,
      });
      prisma.user.delete.mockResolvedValue({});

      const result = await service.remove('user-to-delete', 'admin-id');
      expect(result.message).toContain('Sarah Connor removed successfully');
      expect(prisma.user.delete).toHaveBeenCalledWith({
        where: { id: 'user-to-delete' },
      });
    });

    it('should throw BadRequestException if an admin attempts to delete themselves', async () => {
      await expect(service.remove('admin-id', 'admin-id')).rejects.toThrow(
        BadRequestException,
      );
      expect(prisma.user.delete).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if user to delete does not exist', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.remove('non-existent-user', 'admin-id'),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.user.delete).not.toHaveBeenCalled();
    });
  });
});
