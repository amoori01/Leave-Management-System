# Leave Management System

A full-stack web application designed for enterprise leave management. Employees can submit leave requests, view dynamic leave balances, and track request history. Admins can review, approve, or reject pending requests with real-time balance calculations.

---

## Tech Stack

- **Runtime & Package Manager**: [Bun](https://bun.sh/)
- **Backend**: [NestJS](https://nestjs.com/) (TypeScript, REST API)
- **Frontend**: [Next.js](https://nextjs.org/) (React, App Router)
- **Database & ORM**: PostgreSQL with [Prisma](https://www.prisma.io/)
- **Authentication**: JWT with bcrypt hashing & Role-Based Access Control (`EMPLOYEE`, `ADMIN`)
- **Testing**: Jest / Bun Test

---

## Architecture & Dynamic Balance Trade-Off

To maintain 100% data integrity, leave balances are **not stored as static integers** that require fragile two-phase database transactions. Instead:
- Allowance is defined per leave type and year.
- **Used Days** and **Remaining Days** are computed dynamically at runtime using `SUM(days_count)` over all requests with status `APPROVED`.
- Deductions strictly occur upon admin approval, avoiding out-of-sync balances.

---

## Getting Started

### Prerequisites
- [Bun](https://bun.sh/) (v1.0+)
- [PostgreSQL](https://www.postgresql.org/) (v15+)

### 1. Environment Setup
```bash
cp .env.example .env
```

### 2. Backend Setup
```bash
cd backend
bun install
bunx prisma migrate dev --name init
bunx prisma db seed
bun run start:dev
```
Backend API will be running at: `http://localhost:3001`

### 3. Frontend Setup
```bash
cd frontend
bun install
bun run dev
```
Frontend Web App will be running at: `http://localhost:3000`

---

## Default Seed Accounts

| Role | Email | Password | Initial Balances |
|---|---|---|---|
| **Admin** | `admin@example.com` | `Admin123!` | N/A |
| **Employee** | `employee@example.com` | `Employee123!` | Annual: 20 days, Sick: 10 days |

---

## Scripts & Testing

```bash
# Run backend tests
cd backend
bun test

# Run test coverage
bun test --coverage
```
