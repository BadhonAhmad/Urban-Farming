# Urban Farming Platform

A production-grade **RESTful API** for an Interactive Urban Farming Platform built with **Express.js 5**, **Prisma ORM**, and **PostgreSQL** (Supabase). The platform connects urban farmers (vendors) with customers through a marketplace for fresh produce, rental farming spaces, community forums, and plant tracking.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js |
| Framework | Express 5 |
| ORM | Prisma 6 |
| Database | PostgreSQL (Supabase) |
| Authentication | JWT (access + refresh token rotation) |
| Validation | express-validator |
| Logging | Winston |
| Documentation | Swagger / OpenAPI 3.0 |
| Security | Helmet, CORS, bcryptjs, httpOnly cookies |

---

## Features

- **Authentication** — Register, login, token refresh, logout with access token (15 min) + refresh token rotation (7 day) stored as SHA-256 hashed in DB via httpOnly cookies. Reuse detection invalidates all sessions.
- **Vendor Management** — Profile CRUD, admin approval/rejection workflow, sustainability certification submission/approval.
- **Produce Marketplace** — Public product listings with category filters, vendor CRUD, admin approval pipeline, stock tracking.
- **Rental Spaces** — Browse available farming spaces by location/availability, booking system with confirm/cancel workflow, Prisma transactions for atomic state changes.
- **Order Management** — Place orders with atomic stock decrement, role-based views (customer/vendor/admin), order state machine with valid transitions, auto stock restore on cancellation.
- **Community Forum** — Public post browsing with search, authenticated CRUD, owner-or-admin authorization.
- **Plant Tracking** — Growth stage and health monitoring linked to confirmed rental bookings.
- **Database Indexing** — 18 composite indexes optimized for actual query patterns (foreign keys, pagination sorts, filter columns).
- **Rate Limiting** — 5 tiers: auth (10/15m), global API (100/15m), orders (20/15m), bookings (15/15m), uploads (5/hr).
- **API Documentation** — Interactive Swagger UI at `/api/docs` with full request/response examples.

---

## Project Structure

```
UrbanFarming/
├── prisma/
│   ├── schema.prisma          # Database schema (10 models, 7 enums, 15 indexes)
│   └── seed.js                # Database seeder (153 records)
├── src/
│   ├── config/
│   │   ├── database.js        # PrismaClient singleton
│   │   └── swagger.js         # OpenAPI spec configuration
│   ├── middlewares/
│   │   ├── authenticate.js    # JWT verification + user lookup
│   │   ├── authorize.js       # Role-based access control
│   │   ├── errorHandler.js    # Global error handler (Prisma/JWT/HTTP)
│   │   ├── rateLimiter.js     # 5-tier rate limiting
│   │   └── validate.js        # express-validator result checker
│   ├── modules/
│   │   ├── auth/              # Authentication module
│   │   ├── vendor/            # Vendor management module
│   │   ├── produce/           # Produce marketplace module
│   │   ├── rental/            # Rental spaces & bookings module
│   │   ├── orders/            # Order management module
│   │   ├── forum/             # Community forum module
│   │   └── tracking/          # Plant tracking module
│   ├── utils/
│   │   ├── apiResponse.js     # Standardized JSON response helpers
│   │   ├── jwt.js             # JWT sign/verify for access & refresh tokens
│   │   ├── logger.js          # Winston logger (console + file)
│   │   └── validators.js      # express-validator chains
│   ├── app.js                 # Express app setup + middleware chain
│   └── server.js              # Entry point (dotenv, DB connect, listen)
├── .env                       # Environment variables
├── .gitignore
└── package.json
```

Each module follows the **layered architecture** pattern:

```
module/
├── module.routes.js       # Route definitions + Swagger docs
├── module.controller.js   # Request/response handling
└── module.service.js      # Business logic + DB queries
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database (or Supabase account)

### Installation

```bash
# Clone the repository
git clone https://github.com/BadhonAhmad/UrbanFarming.git
cd UrbanFarming

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your database credentials and secrets
```

### Environment Variables

Create a `.env` file in the root directory:

```env
# Database — Supabase pooler URL for runtime
DATABASE_URL=postgresql://user:password@host:6543/postgres?pgbouncer=true

# Database — Direct URL for migrations
DIRECT_URL=postgresql://user:password@host:5432/postgres

# JWT
JWT_SECRET=your_jwt_secret
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_SECRET=your_jwt_refresh_secret
JWT_REFRESH_EXPIRES_IN=7d

# Server
PORT=5000
NODE_ENV=development
```

### Database Setup

```bash
# Generate Prisma client
npm run db:generate

# Push schema to database (creates tables + indexes)
npx prisma db push

# Seed with sample data (153 records: users, produce, orders, etc.)
npm run db:seed

# Or open Prisma Studio to browse data visually
npm run db:studio
```

### Run the Server

```bash
# Development (with auto-reload)
npm run dev

# Production
npm start
```

The server starts at `http://localhost:5000`.

---

## API Endpoints

### Authentication

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/api/v1/auth/register` | Public | Register new user (CUSTOMER/VENDOR) |
| POST | `/api/v1/auth/login` | Public | Login — returns access token + refresh cookie |
| POST | `/api/v1/auth/refresh` | Public | Rotate refresh token, get new access token |
| POST | `/api/v1/auth/logout` | Auth | Revoke refresh token, clear cookie |
| GET | `/api/v1/auth/profile` | Auth | Get current user profile |

### Vendors

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/api/v1/vendors/me` | Vendor | Get own vendor profile |
| PATCH | `/api/v1/vendors/me` | Vendor | Update farm name/location |
| GET | `/api/v1/vendors/` | Admin | List all vendors (paginated) |
| PATCH | `/api/v1/vendors/:id/approve` | Admin | Approve vendor |
| PATCH | `/api/v1/vendors/:id/reject` | Admin | Reject vendor |
| POST | `/api/v1/vendors/certification` | Vendor | Submit sustainability certification |
| PATCH | `/api/v1/vendors/:id/certification/approve` | Admin | Approve certification |
| PATCH | `/api/v1/vendors/:id/certification/reject` | Admin | Reject certification |

### Produce

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/api/v1/produce/` | Public | List approved produce (paginated, filter by category) |
| GET | `/api/v1/produce/:id` | Public | Get single produce detail |
| POST | `/api/v1/produce/` | Vendor | Create produce item |
| PATCH | `/api/v1/produce/:id` | Vendor | Update own produce |
| DELETE | `/api/v1/produce/:id` | Vendor/Admin | Delete produce |
| PATCH | `/api/v1/produce/:id/approve` | Admin | Approve produce |
| PATCH | `/api/v1/produce/:id/reject` | Admin | Reject produce |
| GET | `/api/v1/produce/my` | Vendor | List own produce (all statuses) |

### Rental Spaces

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/api/v1/rentals/` | Public | List rental spaces (filter by location/availability) |
| GET | `/api/v1/rentals/:id` | Public | Get single space detail |
| POST | `/api/v1/rentals/` | Vendor | Create rental space |
| PATCH | `/api/v1/rentals/:id` | Vendor | Update own space |
| DELETE | `/api/v1/rentals/:id` | Vendor | Delete own space |
| POST | `/api/v1/rentals/:id/book` | Customer | Book a rental space |
| PATCH | `/api/v1/rentals/bookings/:id/confirm` | Vendor/Admin | Confirm booking |
| PATCH | `/api/v1/rentals/bookings/:id/cancel` | Customer/Vendor/Admin | Cancel booking |
| GET | `/api/v1/rentals/bookings/my` | Customer | List own bookings |
| GET | `/api/v1/rentals/bookings/vendor` | Vendor | List bookings for own spaces |

### Orders

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/api/v1/orders/` | Customer | Place order (atomic stock decrement) |
| GET | `/api/v1/orders/my` | Customer | List own orders |
| GET | `/api/v1/orders/vendor` | Vendor | List orders for own produce |
| GET | `/api/v1/orders/` | Admin | List all orders |
| GET | `/api/v1/orders/:id` | Auth | Get order detail (role-scoped) |
| PATCH | `/api/v1/orders/:id/status` | Customer/Vendor/Admin | Update order status |

### Forum

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/api/v1/forum/` | Public | List posts (paginated, search by title/content) |
| GET | `/api/v1/forum/:id` | Public | Get single post |
| POST | `/api/v1/forum/` | Auth | Create post |
| PATCH | `/api/v1/forum/:id` | Owner/Admin | Update post |
| DELETE | `/api/v1/forum/:id` | Owner/Admin | Delete post |

### Plant Tracking

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/api/v1/tracking/` | Customer | Add plant tracking (requires confirmed booking) |
| GET | `/api/v1/tracking/` | Customer | List own plants |
| GET | `/api/v1/tracking/:id` | Customer | Get plant detail |
| PATCH | `/api/v1/tracking/:id` | Customer | Update growth stage/health |
| DELETE | `/api/v1/tracking/:id` | Customer | Delete tracking record |

### Other

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| GET | `/api/docs` | Swagger UI documentation |

---

## Authentication Flow

```
┌──────────┐    POST /login     ┌──────────┐
│  Client   │ ────────────────► │   API     │
│           │                   │           │
│           │ ◄──────────────── │           │
│           │  Access Token     │           │
│           │  (in body, 15m)   │           │
│           │  Refresh Token    │           │
│           │  (httpOnly cookie,│           │
│           │   7d, SHA-256     │           │
│           │   hashed in DB)   │           │
│           │                   │           │
│           │  GET /profile     │           │
│           │ ────────────────► │           │
│           │  Authorization:   │           │
│           │  Bearer <access>  │           │
│           │                   │           │
│           │  Access expired?  │           │
│           │  POST /refresh    │           │
│           │ ────────────────► │           │
│           │  (sends cookie)   │  Rotates  │
│           │                   │  refresh  │
│           │ ◄──────────────── │  token    │
│           │  New access +     │           │
│           │  new cookie       │           │
└──────────┘                   └──────────┘
```

**Security features:**
- Access tokens expire in 15 minutes
- Refresh tokens stored SHA-256 hashed in the database
- Refresh tokens delivered via httpOnly cookies (immune to XSS)
- Token rotation on every refresh — old token is revoked
- Reuse detection: if a revoked token is reused, all user sessions are invalidated

---

## Database Schema

```
┌──────────────┐     ┌──────────────────────┐     ┌──────────────────┐
│    User      │────>│    VendorProfile      │────>│ SustainabilityCert│
│  (CUSTOMER/  │ 1:1 │  (farmName, location, │ 1:1 │ (agency, dates,  │
│   VENDOR/    │     │   certificationStatus)│     │  documentUrl)    │
│   ADMIN)     │     └──────────┬───────────┘     └──────────────────┘
└──────┬───────┘                │ 1:N
       │                   ┌────┴─────────┐
       │                   ▼              ▼
       │            ┌──────────┐   ┌──────────────┐
       │            │  Produce  │   │ RentalSpace   │
       │            │ (name,    │   │ (location,    │
       │            │  price,   │   │  size, price, │
       │            │  qty)     │   │  available)   │
       │            └─────┬────┘   └──────┬────────┘
       │                  │               │
       │ 1:N              ▼ 1:N           ▼ 1:N
       │            ┌──────────┐   ┌──────────────┐
       ├───────────>│  Order   │   │ RentalBooking │
       │            │ (status  │   │ (dates,       │
       │            │ machine) │   │  status)      │
       │            └──────────┘   └──────┬────────┘
       │                                  │
       │ 1:N                              │ N:1
       │                            ┌─────┴────────┐
       ├───────────>│ CommunityPost │            │ PlantTracking │
       │            │ (title,       │◄───────────│ (growthStage, │
       │            │  content)     │  Customer   │  healthStatus)│
       │            └──────────────┘  + booking   └──────────────┘
       │                               required
       │ 1:N
       └───────────>│ RefreshToken  │
                    │ (hashed,      │
                    │  rotated)     │
                    └──────────────┘
```

---

## Database Indexes

15 composite indexes optimized for query patterns:

| Table | Index | Used By |
|-------|-------|---------|
| Produce | `[vendorId]` | Vendor's produce list |
| Produce | `[certificationStatus, createdAt]` | Public product listing + pagination |
| Produce | `[category]` | Category filter |
| Order | `[userId, orderDate]` | Customer order history |
| Order | `[vendorId, orderDate]` | Vendor order management |
| Order | `[status]` | Admin status filtering |
| RentalSpace | `[vendorId]` | Vendor's spaces lookup |
| RentalSpace | `[isAvailable]` | Availability filter |
| RentalSpace | `[location]` | Location search |
| RentalBooking | `[userId, createdAt]` | Customer bookings |
| RentalBooking | `[rentalSpaceId]` | Vendor booking lookup |
| RentalBooking | `[status]` | Status filtering |
| CommunityPost | `[userId]` | Ownership checks |
| CommunityPost | `[postDate]` | Chronological ordering |
| PlantTracking | `[userId, lastUpdated]` | User's plant dashboard |
| PlantTracking | `[rentalSpaceId]` | Booking validation |
| RefreshToken | `[userId, revokedAt]` | Token revocation + logout |
| RefreshToken | `[expiresAt]` | Cleanup jobs |

---

## API Response Format

All endpoints return standardized JSON:

**Success:**
```json
{
  "success": true,
  "message": "Produce list fetched",
  "data": { ... },
  "meta": { "total": 100, "page": 1, "limit": 10, "totalPages": 10 },
  "timestamp": "2026-04-17T06:00:37.321Z"
}
```

**Error:**
```json
{
  "success": false,
  "message": "Invalid email or password",
  "errors": null,
  "timestamp": "2026-04-17T06:00:37.321Z"
}
```

---

## Error Handling

The global error handler maps internal errors to appropriate HTTP responses:

| Error Type | HTTP Status |
|-----------|-------------|
| Prisma unique constraint (P2002) | 409 Conflict |
| Prisma not found (P2025) | 404 Not Found |
| JWT expired / invalid | 401 Unauthorized |
| Validation errors (express-validator) | 422 Unprocessable Entity |
| Custom `statusCode` on error | Uses specified code |
| Everything else | 500 Internal Server Error |

---

## Roles & Permissions

| Action | CUSTOMER | VENDOR | ADMIN |
|--------|----------|--------|-------|
| Browse produce / rentals / forum | Yes | Yes | Yes |
| Place orders | Yes | — | — |
| Book rental spaces | Yes | — | — |
| Track plants | Yes | — | — |
| Create forum posts | Yes | Yes | Yes |
| Manage own produce | — | Yes | — |
| Manage own rental spaces | — | Yes | — |
| Approve/reject vendors | — | — | Yes |
| Approve/reject produce | — | — | Yes |
| Approve certifications | — | — | Yes |
| View all orders | — | — | Yes |
| Cancel own orders | Yes (PENDING) | — | — |

---

## NPM Scripts

```bash
npm run dev          # Start with nodemon (auto-reload)
npm start            # Start production server
npm run db:generate  # Generate Prisma client
npm run db:migrate   # Run migrations
npm run db:seed      # Seed database with sample data
npm run db:studio    # Open Prisma Studio GUI
```

---

## Author

**MakTech** — Badhon Ahmad
