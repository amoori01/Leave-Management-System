import { Controller, Get, Post, Patch, Param, Body, UseGuards } from '@nestjs/common';
import { LeaveRequestsService } from './leave-requests.service';
import { CreateLeaveRequestDto } from './dto/create-leave-request.dto';
import { RejectLeaveRequestDto } from './dto/reject-leave-request.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser, type AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { Role } from '@prisma/client';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('leave-requests')
export class LeaveRequestsController {
  constructor(private readonly leaveRequestsService: LeaveRequestsService) {}

  @Post()
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() createDto: CreateLeaveRequestDto,
  ) {
    return this.leaveRequestsService.create(user.userId, createDto);
  }

  @Get()
  async findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.leaveRequestsService.findAll(user);
  }

  @Get(':id')
  @Roles(Role.ADMIN)
  async findOne(@Param('id') id: string) {
    return this.leaveRequestsService.findOne(id);
  }

  @Patch(':id/approve')
  @Roles(Role.ADMIN)
  async approve(
    @Param('id') id: string,
    @CurrentUser() admin: AuthenticatedUser,
  ) {
    return this.leaveRequestsService.approve(id, admin.userId);
  }

  @Patch(':id/reject')
  @Roles(Role.ADMIN)
  async reject(
    @Param('id') id: string,
    @CurrentUser() admin: AuthenticatedUser,
    @Body() rejectDto?: RejectLeaveRequestDto,
  ) {
    return this.leaveRequestsService.reject(id, admin.userId, rejectDto);
  }
}
