import { Module } from '@nestjs/common';
import { PrismaModule } from '../../common/prisma/prisma.module.js';
import { EmployeesModule } from '../employee/employee.module.js';
import { CompaniesController } from './company.controller.js';
import { CompaniesService } from './company.service.js';

@Module({
  imports: [PrismaModule, EmployeesModule],
  controllers: [CompaniesController],
  providers: [CompaniesService],
  exports: [CompaniesService],
})
export class CompaniesModule {}
