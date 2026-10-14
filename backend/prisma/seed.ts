import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // 1. Seed Leave Types
  const annualLeave = await prisma.leaveType.upsert({
    where: { name: 'Annual' },
    update: {},
    create: {
      name: 'Annual',
      description: 'Paid annual vacation leave',
      is_paid: true,
    },
  });

  const sickLeave = await prisma.leaveType.upsert({
    where: { name: 'Sick' },
    update: {},
    create: {
      name: 'Sick',
      description: 'Paid sick leave for medical conditions',
      is_paid: true,
    },
  });

  console.log('Created leave types: Annual, Sick');

  // 2. Seed Admin User
  const adminPasswordHash = await bcrypt.hash('Admin123!', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      name: 'System Admin',
      email: 'admin@example.com',
      password_hash: adminPasswordHash,
      role: Role.ADMIN,
    },
  });
  console.log(`Created admin user: ${admin.email}`);

  // 3. Seed Employee User
  const employeePasswordHash = await bcrypt.hash('Employee123!', 10);
  const employee = await prisma.user.upsert({
    where: { email: 'employee@example.com' },
    update: {},
    create: {
      name: 'Jane Doe',
      email: 'employee@example.com',
      password_hash: employeePasswordHash,
      role: Role.EMPLOYEE,
    },
  });
  console.log(`Created employee user: ${employee.email}`);

  // 4. Seed Leave Balances for Current Year
  const currentYear = new Date().getFullYear();

  await prisma.leaveBalance.upsert({
    where: {
      user_id_leave_type_id_year: {
        user_id: employee.id,
        leave_type_id: annualLeave.id,
        year: currentYear,
      },
    },
    update: {},
    create: {
      user_id: employee.id,
      leave_type_id: annualLeave.id,
      year: currentYear,
      total_days: 20,
    },
  });

  await prisma.leaveBalance.upsert({
    where: {
      user_id_leave_type_id_year: {
        user_id: employee.id,
        leave_type_id: sickLeave.id,
        year: currentYear,
      },
    },
    update: {},
    create: {
      user_id: employee.id,
      leave_type_id: sickLeave.id,
      year: currentYear,
      total_days: 10,
    },
  });

  console.log(`Created leave balances for ${employee.name} (${currentYear}): Annual=20, Sick=10`);
  console.log('Seeding completed successfully.');
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
