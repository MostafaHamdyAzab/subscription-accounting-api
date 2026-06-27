# Subscription Accounting API

A multi-tenant subscription billing and accounting backend built with **Node.js**, **Express.js**, **PostgreSQL**, and **Prisma ORM**.

The system allows companies to register as tenants, manage subscription plans, customers, subscriptions, invoices, payments, revenue recognition, and financial reports using **double-entry bookkeeping**.

---

## 1. Project Overview

This project implements a SaaS-style multi-tenant billing and accounting system.

Each company is registered as a separate **Tenant**. All business data such as customers, subscription plans, subscriptions, invoices, payments, journal entries, and reports is isolated by `tenantId`.

The system also applies accounting logic for subscription-based revenue, especially the treatment of **Deferred Revenue**.

---

## 2. Main Features

### Multi-Tenancy

- Register a new company as a tenant.
- Automatically create an Admin user for the tenant.
- Automatically create the tenant’s Chart of Accounts.
- Isolate each tenant’s data using `tenantId`.
- Prevent cross-tenant access by extracting `tenantId` from JWT instead of request body.

### Authentication

- Tenant registration.
- Admin user creation.
- Login with JWT.
- Protected routes using Bearer Token.
- Admin-only operations for sensitive actions.

### Subscription Management

- Create, list, update, and delete subscription plans.
- Create, list, update, and delete customers.
- Create and manage subscriptions by linking:
  - Customer
  - Subscription Plan
  - Start Date

### Billing

- Generate monthly invoices for active subscriptions.
- Prevent duplicate invoices for the same subscription and billing month.
- Manual endpoint to simulate invoice generation.
- Real cron job for automatic monthly invoice generation.

### Payments

- Record payments against invoices.
- Support payment methods:
  - CASH
  - BANK_TRANSFER
  - CARD

- Update invoice status automatically:
  - UNPAID
  - PARTIALLY_PAID
  - PAID

### Double-Entry Accounting

The system automatically creates journal entries for all financial movements.

#### Invoice Creation

When a monthly invoice is created:

```txt
Debit   Accounts Receivable
Credit  Deferred Revenue
```

#### Payment Collection

When a payment is received:

```txt
Debit   Cash
Credit  Accounts Receivable
```

#### Revenue Recognition

At month-end, deferred revenue is recognized as actual revenue:

```txt
Debit   Deferred Revenue
Credit  Subscription Revenue
```

### Financial Reports

- Income Statement
- Balance Sheet

Reports are generated from journal entries and journal lines, not directly from invoices.

### Accounting Review

- View Chart of Accounts.
- View Journal Entries.
- View Journal Entry details.
- Filter journal entries by reference type.
- Verify that every journal entry is balanced.

---

## 3. Technical Stack

| Layer            | Technology |
| ---------------- | ---------- |
| Runtime          | Node.js    |
| Framework        | Express.js |
| Database         | PostgreSQL |
| ORM              | Prisma     |
| Authentication   | JWT        |
| Password Hashing | bcrypt     |
| Scheduler        | node-cron  |
| API Style        | REST API   |

---

## 4. Project Structure

```txt
subscription-accounting-api/
  prisma/
    schema.prisma
    migrations/

  src/
    config/
      prisma.js

    middleware/
      auth.middleware.js
      role.middleware.js

    modules/
      auth/
        auth.routes.js
        auth.controller.js
        auth.service.js

      plans/
        plans.routes.js
        plans.controller.js
        plans.service.js

      customers/
        customers.routes.js
        customers.controller.js
        customers.service.js

      subscriptions/
        subscriptions.routes.js
        subscriptions.controller.js
        subscriptions.service.js

      invoices/
        invoices.routes.js
        invoices.controller.js
        invoices.service.js

      payments/
        payments.routes.js
        payments.controller.js
        payments.service.js

      revenue-recognition/
        revenueRecognition.routes.js
        revenueRecognition.controller.js
        revenueRecognition.service.js

      accounting/
        accounting.routes.js
        accounting.controller.js
        accounting.service.js

      reports/
        reports.routes.js
        reports.controller.js
        reports.service.js

    jobs/
      monthlyInvoices.job.js
      index.js

    app.js
    server.js

  .env
  package.json
  README.md
```

---

## 5. Database Models

Main database models:

```txt
Tenant
User
Account
SubscriptionPlan
Customer
Subscription
Invoice
Payment
JournalEntry
JournalLine
```

---

## 6. Chart of Accounts

When a new tenant is registered, the system automatically creates the following accounts:

| Code | Account Name         | Type      |
| ---- | -------------------- | --------- |
| 1000 | Cash                 | ASSET     |
| 1100 | Accounts Receivable  | ASSET     |
| 2000 | Deferred Revenue     | LIABILITY |
| 4000 | Subscription Revenue | REVENUE   |

---

## 7. Installation

### 7.1 Clone the Repository

```bash
git clone <repository-url>
cd subscription-accounting-api
```

### 7.2 Install Dependencies

```bash
npm install
```

### 7.3 Create PostgreSQL Database

Create a PostgreSQL database named:

```txt
subscription_accounting
```

Example local database URL:

```txt
postgresql://postgres:postgres@localhost:5432/subscription_accounting?schema=public
```

---

## 8. Environment Variables

Create a `.env` file in the project root:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/subscription_accounting?schema=public"

PORT=3000

JWT_SECRET="very_secret_development_key"
JWT_EXPIRES_IN="7d"

ENABLE_CRON_JOBS=true
CRON_TIMEZONE=Africa/Cairo
MONTHLY_INVOICE_CRON=5 0 1 * *
```

### Environment Variables Explanation

| Variable               | Description                                    |
| ---------------------- | ---------------------------------------------- |
| `DATABASE_URL`         | PostgreSQL connection string                   |
| `PORT`                 | API server port                                |
| `JWT_SECRET`           | Secret key for signing JWT tokens              |
| `JWT_EXPIRES_IN`       | JWT expiration time                            |
| `ENABLE_CRON_JOBS`     | Enables or disables cron jobs                  |
| `CRON_TIMEZONE`        | Timezone used by cron jobs                     |
| `MONTHLY_INVOICE_CRON` | Cron expression for monthly invoice generation |

---

## 9. Prisma Setup

### 9.1 Generate Prisma Client

```bash
npx prisma generate
```

### 9.2 Run Migrations

```bash
npx prisma migrate dev
```

### 9.3 Open Prisma Studio

```bash
npx prisma studio
```

Then open:

```txt
http://localhost:5555
```

---

## 10. Run the Project

### Development Mode

```bash
npm run dev
```

### Production Mode

```bash
npm start
```

The API will run on:

```txt
http://localhost:3000
```

---

## 11. Health Check

```http
GET /health/db
```

Expected response:

```json
{
  "success": true,
  "message": "Database connection is working"
}
```

---

## 12. Authentication APIs

### Register Tenant

```http
POST /api/auth/register-tenant
```

Request body:

```json
{
  "companyName": "ABC Company",
  "adminName": "Ahmed Admin",
  "email": "admin@abc.com",
  "password": "123456"
}
```

This endpoint creates:

```txt
Tenant
Admin User
Chart of Accounts
JWT Token
```

### Login

```http
POST /api/auth/login
```

Request body:

```json
{
  "email": "admin@abc.com",
  "password": "123456"
}
```

### Current User

```http
GET /api/auth/me
```

Authorization:

```txt
Bearer <token>
```

---

## 13. Subscription Plans APIs

### Create Plan

```http
POST /api/plans
```

Request body:

```json
{
  "name": "Bronze Plan",
  "price": 100,
  "currency": "USD",
  "billingPeriod": "MONTHLY"
}
```

### List Plans

```http
GET /api/plans
```

### Get Plan by ID

```http
GET /api/plans/:id
```

### Update Plan

```http
PATCH /api/plans/:id
```

### Delete Plan

```http
DELETE /api/plans/:id
```

---

## 14. Customers APIs

### Create Customer

```http
POST /api/customers
```

Request body:

```json
{
  "name": "Ali Omar",
  "email": "ali@example.com",
  "phone": "+201000000000"
}
```

### List Customers

```http
GET /api/customers
```

### Search Customers

```http
GET /api/customers?search=john
```

### Get Customer by ID

```http
GET /api/customers/:id
```

### Update Customer

```http
PATCH /api/customers/:id
```

### Delete Customer

```http
DELETE /api/customers/:id
```

---

## 15. Subscriptions APIs

### Create Subscription

```http
POST /api/subscriptions
```

Request body:

```json
{
  "customerId": "customer-id",
  "planId": "plan-id",
  "startDate": "2026-06-01"
}
```

### List Subscriptions

```http
GET /api/subscriptions
```

### Filter by Status

```http
GET /api/subscriptions?status=ACTIVE
```

### Get Subscription by ID

```http
GET /api/subscriptions/:id
```

### Update Subscription

```http
PATCH /api/subscriptions/:id
```

### Cancel Subscription

```http
PATCH /api/subscriptions/:id/cancel
```

### Delete Subscription

```http
DELETE /api/subscriptions/:id
```

---

## 16. Invoice APIs

### Generate Monthly Invoices

```http
POST /api/invoices/generate-monthly
```

Request body:

```json
{
  "month": "2026-06"
}
```

This creates invoices for all active subscriptions of the authenticated tenant.

For each invoice, the system creates this journal entry:

```txt
Debit   Accounts Receivable
Credit  Deferred Revenue
```

### List Invoices

```http
GET /api/invoices
```

### Filter Invoices

```http
GET /api/invoices?status=UNPAID
GET /api/invoices?customerId=customer-id
GET /api/invoices?subscriptionId=subscription-id
```

### Get Invoice by ID

```http
GET /api/invoices/:id
```

---

## 17. Cron Job

The project includes a real monthly cron job for automatic invoice generation.

The cron job is configured using:

```env
ENABLE_CRON_JOBS=true
CRON_TIMEZONE=Africa/Cairo
MONTHLY_INVOICE_CRON=5 0 1 * *
```

Default schedule:

```txt
At 00:05 on day 1 of every month
```

The cron job:

```txt
1. Finds all tenants.
2. Generates monthly invoices for each tenant.
3. Creates accounting journal entries.
4. Prevents duplicate invoices.
```

For testing, the cron expression can be temporarily changed to:

```env
MONTHLY_INVOICE_CRON=* * * * *
```

This runs the job every minute.

---

## 18. Payments APIs

### Create Payment

```http
POST /api/payments
```

Request body:

```json
{
  "invoiceId": "invoice-id",
  "amount": 100,
  "method": "CASH",
  "paymentDate": "2026-06-15"
}
```

When payment is recorded, the system creates this journal entry:

```txt
Debit   Cash
Credit  Accounts Receivable
```

### List Payments

```http
GET /api/payments
```

### Filter Payments by Invoice

```http
GET /api/payments?invoiceId=invoice-id
```

### Get Payment by ID

```http
GET /api/payments/:id
```

---

## 19. Revenue Recognition APIs

### Recognize Monthly Revenue

```http
POST /api/revenue-recognition/month-end
```

Request body:

```json
{
  "month": "2026-06"
}
```

When revenue is recognized, the system creates this journal entry:

```txt
Debit   Deferred Revenue
Credit  Subscription Revenue
```

The system prevents recognizing revenue for the same invoice more than once using `revenueRecognizedAt`.

---

## 20. Accounting APIs

### List Chart of Accounts

```http
GET /api/accounting/accounts
```

### List Journal Entries

```http
GET /api/accounting/journal-entries
```

### Pagination

```http
GET /api/accounting/journal-entries?page=1&limit=10
```

### Filter by Reference Type

```http
GET /api/accounting/journal-entries?referenceType=INVOICE
GET /api/accounting/journal-entries?referenceType=PAYMENT
GET /api/accounting/journal-entries?referenceType=REVENUE_RECOGNITION
```

### Filter by Reference ID

```http
GET /api/accounting/journal-entries?referenceType=INVOICE&referenceId=invoice-id
```

### Get Journal Entry by ID

```http
GET /api/accounting/journal-entries/:id
```

Each journal entry response includes:

```txt
totalDebit
totalCredit
isBalanced
journal lines
related accounts
```

---

## 21. Financial Reports APIs

### Income Statement

```http
GET /api/reports/income-statement?from=2026-06-01&to=2026-06-30
```

This report returns total Subscription Revenue for the selected period.

Revenue is calculated from journal lines:

```txt
Subscription Revenue = Credits - Debits
```

### Balance Sheet

```http
GET /api/reports/balance-sheet?asOf=2026-06-30
```

This report returns balances for:

```txt
Cash
Accounts Receivable
Deferred Revenue
```

Assets are calculated as:

```txt
Debits - Credits
```

Liabilities are calculated as:

```txt
Credits - Debits
```

---

## 22. End-to-End Testing Flow

Recommended testing order:

```txt
1. Register Tenant
2. Login
3. Create Subscription Plan
4. Create Customer
5. Create Subscription
6. Generate Monthly Invoice
7. Record Payment
8. Recognize Revenue
9. View Journal Entries
10. View Income Statement
11. View Balance Sheet
```

---

## 23. Example Accounting Flow

Assume a monthly subscription plan costs `$100`.

### Step 1: Invoice Creation

```txt
Debit   Accounts Receivable   100
Credit  Deferred Revenue      100
```

### Step 2: Payment Collection

```txt
Debit   Cash                  100
Credit  Accounts Receivable   100
```

### Step 3: Revenue Recognition

```txt
Debit   Deferred Revenue        100
Credit  Subscription Revenue    100
```

### Final Result

Income Statement:

```txt
Subscription Revenue = 100
```

Balance Sheet:

```txt
Cash = 100
Accounts Receivable = 0
Deferred Revenue = 0
```

---

## 24. Multi-Tenancy Security

The system never accepts `tenantId` from the request body.

Instead:

```txt
1. User logs in.
2. JWT contains tenantId.
3. authMiddleware extracts tenantId.
4. Services use req.user.tenantId.
5. Every query filters by tenantId.
```

This prevents one tenant from accessing another tenant’s data.

---

## 25. Deployment Notes

The project can be deployed on platforms such as:

```txt
Render
Railway
Heroku
```

Production deployment requires:

```txt
Node.js service
PostgreSQL database
Environment variables
Prisma migrations
```

Typical production commands:

```bash
npm install
npx prisma generate
npx prisma migrate deploy
npm start
```

Required production environment variables:

```env
DATABASE_URL="production-postgresql-url"
PORT=3000
JWT_SECRET="production-secret"
JWT_EXPIRES_IN="7d"
ENABLE_CRON_JOBS=true
CRON_TIMEZONE=Africa/Cairo
MONTHLY_INVOICE_CRON=5 0 1 * *
```

---

## 26. Scripts

Example `package.json` scripts:

```json
{
  "scripts": {
    "dev": "nodemon src/server.js",
    "start": "node src/server.js",
    "prisma:generate": "prisma generate",
    "prisma:migrate": "prisma migrate dev",
    "prisma:studio": "prisma studio"
  }
}
```

---

## 27. Notes

- Monetary values are stored using PostgreSQL Decimal fields through Prisma.
- The system prevents unbalanced journal entries.
- Invoice generation is idempotent for the same subscription and billing month.
- Revenue recognition cannot be repeated for the same invoice.
- Paid invoices cannot receive extra payments.
- A payment cannot exceed the remaining invoice balance.
- Plans or customers linked to existing records cannot be deleted directly.

---

This project is form
Mostafa Hamdy Azab
mostafahamdy9988@gmail.com
