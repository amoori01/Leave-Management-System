# Leave Management System (LMS)

A full-stack, enterprise-ready Leave Management System built with **Next.js 16**, **NestJS**, **Prisma ORM**, **PostgreSQL**, and powered by **Bun**.

---

## 🚀 Key Features

### 👤 Employee Portal
- **Dashboard & Balances:** Dynamic real-time calculation of used and remaining leave days per leave type (Annual, Sick, etc.).
- **Leave Application Form:** Submit leave requests with date range picker, days counter, and mandatory justification reason.
- **Request History:** Interactive table tracking all past requests with status indicators (`PENDING`, `APPROVED`, `REJECTED`).

### 🛡️ Administrator Portal
- **Analytics & Metrics:** Real-time counters for Total Submissions, Pending Review, Approved, and Rejected requests.
- **Leave Review & Decision Modal:** Inspect applicant details, full historical leaves, and current dynamic balances before approving or rejecting (with optional admin comment).
- **Staff Directory Management (Option B Provisioning):**
  - **Add Employee:** Create staff accounts with bcrypt password hashing and automatic allocation of starting leave allowances (20 days Annual, 10 days Sick).
  - **Remove Employee:** Permanently offboard staff with one-click database cascade cleanup and built-in protection against admin self-deletion.

### 🔒 Security & Data Integrity
- **Dynamic Balance Calculation:** Remaining days are calculated dynamically via `SUM(days_count)` on approved requests, eliminating out-of-sync balance bugs without fragile two-phase locking.
- **Strict Validation Rules:**
  - Mandatory justification reason (`@IsNotEmpty()`).
  - Dates in the past are rejected.
  - End date must be on or after start date.
  - Overlap detection prevents booking duplicate dates against existing pending or approved requests.
- **Role-Based Access Control (RBAC):** Guarded routes with JWT Bearer tokens and custom `RolesGuard` (`ADMIN` vs `EMPLOYEE`).
- **Clean UI Palette:** Professional, solid color controls (no gradients) built with Tailwind CSS and Lucide icons.

---

## 🛠️ Tech Stack

| Area | Technology |
| :--- | :--- |
| **Runtime & Package Manager** | [Bun](https://bun.sh/) (v1.3.11) |
| **Backend Framework** | [NestJS](https://nestjs.com/) (TypeScript, REST API, Passport JWT) |
| **Frontend Framework** | [Next.js 16](https://nextjs.org/) (React, App Router, Tailwind CSS, Lucide Icons) |
| **Database & ORM** | [PostgreSQL 15](https://www.postgresql.org/) with [Prisma ORM](https://www.prisma.io/) |
| **Testing** | Bun Test runner / Jest (52 unit tests) |
| **Containerization** | Docker & Docker Compose |
| **Deployment** | Vercel (Frontend) + Render (Backend) + Neon (Serverless PostgreSQL) |

---

## 📡 API Endpoints

### Authentication
| Method | Route | Access | Description |
|---|---|---|---|
| `POST` | `/auth/login` | Public | Authenticates user with email/password and returns JWT. |
| `GET` | `/auth/me` | Authenticated | Returns current authenticated user profile. |

### User Management
| Method | Route | Access | Description |
|---|---|---|---|
| `POST` | `/users` | `ADMIN` | Provisions new employee account and auto-seeds current year leave balances. |
| `GET` | `/users` | `ADMIN` | Returns list of all company staff for the directory. |
| `DELETE` | `/users/:id` | `ADMIN` | Permanently deletes an employee account and cascades database cleanup. |

### Balances
| Method | Route | Access | Description |
|---|---|---|---|
| `GET` | `/balances/me` | `EMPLOYEE` | Returns dynamically computed balances per leave type for the active year. |

### Leave Requests
| Method | Route | Access | Description |
|---|---|---|---|
| `POST` | `/leave-requests` | `EMPLOYEE` | Submits a new pending request with mandatory reason. |
| `GET` | `/leave-requests` | Both | Returns user's own requests (Employee) or all company requests (Admin). |
| `GET` | `/leave-requests/:id` | `ADMIN` | Returns request details with requester's leave history and live balances. |
| `PATCH` | `/leave-requests/:id/approve` | `ADMIN` | Approves request and records decision timestamp and admin ID. |
| `PATCH` | `/leave-requests/:id/reject` | `ADMIN` | Rejects request with optional admin comment. |

---

## 💻 Getting Started Locally

### Prerequisites
- [Bun](https://bun.sh/) (`curl -fsSL https://bun.sh/install | bash`)
- [Docker](https://www.docker.com/) (for PostgreSQL)

### 1. Clone & Setup Environment
```bash
git clone https://github.com/amoori01/Leave-Management-System.git
cd Leave-Management-System
cp .env.example .env
```

### 2. Run Database via Docker
```bash
docker run -d --name leave_postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=leave_management -p 5432:5432 postgres:15-alpine
```

### 3. Backend Setup
```bash
cd backend
bun install
bunx prisma migrate deploy
bun run prisma/seed.ts
bun run start:dev
```
Backend API will be running at: `http://localhost:3001`

### 4. Frontend Setup
In a new terminal:
```bash
cd frontend
bun install
bun run dev
```
Frontend Web App will be running at: `http://localhost:3000`

---

## 🐳 Quick Start with Docker Compose

You can launch the entire stack (PostgreSQL, Backend API, Frontend App) with a single command:

```bash
docker compose up -d --build
```
- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:3001`
- PostgreSQL: `localhost:5432`

---

## 🔑 Default Seed Accounts

| Role | Email | Password | Initial Balance |
|---|---|---|---|
| **System Admin** | `admin@example.com` | `Admin123!` | Full Admin Privileges |
| **Demo Employee** | `employee@example.com` | `Employee123!` | Annual: 20 days, Sick: 10 days |

---

## 🧪 Testing & CI Verification

The project includes an automated test suite covering authentication, role guards, leave request business logic, dynamic balance computations, and date validations.

```bash
# Run all unit tests
bun test

# Run tests in backend
cd backend && bun test

# Run full local CI check (tests, backend build, frontend build)
bun run ci
```

---

## 🌐 Production Deployment

The project is architected for zero-cost cloud deployment:
1. **Database:** [Neon.tech](https://neon.tech) (Serverless PostgreSQL)
2. **Backend:** [Render.com](https://render.com) (Docker web service with `DATABASE_URL` and `JWT_SECRET`)
3. **Frontend:** [Vercel.com](https://vercel.com) (Next.js with `NEXT_PUBLIC_API_URL` pointing to the Render backend)

---

## 📄 License
MIT License. Built for enterprise leave tracking and SDLC best practices.
