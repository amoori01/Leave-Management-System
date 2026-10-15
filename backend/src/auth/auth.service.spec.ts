import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '@prisma/client';

describe('AuthService', () => {
  let authService: AuthService;
  let prismaService: any;
  let jwtService: any;

  const mockUser = {
    id: 'user-uuid-1',
    email: 'test@example.com',
    name: 'Test User',
    password_hash: '',
    role: Role.EMPLOYEE,
    created_at: new Date(),
    updated_at: new Date(),
  };

  beforeAll(async () => {
    mockUser.password_hash = await bcrypt.hash('CorrectPassword123!', 10);
  });

  beforeEach(async () => {
    prismaService = {
      user: {
        findUnique: jest.fn(),
      },
    };

    jwtService = {
      sign: jest.fn().mockReturnValue('mock-jwt-token'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prismaService },
        { provide: JwtService, useValue: jwtService },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(authService).toBeDefined();
  });

  describe('login', () => {
    it('should successfully return JWT and user details for valid credentials', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await authService.login({
        email: 'test@example.com',
        password: 'CorrectPassword123!',
      });

      expect(result).toHaveProperty('access_token', 'mock-jwt-token');
      expect(result.user).toEqual({
        id: mockUser.id,
        email: mockUser.email,
        name: mockUser.name,
        role: mockUser.role,
      });
      expect(jwtService.sign).toHaveBeenCalledWith({
        sub: mockUser.id,
        email: mockUser.email,
        name: mockUser.name,
        role: mockUser.role,
      });
    });

    it('should throw UnauthorizedException when password is incorrect', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);

      await expect(
        authService.login({
          email: 'test@example.com',
          password: 'WrongPassword!',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when user does not exist', async () => {
      prismaService.user.findUnique.mockResolvedValue(null);

      await expect(
        authService.login({
          email: 'nonexistent@example.com',
          password: 'AnyPassword123!',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
