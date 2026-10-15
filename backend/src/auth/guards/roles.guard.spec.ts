import { Reflector } from '@nestjs/core';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { RolesGuard } from './roles.guard';

describe('RolesGuard', () => {
  let rolesGuard: RolesGuard;
  let reflector: Reflector;

  const createMockContext = (user: any): ExecutionContext => {
    return {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => ({ user }),
        getResponse: jest.fn(),
        getNext: jest.fn(),
      }),
    } as unknown as ExecutionContext;
  };

  beforeEach(() => {
    reflector = new Reflector();
    rolesGuard = new RolesGuard(reflector);
  });

  it('should allow access if no roles are defined on handler/class', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);

    const context = createMockContext({ role: Role.EMPLOYEE });
    expect(rolesGuard.canActivate(context)).toBe(true);
  });

  it('should allow access if user has one of the required roles', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.ADMIN]);

    const context = createMockContext({ role: Role.ADMIN });
    expect(rolesGuard.canActivate(context)).toBe(true);
  });

  it('should throw ForbiddenException if user has a different role', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.ADMIN]);

    const context = createMockContext({ role: Role.EMPLOYEE });
    expect(() => rolesGuard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('should throw ForbiddenException if request has no authenticated user', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.ADMIN]);

    const context = createMockContext(null);
    expect(() => rolesGuard.canActivate(context)).toThrow(ForbiddenException);
  });
});
