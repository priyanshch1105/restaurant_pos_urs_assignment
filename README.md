# Restaurant POS & Order Billing System

A web-based restaurant Point of Sale (POS) application for managing menu items, creating dine-in and takeaway orders, calculating bills, recording payments, tracking order progress, and viewing daily sales.

The project is built with:

- **Frontend:** Next.js, React, TypeScript
- **Backend:** Express.js running with the Next.js server
- **Database:** MongoDB with Mongoose
- **Fallback storage:** Process-local in-memory storage for development and tests
- **Authentication:** JWT and bcrypt password hashing
- **Validation:** Zod
- **Testing:** Vitest

> MongoDB is recommended for persistent data. The in-memory fallback is intended for local development and isolated tests only; it is not durable or suitable for production.

## Features

### Authentication and roles

- JWT-based login and session validation
- Password hashing with bcrypt
- Two roles:
  - **Admin:** administration, reporting, billing policy, user review, invoice review, and audit review
  - **Staff:** order creation, order updates, status changes, and payment recording
- Backend authorization is enforced through Express middleware. Hiding a button in the frontend is not the only security control.

### Admin capabilities

- Create, edit, deactivate, and reactivate menu items
- Review orders and order details
- Review invoices and payment information
- View daily sales
- Configure tax rate and maximum permitted discount
- Review user accounts
- Review audit logs

Admin users **cannot** create or modify orders, change order status, or record payments.

### Staff capabilities

- View active and available menu items
- Create dine-in and takeaway orders
- Add multiple menu items and change quantities
- Move orders through the workflow:
  - `Pending`
  - `Preparing`
  - `Ready`
  - `Completed`
- Record Cash or UPI payments
- Review orders and invoices

### Billing and payments

- Menu prices are read from the server-side menu store.
- Client-submitted totals are never trusted.
- The server calculates:
  - Subtotal
  - Configured tax
  - Discount
  - Final total
- Tax is calculated after the discount and rounded to two decimal places.
- Discounts are limited by the Admin-configured maximum.
- Payments require an amount at least equal to the order total.
- Duplicate payments are rejected.
- Payment state is kept separate from order workflow state.
- Invoice data is loaded from the persisted backend order.

### Orders and invoices

- Unique server-generated order numbers
- Dine-in table number support
- Takeaway order support
- Historical item name and price snapshots
- Search by order number
- Status and date-range filtering
- Server-side pagination
- Print-friendly invoice page using the browser print dialog

### Audit logging

The server records audit entries for sensitive operations such as:

- Order creation
- Order item changes
- Order status changes
- Payment recording
- Menu creation
- Menu deactivation
- Billing policy changes
- User creation

Audit logs do not contain passwords, JWTs, database credentials, or other secrets. Only Admin users can read them.

## Project structure

```text
app/
  page.tsx                 Main dashboard and role-aware POS workspace
  login/page.tsx           Login screen
  invoice/page.tsx         Print-friendly invoice page
  globals.css              Shared layout and print styles

lib/
  api.ts                   Browser API helper and shared frontend types

server/
  app.ts                   Express application composition
  server.ts                Next.js + Express startup entrypoint
  auth.ts                  JWT verification, password checks, role middleware
  validation.ts            Shared Zod validation schemas
  config/                  Environment configuration
  controllers/             HTTP request/response handlers
  middleware/              Validation, auth, error, and HTTP middleware
  models/                  Mongoose models
  repositories/            Persistence boundary exports
  routes/                  Express route definitions
  services/                Business rules
  store.ts                 MongoDB and in-memory storage implementation

scripts/
  seed-user.ts             Create an Admin or Staff user with a bcrypt hash

tests/
  store.test.ts            Billing and order workflow unit tests
  api.integration.test.ts  HTTP-level authentication and POS integration tests
```

## Requirements

- Node.js 18 or newer
- npm
- MongoDB for persistent local development

MongoDB is optional when using the in-memory fallback. If `MONGODB_URI` is configured but MongoDB cannot be reached, the application reports the database failure instead of silently pretending that persistent storage is available.

## Environment setup

Copy the example environment file:

### macOS/Linux

```bash
cp .env.example .env
```

### Windows PowerShell

```powershell
Copy-Item .env.example .env
```

Configure the values in `.env`:

```env
PORT=3000
MONGODB_URI=mongodb://127.0.0.1:27017/restaurant_pos
JWT_SECRET=replace-with-a-long-random-secret
TAX_RATE=5
MAX_DISCOUNT=100000
```

Do not commit `.env`. Use `.env.example` as the committed configuration reference.

## Install and run

Install dependencies:

```bash
npm install
```

Create an Admin user:

```bash
npm run seed:user -- "Restaurant Admin" admin@example.com "change-this-password" Admin
```

Create a Staff user:

```bash
npm run seed:user -- "Restaurant Staff" staff@example.com "change-this-password" Staff
```

Start the development server:

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

The seed command hashes the password. Plaintext passwords are not stored by the seed script.

## API reference

All protected endpoints require:

```http
Authorization: Bearer <jwt>
```

### Authentication

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/auth/login` | Public | Authenticate and receive a JWT |
| `GET` | `/api/auth/me` | Authenticated | Return the current user |
| `GET` | `/api/auth/users` | Admin | List users without password fields |
| `POST` | `/api/auth/users` | Admin | Create a user with a hashed password |

Login request:

```json
{
  "email": "staff@example.com",
  "password": "change-this-password"
}
```

### Menu

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/menu` | Authenticated | List and filter menu items |
| `POST` | `/api/menu` | Admin | Create a menu item |
| `PUT` | `/api/menu/:id` | Admin | Update a menu item |
| `PATCH` | `/api/menu/:id/deactivate` | Admin | Deactivate a menu item |
| `PATCH` | `/api/menu/:id/reactivate` | Admin | Reactivate a menu item |

Menu query parameters include:

```text
search
category
available=true|false
includeInactive=true        Admin only
```

### Orders

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/orders` | Admin/Staff | Search, filter, and paginate orders |
| `GET` | `/api/orders/:id` | Admin/Staff | View order details |
| `GET` | `/api/orders/:id/invoice` | Admin/Staff | Retrieve authoritative invoice data |
| `POST` | `/api/orders` | Staff | Create an order |
| `PATCH` | `/api/orders/:id/items` | Staff | Update unpaid order items |
| `PATCH` | `/api/orders/:id/status` | Staff | Advance order status |
| `POST` | `/api/orders/:id/payment` | Staff | Record a Cash or UPI payment |

Order list query parameters:

```text
search=<order number>
status=Pending|Preparing|Ready|Completed
from=YYYY-MM-DD
to=YYYY-MM-DD
page=1
pageSize=20
```

Example:

```text
GET /api/orders?status=Pending&from=2026-01-01&to=2026-01-31&page=1&pageSize=20
```

### Reports and administration

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/reports/daily-sales` | Authenticated | Return daily order and paid-sales metrics |
| `GET` | `/api/settings` | Admin | Read tax and discount policy |
| `PATCH` | `/api/settings` | Admin | Update tax and permitted discount policy |
| `GET` | `/api/audit-logs` | Admin | Review server-created audit entries |
| `GET` | `/api/health` | Public | Return application and database status |

## Order and payment rules

### Status transitions

Only the next workflow state is valid:

```text
Pending → Preparing → Ready → Completed
```

Skipped, backward, and repeated transitions are rejected by the service layer.

### Order editing

An order cannot be edited after:

- It has been paid, or
- It has reached `Completed`

When an unpaid order is edited, the server looks up current menu prices and recalculates all totals.

### Payment rules

- Supported methods: `Cash` and `UPI`
- Payment amount must cover the server-calculated total
- A second payment for a paid order is rejected
- Payment metadata includes amount, method, timestamp, and receiving Staff user

## Testing and verification

Available scripts:

```bash
npm test
npm run typecheck
npm run build
```

The test suite includes:

- Billing subtotal, tax, rounding, and discount tests
- Quantity recalculation tests
- Valid and invalid status transition tests
- Login and invalid JWT tests
- Admin and Staff authorization tests
- Menu availability and CRUD tests
- Server-side pricing and unique order number tests
- Search, date filtering, and pagination tests
- Invoice data consistency tests
- Payment validation and duplicate-payment tests
- Admin-only settings and audit-log tests

Run the complete verification sequence in a normal Node.js environment:

```bash
npm install
npm test
npm run typecheck
npm run build
```

### Current verification note

Static diagnostics for the changed TypeScript files report no errors. In the previous VS Code sandbox session, the npm commands were blocked before npm/Vitest/TypeScript could start by a Windows sandbox network-filtering restriction. Therefore test counts, build status, and MongoDB smoke-test results must be obtained by running the commands in a supported local Node.js environment; this README does not claim those commands passed.

No lint script is currently defined in `package.json`.

## Database notes

MongoDB models include indexes for frequently used order and audit queries. The in-memory fallback:

- Is process-local
- Is cleared when the process stops
- Is intended for development and tests
- Does not provide MongoDB durability or distributed concurrency guarantees

For production financial workflows, use MongoDB persistence and add deployment-level backup, monitoring, and transaction support as required by the MongoDB topology.

## Production considerations

Before production deployment, complete and verify:

- Refresh-token or secure session strategy
- Password reset and password-change flows
- Login rate limiting
- Account activation/deactivation
- Cancellation and refund workflows
- Kitchen Display System and table management
- Advanced reports and CSV export
- OpenAPI documentation
- Docker Compose and CI pipeline
- MongoDB-backed integration and smoke tests
- Monitoring, backups, and alerting

These are intentionally listed as remaining work rather than marked as complete.

## Interview summary

This project demonstrates:

- Layered Express architecture
- Role-based backend authorization
- Server-authoritative billing
- Historical order price snapshots
- Payment safety rules
- MongoDB plus test-friendly in-memory persistence
- Search, filters, and pagination
- Print-friendly invoices
- Server-side audit logging
- Unit and HTTP integration test coverage

#   r e s t a u r a n t _ p o s _ u r s _ a s s i g n m e n t  
 