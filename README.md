# Restaurant POS & Order Billing System

## Project overview

A full-stack restaurant point-of-sale app for menu administration, dine-in and takeaway ordering, server-calculated bills, payment recording, order tracking, invoices, sales reporting, and staff account administration. Admin and Staff capabilities are enforced by the Express API.

**Live app:** [https://restaurantposursassignment.vercel.app/](https://restaurantposursassignment.vercel.app/)

**Live API documentation:** [https://restaurantposursassignment.vercel.app/api-docs](https://restaurantposursassignment.vercel.app/api-docs)

The assignment-facing app is deployed on Vercel. Its `/api/*` and `/api-docs/*` requests are forwarded to the Express backend using the `BACKEND_ORIGIN` environment variable, so users continue to use the Vercel URL and the same-origin Swagger server setting. Set `BACKEND_ORIGIN` in Vercel to the origin of the deployed Express service (for example, `https://your-api-service.onrender.com`, with no trailing slash). Deploy the backend as a Render Node web service with the repository root as its root directory, build command `npm install && npm run build`, and start command `npm start`. Configure `NODE_ENV=production`, `MONGODB_URI`, and a strong `JWT_SECRET` on that service. If `BACKEND_ORIGIN` is unset, requests are served locally by the combined Express/Next server.

Run locally at `http://localhost:3000`.

## Features

- JWT sign-in with bcrypt password hashes and Admin/Staff roles
- Admin menu CRUD, billing policy, audit log, and user directory
- Admin creation, editing, deactivation, and reactivation of Staff accounts; inactive accounts cannot authenticate or use existing tokens
- Staff order creation and editing, order status progression, and Cash/UPI payment recording
- Server-authoritative menu pricing, tax, discounts, and payment validation
- Search, date/status filters, pagination, printable invoices, and daily sales report
- MongoDB persistence with an in-memory fallback for local development and tests

## Tech stack

- **Web UI:** Next.js 14, React 18, TypeScript
- **API server:** Express 4, hosted with the Next.js app in a custom Node server
- **Database:** MongoDB with Mongoose 8
- **Authentication/security:** JWT, bcryptjs, Zod validation, role-based authorization
- **Tests:** Vitest

## Requirements

- Node.js 18 or newer
- npm
- MongoDB 6+ for persistent data (optional for in-memory local development)

## Local setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create a local environment file:

   **macOS/Linux**
   ```bash
   cp .env.example .env
   ```

   **Windows PowerShell**
   ```powershell
   Copy-Item .env.example .env
   ```

3. Configure MongoDB as described below if persistent storage is needed. With `MONGODB_URI` left blank, the app uses in-memory storage; data is lost when the process stops.

4. Start the app:

   ```bash
   npm run dev
   ```

5. Open `http://localhost:3000`. API health is available at `http://localhost:3000/api/health`.

For a production build, run `npm run build` and then `npm start`. Set `NODE_ENV=production` and a strong `JWT_SECRET` before starting.

## Environment variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `PORT` | No | `3000` | HTTP listening port |
| `MONGODB_URI` | No | Empty | MongoDB connection URI. Empty selects process-local memory storage. |
| `JWT_SECRET` | Production | Local development fallback | Secret used to sign and verify 8-hour JWTs. Set a long, random value in every deployed environment. |
| `TAX_RATE` | No | `5` | Default tax percentage, from 0 to 100. |
| `MAX_DISCOUNT` | No | `100000` | Default maximum permitted discount in the restaurant's currency. |
| `BACKEND_ORIGIN` | Vercel deployment | Empty | Origin of the Express backend to which Vercel forwards `/api/*` and `/api-docs/*`; omit the trailing slash. Leave empty for the combined local server. |

`.env` contains local secrets and is ignored by Git. Never commit production credentials.

## Database setup and seed

1. Start MongoDB locally or create a MongoDB deployment. For local MongoDB, the URI in `.env.example` points to database `restaurant_pos` on `127.0.0.1:27017`.
2. Set `MONGODB_URI` in `.env`, for example:

   ```env
   MONGODB_URI=mongodb://127.0.0.1:27017/restaurant_pos
   ```

   MongoDB creates the database and collections when the application first writes data; no separate migration command is currently required.

3. Create an initial Admin account (the password is hashed before storage):

   ```bash
   npm run seed:user -- "Restaurant Admin" admin@example.com "change-this-password" Admin
   ```

   Optional Staff seeding for setup or demos:

   ```bash
   npm run seed:user -- "Restaurant Staff" staff@example.com "change-this-password" Staff
   ```

   The seed script is idempotent by email: it creates the account only if it does not already exist. Once signed in as Admin, create and manage Staff accounts in the Staff section.

If `MONGODB_URI` is empty, the seed process uses memory and exits after seeding, so the seeded account will not be present when the app starts. Configure MongoDB before running the seed command.

## Tests and build commands

```bash
npm test          # Run Vitest unit and API integration tests
npm run typecheck # Type-check frontend and server TypeScript projects
npm run build     # Build Next.js and compile the server
```

## API documentation

Interactive Swagger UI is served by the same Express application as the API:

- Live URL: [https://restaurantposursassignment.vercel.app/api-docs](https://restaurantposursassignment.vercel.app/api-docs)
- Local URL: `http://localhost:3000/api-docs`
- OpenAPI source: [`docs/openapi.yaml`](docs/openapi.yaml)
- Validate the specification: `npm run docs:validate`

In Swagger UI, expand `POST /auth/login`, submit a real account's email and password, and copy the returned `token`. Click **Authorize** and paste the JWT token by itself; do not paste a password and do not add the `Bearer ` prefix. Swagger UI applies `Authorization: Bearer <token>` to protected requests. Use **Try it out** to send requests to this application. The OpenAPI server path is relative (`/api`), so Swagger targets the same origin in development and deployment. Swagger documentation is currently public; it does not weaken API authentication or role checks.

### Main routes

| Method | Path | Access | Purpose |
|---|---|---|---|
| `GET` | `/api/health` | Public | Application and database health |
| `POST` | `/api/auth/login` | Public | Sign in and receive JWT |
| `GET` | `/api/auth/me` | Authenticated | Current user |
| `GET` | `/api/auth/users` | Admin | List accounts |
| `POST` | `/api/auth/users` | Admin | Create Staff account |
| `PATCH` | `/api/auth/users/{id}` | Admin | Edit Staff details or active state |
| `GET`, `POST` | `/api/menu` | Authenticated / Admin for create | List or create menu items |
| `PUT` | `/api/menu/{id}` | Admin | Edit a menu item |
| `PATCH` | `/api/menu/{id}/deactivate` | Admin | Deactivate menu item |
| `PATCH` | `/api/menu/{id}/reactivate` | Admin | Reactivate menu item |
| `GET` | `/api/orders` | Authenticated | Search, filter, and paginate orders |
| `GET` | `/api/orders/{id}` | Authenticated | Order detail |
| `GET` | `/api/orders/{id}/invoice` | Authenticated | Invoice data |
| `POST` | `/api/orders` | Staff | Create order |
| `PATCH` | `/api/orders/{id}/items` | Staff | Edit unpaid order items |
| `PATCH` | `/api/orders/{id}/status` | Staff | Advance order status |
| `POST` | `/api/orders/{id}/payment` | Staff | Record payment |
| `GET` | `/api/reports/daily-sales` | Authenticated | Daily sales metrics |
| `GET`, `PATCH` | `/api/settings` | Admin | Read/update tax and discount policy |
| `GET` | `/api/audit-logs` | Admin | Recent audit entries |

For order listing, optional query parameters are `search`, `status`, `from`, `to`, `page`, and `pageSize`. Menu listing accepts `search`, `category`, `available`, and Admin-only `includeInactive`.

## Persistence notes

The memory store is process-local, non-durable, and intended for development or tests. Use MongoDB for persistent deployments. Backups and operational monitoring should be configured for production.
