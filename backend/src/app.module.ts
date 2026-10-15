import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { BalancesModule } from './balances/balances.module';
import { LeaveRequestsModule } from './leave-requests/leave-requests.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [PrismaModule, AuthModule, BalancesModule, LeaveRequestsModule, UsersModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
