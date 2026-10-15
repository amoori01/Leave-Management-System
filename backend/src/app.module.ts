import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { BalancesModule } from './balances/balances.module';
import { LeaveRequestsModule } from './leave-requests/leave-requests.module';

@Module({
  imports: [PrismaModule, AuthModule, BalancesModule, LeaveRequestsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
