import { Injectable, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

export interface SafeUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createUserDto: CreateUserDto): Promise<SafeUser> {
    const normalizedEmail = createUserDto.email.toLowerCase().trim();

    const existingUser = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      throw new ConflictException('Email is already registered');
    }

    const password_hash = await bcrypt.hash(createUserDto.password, 10);
    const role = createUserDto.role ?? Role.EMPLOYEE;

    const user = await this.prisma.user.create({
      data: {
        name: createUserDto.name.trim(),
        email: normalizedEmail,
        password_hash,
        role,
      },
    });

    // Auto-seed current year leave balances for the newly created user
    const currentYear = new Date().getFullYear();
    const annualDays = createUserDto.annual_days ?? 20;
    const sickDays = createUserDto.sick_days ?? 10;

    const leaveTypes = await this.prisma.leaveType.findMany();

    for (const lt of leaveTypes) {
      let total_days = 0;
      if (lt.name.toLowerCase().includes('annual')) {
        total_days = annualDays;
      } else if (lt.name.toLowerCase().includes('sick')) {
        total_days = sickDays;
      }

      await this.prisma.leaveBalance.upsert({
        where: {
          user_id_leave_type_id_year: {
            user_id: user.id,
            leave_type_id: lt.id,
            year: currentYear,
          },
        },
        update: {},
        create: {
          user_id: user.id,
          leave_type_id: lt.id,
          year: currentYear,
          total_days,
        },
      });
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  async findAll(): Promise<SafeUser[]> {
    return this.prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
