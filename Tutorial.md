# Urban Farming Platform — Complete Tutorial & Viva Guide

> A production-grade REST API backend for an interactive urban farming marketplace built with Express.js, Prisma ORM, and PostgreSQL.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Architecture & Design Decisions](#2-architecture--design-decisions)
3. [Technology Stack — Why Each Choice](#3-technology-stack--why-each-choice)
4. [Database Design](#4-database-design)
5. [Project Structure](#5-project-structure)
6. [Request Lifecycle — How a Request Flows](#6-request-lifecycle--how-a-request-flows)
7. [Utility Layer](#7-utility-layer)
8. [Middleware Layer](#8-middleware-layer)
9. [Auth Module](#9-auth-module)
10. [Vendor & Certification Module](#10-vendor--certification-module)
11. [Produce Marketplace Module](#11-produce-marketplace-module)
12. [Rental Space Module](#12-rental-space-module)
13. [Orders Module](#13-orders-module)
14. [Community Forum Module](#14-community-forum-module)
15. [Plant Tracking Module](#15-plant-tracking-module)
16. [Rate Limiting Strategy](#16-rate-limiting-strategy)
17. [Error Handling Strategy](#17-error-handling-strategy)
18. [Database Seeding](#18-database-seeding)
19. [API Documentation (Swagger)](#19-api-documentation-swagger)
20. [Benchmarking](#20-benchmarking)
21. [How to Run the Project](#21-how-to-run-the-project)
22. [Complete API Endpoint Reference](#22-complete-api-endpoint-reference)
23. [Scaling for Millions of Users](#23-scaling-for-millions-of-users)
24. [Possible Improvements](#24-possible-improvements)
25. [Interview Questions & Answers](#25-interview-questions--answers)

---

## 1. Project Overview

The Urban Farming Platform connects three types of users:

| Role | What They Do |
|---|---|
| **ADMIN** | Approves/rejects vendors, produce, certifications. Views all orders. Manages platform. |
| **VENDOR** | Lists produce for sale, rents out farming spaces, submits sustainability certifications. |
| **CUSTOMER** | Browses and orders produce, books rental spaces, writes forum posts, tracks plant growth. |

**Core business flows:**

```
Vendor registers → Admin approves → Vendor lists produce → Admin approves produce
→ Customer orders → Vendor confirms/ships/delivers → Order complete

Vendor creates rental space → Customer books → Vendor confirms
→ Customer tracks plant growth on rented space
```

---

## 2. Architecture & Design Decisions

### Layered Architecture (Service-Controller-Routes)

Every module follows a strict 3-layer separation:

```
┌─────────────────────────────────────────────────────┐
│  Routes Layer (auth.routes.js)                      │
│  - Defines HTTP endpoints                           │
│  - Wires middleware chains (auth, validate, rate)   │
│  - Contains Swagger JSDoc annotations               │
├─────────────────────────────────────────────────────┤
│  Controller Layer (auth.controller.js)              │
│  - Extracts data from req (params, body, query)     │
│  - Calls service layer                              │
│  - Formats response via apiResponse helpers         │
│  - Logs actions                                     │
├─────────────────────────────────────────────────────┤
│  Service Layer (auth.service.js)                    │
│  - Pure business logic                              │
│  - Prisma database queries                          │
│  - Data validation & ownership checks               │
│  - Throws errors with statusCode for errorHandler   │
└─────────────────────────────────────────────────────┘
```

**Why this pattern?**

- **Separation of concerns**: Each layer has one job. Routes handle HTTP wiring, controllers handle request/response formatting, services handle business logic and database access.
- **Testability**: Service functions can be unit-tested without HTTP mocks — you just call `authService.login(email, password)` and assert the result.
- **Reusability**: Service functions can be called from other services, CLI scripts, or background jobs without duplicating logic.
- **Maintainability**: If you change the database query, you only touch the service layer. If you change the response format, you only touch the controller.

### Error Convention

Services throw errors with a `statusCode` property:

```js
const err = new Error("Resource not found");
err.statusCode = 404;
throw err;
```

The global `errorHandler` middleware catches all thrown errors and maps them to standardized HTTP responses. This means services never touch `req` or `res` — they stay pure.

### Prisma Singleton Pattern

`src/config/database.js` creates one PrismaClient instance and exports it. Every file imports from the same singleton:

```js
const prisma = require("../../config/database");
```

**Why?** PrismaClient maintains a connection pool. Creating multiple instances would open multiple pools, wasting database connections and memory.

---

## 3. Technology Stack — Why Each Choice

| Technology | Why It Was Chosen | Benefit at Scale |
|---|---|---|
| **Express.js 5** | Minimal, unopinionated, massive ecosystem | Easy to add middleware; proven at companies like Netflix, Uber |
| **Prisma ORM** | Type-safe queries, auto-generated client, migration system | Prevents SQL injection by default; catches schema errors at build time |
| **PostgreSQL (Supabase)** | ACID-compliant, JSON support, full-text search capable | Handles complex queries, concurrent transactions, and massive datasets |
| **JWT (jsonwebtoken)** | Stateless authentication — no server-side session storage | Horizontally scalable — any server can verify a token without shared state |
| **bcryptjs** | Adaptive hashing with salt — industry standard for passwords | Resistant to brute-force and rainbow table attacks |
| **express-validator** | Declarative validation built on validator.js | Catches bad input before it reaches business logic |
| **Helmet** | Sets security HTTP headers automatically | Mitigates XSS, clickjacking, MIME sniffing, and other OWASP attacks |
| **CORS** | Controls which domains can access the API | Prevents unauthorized cross-origin requests |
| **express-rate-limit** | IP-based request throttling | Prevents brute force, DDoS, and API abuse |
| **Winston** | Structured logging with multiple transports | Production-ready logs with levels, timestamps, and file rotation |
| **Swagger (OpenAPI 3.0)** | Auto-generated interactive API documentation | Frontend devs, mobile devs, and third parties can explore the API without reading source code |

---

## 4. Database Design

### Entity Relationship Diagram

```
User (ADMIN/VENDOR/CUSTOMER)
 ├── 1:1 → VendorProfile
 │           ├── 1:N → Produce → 1:N → Order
 │           ├── 1:N → RentalSpace → 1:N → RentalBooking
 │           │                    └── 1:N → PlantTracking
 │           └── 1:1 → SustainabilityCert
 ├── 1:N → Order
 ├── 1:N → RentalBooking
 ├── 1:N → CommunityPost
 └── 1:N → PlantTracking
```

### Key Design Decisions

**UUID Primary Keys (`@id @default(uuid()) @db.Uuid`)**

Why not auto-increment integers?
- UUIDs are non-sequential — attackers can't enumerate users by incrementing IDs.
- UUIDs are globally unique — safe to generate client-side or across microservices.
- UUIDs don't leak business metrics (like how many users/orders exist).

**Snake Case Column Mapping (`@map("created_at")`)**

PostgreSQL convention is snake_case. JavaScript convention is camelCase. Prisma's `@map` lets us use camelCase in code while the database uses snake_case. Best of both worlds.

**`Decimal(10,2)` for Money**

Never use floating point for currency. `Decimal(10,2)` stores exact decimal values up to 99,999,999.99. This prevents rounding errors that would cause financial discrepancies.

**`onDelete: Cascade` on All Foreign Keys**

When a user is deleted, their orders, bookings, posts, and tracking records are automatically deleted. This prevents orphaned data and satisfies GDPR "right to be forgotten" requirements.

**7 Enums**

Enums are enforced at the database level — invalid values are rejected by PostgreSQL itself, not just the application. This is a defense-in-depth strategy.

---

## 5. Project Structure

```
UrbanFarming/
├── prisma/
│   ├── schema.prisma          # Database schema (9 models, 7 enums)
│   └── seed.js                # Comprehensive seeder (153 records)
├── src/
│   ├── config/
│   │   ├── database.js        # Prisma client singleton
│   │   └── swagger.js         # OpenAPI 3.0 spec configuration
│   ├── utils/
│   │   ├── apiResponse.js     # Standardized response helpers
│   │   ├── jwt.js             # Token generation & verification
│   │   ├── logger.js          # Winston logger setup
│   │   └── validators.js      # express-validator rules
│   ├── middlewares/
│   │   ├── authenticate.js    # JWT authentication middleware
│   │   ├── authorize.js       # Role-based authorization
│   │   ├── rateLimiter.js     # 5 rate limiters (auth, api, order, booking, upload)
│   │   ├── validate.js        # Validation error formatter
│   │   └── errorHandler.js    # Global error handler (Prisma, JWT, generic)
│   ├── modules/
│   │   ├── auth/              # Registration, login, profile
│   │   ├── vendor/            # Vendor management & certification
│   │   ├── produce/           # Produce marketplace
│   │   ├── rental/            # Rental spaces & bookings
│   │   ├── orders/            # Order lifecycle
│   │   ├── forum/             # Community forum
│   │   └── tracking/          # Plant growth tracking
│   ├── app.js                 # Express app setup & route mounting
│   └── server.js              # Entry point (DB connect, listen, graceful shutdown)
├── logs/                      # Winston log files (app.log, error.log)
├── .env                       # Environment variables
├── benchmark.js               # Performance benchmark script
└── package.json               # Dependencies & scripts
```

**Why feature-based modules?**

Each module is self-contained — its own service, controller, and routes. This is called the "feature-first" or "domain-driven" approach. When a team grows, different developers can own different modules without merge conflicts. Adding a new module means creating a new folder with three files — zero coupling with existing modules.

---

## 6. Request Lifecycle — How a Request Flows

When a customer places an order (`POST /api/v1/orders`), here's the complete path:

```
Client sends HTTP POST /api/v1/orders
  │
  ▼
┌─ Express App (src/app.js) ──────────────────────────┐
│  1. helmet()          → Sets security headers        │
│  2. cors()            → Adds CORS headers            │
│  3. express.json()    → Parses JSON body             │
│  4. apiLimiter        → Checks rate limit (100/15m)  │
│  5. Route match /api/v1/orders                       │
└──────────────────────────────────────────────────────┘
  │
  ▼
┌─ Order Routes (src/modules/orders/order.routes.js) ─┐
│  6. orderLimiter      → Checks order rate (20/15m)   │
│  7. authenticate      → Verifies JWT, attaches user  │
│  8. authorize(CUSTOMER)→ Checks role === CUSTOMER     │
└──────────────────────────────────────────────────────┘
  │
  ▼
┌─ Order Controller (order.controller.js) ─────────────┐
│  9. Extracts req.body, calls orderService.createOrder │
└──────────────────────────────────────────────────────┘
  │
  ▼
┌─ Order Service (order.service.js) ───────────────────┐
│ 10. Validates produce exists and is APPROVED         │
│ 11. Checks availableQuantity >= requested quantity   │
│ 12. Calculates totalPrice = price × quantity         │
│ 13. Opens Prisma transaction:                        │
│     a. Decrements availableQuantity                  │
│     b. Creates Order record                         │
│     c. Returns order with produce & vendor info      │
└──────────────────────────────────────────────────────┘
  │
  ▼
┌─ Response (apiResponse.success) ─────────────────────┐
│ { success: true, message: "Order created",           │
│   data: { id, quantity, totalPrice, status, ... },   │
│   timestamp: "2026-04-16T..." }                      │
└──────────────────────────────────────────────────────┘
```

If any step fails (invalid token, insufficient quantity, rate limited), the error propagates to the global `errorHandler` which returns a standardized error response.

---

## 7. Utility Layer

### apiResponse.js — Standardized Response Format

Every API response follows the same shape. This is critical for frontend developers — they always know what structure to expect.

**Success response:**
```json
{ "success": true, "message": "Data fetched", "data": {...}, "timestamp": "..." }
```

**Error response:**
```json
{ "success": false, "message": "Error description", "errors": [...], "timestamp": "..." }
```

**Paginated response:**
```json
{
  "success": true, "message": "List fetched",
  "data": [...],
  "meta": { "total": 100, "page": 1, "limit": 10, "totalPages": 10 },
  "timestamp": "..."
}
```

**Why include `timestamp`?** In distributed systems, the server time in the response helps clients detect clock drift and debug timing issues.

**Why include `meta` separately?** Frontend pagination components need total count and total pages to render page controls. Keeping it in a dedicated `meta` object separates data from pagination info.

### jwt.js — Token Management

```js
generateToken({ id, email, role })  // Signs JWT → "eyJhbG..."
verifyToken(token)                   // Decodes & verifies → { id, email, role, iat, exp }
```

**Why store `role` in the token?** The `authenticate` middleware can check role-based access without an extra database query. This saves one DB round-trip per authenticated request. Since roles rarely change, this is a safe optimization.

**Why not store `status` in the token?** A banned user could still use a previously issued token. The `authenticate` middleware fetches the user from the database and checks `status !== BANNED`. This is a deliberate tradeoff: one extra query per request for real-time ban enforcement.

### logger.js — Winston Logger

Three transports:
- **Console**: Colorized output for development visibility
- **`logs/error.log`**: Errors only — for production alerting
- **`logs/app.log`**: All levels — for debugging and auditing

**Why separate error log?** In production, you configure error monitoring tools (Sentry, Datadog) to watch the error log file specifically. You don't want 10,000 info-level lines drowning out actual errors.

### validators.js — Input Validation

```js
registerValidator: name(required), email(valid), password(min 8), role(optional, CUSTOMER|VENDOR only)
loginValidator:    email, password(required)
paginationValidator: page(int >= 1), limit(int 1-100)
```

**Why prevent ADMIN self-registration?** The `role` validator only allows `CUSTOMER` or `VENDOR`. Admin accounts should only be created through a controlled process (database seed, migration, or super-admin panel), not through a public API endpoint. This prevents privilege escalation attacks.

**Why limit pagination to 1-100?** Without a cap, a client could send `?limit=1000000` and force the database to return millions of rows, causing memory exhaustion and slow responses. The 100-row cap balances usability with performance.

---

## 8. Middleware Layer

### authenticate.js — JWT Verification

```
Extract Bearer token → Verify signature → Fetch user from DB → Check not BANNED → Attach req.user
```

**Why fetch user from DB on every request?** Two reasons:
1. **Real-time ban enforcement**: If an admin bans a user, the ban takes effect immediately — not when the token expires.
2. **Fresh role data**: If a user's role changes, the next request gets the updated role.

**Tradeoff**: One extra DB query per request. For millions of users, this would be mitigated with a Redis cache layer.

### authorize.js — Role-Based Access Control (RBAC)

```js
authorize("ADMIN", "VENDOR")  // Returns middleware that checks req.user.role
```

**Why a closure (higher-order function)?** The `authorize` function takes roles as parameters and returns a new middleware function. This makes route definitions declarative and readable:

```js
router.get("/", [authenticate, authorize("ADMIN")], controller.getAll);
```

### rateLimiter.js — Request Throttling

| Limiter | Limit | Applied To | Why This Rate |
|---|---|---|---|
| `authLimiter` | 10 req / 15 min | Login, Register | Prevents brute-force password attacks |
| `apiLimiter` | 100 req / 15 min | All routes (global) | General API protection |
| `orderLimiter` | 20 req / 15 min | POST /orders | Prevents order spam / flash-bot attacks |
| `bookingLimiter` | 15 req / 15 min | POST /rentals/:id/book | Prevents booking abuse |
| `uploadLimiter` | 5 req / 60 min | POST /vendors/certification | Certification submissions are expensive to review |

**Why different rates?** Authentication endpoints are the #1 target for brute-force attacks, so they get the strictest limit. Public listing endpoints need higher limits for browsing users. Upload endpoints trigger manual review processes, so they're rate-limited to prevent spam.

**How it works at scale**: `express-rate-limit` uses an in-memory store by default. For multi-server deployments, you'd switch to a Redis-backed store so all servers share the same rate counters.

### validate.js — Validation Error Formatter

```js
// express-validator collects errors → validate middleware formats them:
[
  { field: "email", message: "A valid email is required" },
  { field: "password", message: "Password must be at least 8 characters" }
]
```

**Why format errors this way?** Frontend form libraries can directly map `field` to the corresponding input element and show the error message inline. This creates a much better user experience than a generic "validation failed" message.

### errorHandler.js — Global Error Handler

This is the last middleware in the Express chain (4 parameters: `err, req, res, next`). It catches ALL errors thrown anywhere in the application.

**Prisma error mapping:**
- `P2002` (unique constraint violation) → 409 Conflict ("Duplicate value for email")
- `P2025` (record not found) → 404 Not Found

**JWT error mapping:**
- `JsonWebTokenError` → 401 Unauthorized
- `TokenExpiredError` → 401 Unauthorized

**Why catch database-specific errors?** Without this, a duplicate email registration would return a generic 500 error. The error handler maps it to a meaningful 409 with a clear message. This follows the principle of least surprise — clients get actionable error information.

---

## 9. Auth Module

**Files:** `src/modules/auth/auth.service.js`, `auth.controller.js`, `auth.routes.js`

### Registration Flow

```
POST /api/v1/auth/register { name, email, password, role }
  │
  ├─ bcrypt.hash(password, 10)    ← 10 salt rounds (industry standard)
  │
  ├─ prisma.user.create({
  │     data: { name, email, hashedPassword, role },
  │     include: { vendorProfile: true }  ← nested create if VENDOR
  │   })
  │
  └─ Return user WITHOUT password (destructuring: const { password: _, ...safe } = user)
```

**Why bcrypt with 10 rounds?** The cost factor of 10 means each hash takes ~100ms. This is fast enough for legitimate users but makes brute-force attacks impractical. A 10-round bcrypt hash takes ~10 years to crack on a modern GPU for a single 8-character password.

**Why nested create for vendor profile?** When a VENDOR registers, we create both the User and VendorProfile in a single Prisma call. This is atomic — either both succeed or neither does. No orphaned users without profiles.

**Why default role is CUSTOMER?** The `role` field defaults to `CUSTOMER` in both the validator and the database schema. This is defense-in-depth — even if someone bypasses the API and inserts directly into the database, they get the lowest privilege level.

### Login Flow

```
POST /api/v1/auth/login { email, password }
  │
  ├─ Find user by email
  ├─ bcrypt.compare(password, user.password)    ← constant-time comparison
  ├─ Check user.status !== BANNED
  ├─ generateToken({ id, email, role })
  │
  └─ Return { user (no password), token }
```

**Why "Invalid email or password" instead of "User not found"?** Specific error messages like "Email not registered" allow attackers to enumerate valid email addresses. A generic message doesn't reveal whether the email or password was wrong.

**Why constant-time comparison?** `bcrypt.compare` runs in constant time regardless of how many characters match. Regular string comparison (`===`) returns early on the first mismatch, which allows timing attacks to guess passwords character by character.

---

## 10. Vendor & Certification Module

**Files:** `src/modules/vendor/vendor.service.js`, `vendor.controller.js`, `vendor.routes.js`

### Certification Lifecycle

```
Vendor submits cert → certificationStatus = PENDING
                          │
                    Admin reviews
                     ┌────┴────┐
                  Approve     Reject
                     │          │
            = APPROVED    = REJECTED
            (vendor can    (vendor must
             sell produce)  re-submit)
```

**Why upsert for certifications?** `prisma.sustainabilityCert.upsert()` creates a new certification if none exists, or updates the existing one. A vendor should only have one active certification — the `@unique` constraint on `vendorId` in the schema enforces this at the database level. The upsert prevents duplicate key errors.

**Why reset status to PENDING on re-submission?** When a vendor updates their certification documents, it needs admin review again. Setting `certificationStatus: "PENDING"` triggers the review workflow automatically.

### Vendor Approval — Why Separate from Certification?

A vendor profile can be approved (the farm is legitimate) while their sustainability certification is still pending review. These are two independent approval workflows:
- **Vendor approval**: Is this a real farm with a real location?
- **Certification approval**: Is the farm's organic/sustainable certification valid?

---

## 11. Produce Marketplace Module

**Files:** `src/modules/produce/produce.service.js`, `produce.controller.js`, `produce.routes.js`

### Certification-Based Access Control

The public listing (`GET /api/v1/produce`) only shows `certificationStatus: "APPROVED"` items:

```js
const where = {
  certificationStatus: "APPROVED",
  ...(filters.category && { category: { contains: filters.category, mode: "insensitive" } }),
};
```

**Why filter at the query level, not the controller?** Database-level filtering is more efficient than fetching all records and filtering in JavaScript. The database can use indexes and doesn't transfer unnecessary data over the network.

**Why case-insensitive search?** Users searching for "vegetables" should also match "Vegetables" and "VEGETABLES". The `mode: "insensitive"` flag generates a SQL `ILIKE` query in PostgreSQL.

### Ownership Enforcement

```js
// In updateProduce:
if (produce.vendorId !== vendor.id) {
  const err = new Error("You can only update your own produce");
  err.statusCode = 403;
  throw err;
}
```

This check happens in the service layer, not the route/middleware layer. **Why?** Because ownership logic is business logic, not HTTP logic. If we later add an admin dashboard or CLI tool, the ownership check still works — it doesn't depend on `req` or `res`.

### Admin Bypass for Delete

```js
if (role !== "ADMIN") {
  // Check ownership
} else {
  // Skip ownership check
}
```

Admins can delete any produce (e.g., removing harmful or counterfeit listings). This is a platform safety feature.

---

## 12. Rental Space Module

**Files:** `src/modules/rental/rental.service.js`, `rental.controller.js`, `rental.routes.js`

### Booking with Price Calculation

```js
const diffMs = endDate - startDate;
const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
const totalPrice = Number(space.pricePerDay) * days;
```

**Why calculate price on the server?** Never trust client-side price calculations. A malicious client could send `{ totalPrice: 1 }` and get a free rental. The server calculates the price from the stored `pricePerDay` and the date range.

**Why `Math.ceil`?** A booking from May 1 to May 2 is 1 day, but May 1 to May 5 is 4 days. Using `Math.ceil` rounds up partial days — if you book at 10am Monday to 11am Wednesday, that's 2 full days plus a partial, rounded to 3.

### Transaction: Confirm Booking

```js
return prisma.$transaction([
  prisma.rentalBooking.update({
    where: { id: bookingId },
    data: { status: "CONFIRMED" },
  }),
  prisma.rentalSpace.update({
    where: { id: booking.rentalSpaceId },
    data: { isAvailable: false },
  }),
]);
```

**Why a transaction?** Two operations must both succeed or both fail:
1. Booking status → CONFIRMED
2. Space availability → false

Without a transaction, if the first update succeeds but the second fails, the booking is confirmed but the space still shows as available — leading to double-booking.

**Why the array form of `$transaction`?** The array form wraps all operations in a single database transaction. It's faster than the interactive form for simple sequential updates. We use the interactive form only when we need to read data within the transaction (like in order creation, where we read the produce and then decrement its quantity).

---

## 13. Orders Module

**Files:** `src/modules/orders/order.service.js`, `order.controller.js`, `order.routes.js`

### Order Creation — Interactive Transaction

```js
return prisma.$transaction(async (tx) => {
  await tx.produce.update({
    where: { id: data.produceId },
    data: { availableQuantity: { decrement: data.quantity } },
  });

  const order = await tx.order.create({ ... });
  return order;
});
```

**Why interactive transaction (async callback)?** We need to:
1. Read the produce (check it exists, is approved, has stock)
2. Decrement the quantity
3. Create the order
4. Return the created order with relations

All within one atomic transaction. If two customers order the last item simultaneously, the transaction isolation level ensures only one succeeds — the other gets a stock validation error.

**Why `{ decrement: data.quantity }` instead of `availableQuantity - data.quantity`?** The `decrement` atomic operator tells PostgreSQL to subtract in a single `UPDATE ... SET quantity = quantity - N` query. This is atomic at the database level — no race condition between reading and writing.

### Order State Machine

```
PENDING ──→ CONFIRMED ──→ SHIPPED ──→ DELIVERED
   │            │
   └──→ CANCELLED ←──┘
```

```js
const validTransitions = {
  PENDING:   ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["SHIPPED", "CANCELLED"],
  SHIPPED:   ["DELIVERED"],
  DELIVERED: [],
  CANCELLED: [],
};
```

**Why a state machine?** Without validation, someone could change status from "DELIVERED" back to "PENDING". The state machine enforces that orders only move forward (or get cancelled at appropriate stages).

**Why role-based transition rules?**
- **CUSTOMER** can only cancel PENDING orders (buyer's remorse protection)
- **VENDOR** can confirm, ship, deliver (fulfillment workflow)
- **ADMIN** can do anything (platform override for support cases)

### Quantity Restoration on Cancellation

```js
if (status === "CANCELLED") {
  return prisma.$transaction([
    prisma.order.update({ ... data: { status: "CANCELLED" } }),
    prisma.produce.update({
      data: { availableQuantity: { increment: order.quantity } },
    }),
  ]);
}
```

When an order is cancelled, the reserved stock goes back to available. This is done atomically in a transaction so the stock is never lost or double-counted.

---

## 14. Community Forum Module

**Files:** `src/modules/forum/forum.service.js`, `forum.controller.js`, `forum.routes.js`

### Search Functionality

```js
const where = search
  ? { OR: [
      { title: { contains: search, mode: "insensitive" } },
      { postContent: { contains: search, mode: "insensitive" } },
    ]}
  : {};
```

**Why `OR` with `contains`?** Users searching for "tomato" should find posts where "tomato" appears in either the title or the content. The `contains` filter generates SQL `ILIKE '%search%'`.

**Why not use full-text search?** PostgreSQL's full-text search (`to_tsvector` / `to_tsquery`) is more powerful but significantly more complex. For a forum with moderate traffic, `ILIKE` is sufficient. At scale, you'd upgrade to PostgreSQL FTS or Elasticsearch.

### Owner-or-Admin Authorization

```js
if (post.userId !== userId && role !== "ADMIN") {
  const err = new Error("You can only update your own posts");
  err.statusCode = 403;
  throw err;
}
```

This pattern is used for posts, produce, rental spaces, and plant tracking. The `role !== "ADMIN"` check gives admins platform moderation power — they can edit or delete inappropriate content.

---

## 15. Plant Tracking Module

**Files:** `src/modules/tracking/tracking.service.js`, `tracking.controller.js`, `tracking.routes.js`

### Booking Validation Before Tracking

```js
const space = await prisma.rentalSpace.findUnique({
  where: { id: data.rentalSpaceId },
  include: { rentalBookings: { where: { userId, status: "CONFIRMED" } } },
});

if (space.rentalBookings.length === 0) {
  throw new Error("You must have a confirmed booking...");
}
```

**Why validate booking existence?** Plant tracking is only meaningful on spaces the customer is actively renting. Without this check, any customer could add tracking to any space — including spaces they've never booked or bookings that were cancelled.

**Why fetch bookings with a nested `where`?** Instead of fetching ALL bookings and filtering in JavaScript, we tell Prisma to only fetch confirmed bookings for this user. This is more efficient — less data transferred from the database.

### Growth Stage & Health Status Enums

```
GrowthStage:  SEEDLING → VEGETATIVE → FLOWERING → FRUITING → HARVEST
HealthStatus: HEALTHY | NEEDS_WATER | DISEASED | HARVESTED
```

These enums represent real agricultural phases. Using database enums ensures data consistency — you can't accidentally set `growthStage: "BIG"`.

---

## 16. Rate Limiting Strategy

Five tiers of rate limiting protect different attack surfaces:

```
┌─────────────────────────────────────────────────────────┐
│  uploadLimiter    │ 5 req/hr   │ Certification uploads  │
│  authLimiter      │ 10 req/15m │ Login & Registration  │
│  bookingLimiter   │ 15 req/15m │ Space bookings        │
│  orderLimiter     │ 20 req/15m │ Order creation        │
│  apiLimiter       │ 100 req/15m│ All other endpoints   │
└─────────────────────────────────────────────────────────┘
```

**Why stricter limits for sensitive operations?**

- **Auth**: Brute-force attacks try thousands of password combinations. 10 attempts per 15 minutes makes this impractical.
- **Orders**: A bot could place thousands of orders to manipulate inventory or overload fulfillment. 20 orders per 15 minutes is generous for real users.
- **Uploads**: Certification uploads trigger manual admin review. 5 per hour prevents spam while allowing corrections.

**How rate limiting works**: `express-rate-limit` uses the client's IP address as the key. Each request increments a counter. When the counter exceeds `max` within the `windowMs`, subsequent requests get a 429 response.

---

## 17. Error Handling Strategy

### Three Layers of Error Handling

```
Layer 1: Validation errors (express-validator)
  → 422 with field-level error messages

Layer 2: Business logic errors (service layer)
  → Thrown with statusCode (400, 401, 403, 404, 409)
  → Caught by controller's try/catch, passed to next(error)

Layer 3: System errors (database, network, framework)
  → Caught by global errorHandler middleware
  → Prisma errors mapped to HTTP status codes
  → JWT errors mapped to 401
  → Unknown errors → 500 (message: "Internal server error")
```

**Why never expose internal errors?** The error handler returns "Internal server error" for 500 errors, never the actual stack trace or database error message. Exposing internal errors leaks implementation details that attackers can use (e.g., table names, query structure, connection strings).

---

## 18. Database Seeding

`prisma/seed.js` creates a fully populated test database:

| Record Type | Count | Purpose |
|---|---|---|
| Admins | 3 | Test admin-only endpoints |
| Vendors | 10 | Test vendor workflows with variety |
| Customers | 5 | Test customer actions |
| Produce | 100 | Test pagination and filtering (10 per vendor) |
| Rental Spaces | 10 | Test booking and tracking |
| Orders | 10 | Test order listing and status transitions |
| Rental Bookings | 5 | Test plant tracking (CONFIRMED status required) |
| Community Posts | 5 | Test forum search and CRUD |
| Plant Tracking | 5 | Test growth stage updates |

**Total: 153 records**

**Why delete in reverse FK order?**

```js
await prisma.plantTracking.deleteMany();   // No FK dependencies
await prisma.communityPost.deleteMany();   // No FK dependencies
await prisma.order.deleteMany();           // Depends on produce, users
await prisma.rentalBooking.deleteMany();   // Depends on spaces, users
// ... etc
await prisma.user.deleteMany();            // Last — everything depends on users
```

If we deleted users first, the `onDelete: Cascade` would delete everything. But using `deleteMany` in reverse order is explicit, predictable, and works even if cascade is accidentally removed.

---

## 19. API Documentation (Swagger)

**Configuration:** `src/config/swagger.js`
**Access:** `GET /api/docs` (interactive Swagger UI)

Every route file contains JSDoc `@swagger` annotations that are automatically collected by `swagger-jsdoc`. The result is a fully interactive API documentation page where developers can:

- Browse all 26+ endpoints organized by tag
- See request/response schemas with examples
- Try endpoints directly from the browser
- Understand authentication requirements

**Why JSDoc annotations instead of a separate YAML file?**

Annotations live next to the code they document. When a developer changes a route, the documentation is right there — much more likely to be updated than a separate file in a different directory. This is the "docs-as-code" philosophy.

---

## 20. Benchmarking

`benchmark.js` measures real API performance:

```
+-------------------------+----------+----------+----------+-------------------------+------+
| Endpoint                | Avg (ms) | Min (ms) | Max (ms) | Status Codes            | OK?  |
+-------------------------+----------+----------+----------+-------------------------+------+
| POST /api/v1/auth/login | 475.68   | 452.98   | 507.89   | 200, 200, 200, 200, 200 | Yes  |
| GET /api/v1/produce     | 541.58   | 427.47   | 935.69   | 200, 200, 200, 200, 200 | Yes  |
| GET /api/v1/rentals     | 422.51   | 405.65   | 438.12   | 200, 200, 200, 200, 200 | Yes  |
| GET /api/v1/forum       | 452.04   | 404.58   | 516.28   | 200, 200, 200, 200, 200 | Yes  |
| GET /api/v1/orders/my   | 858.48   | 834.71   | 904.68   | 200, 200, 200, 200, 200 | Yes  |
+-------------------------+----------+----------+----------+-------------------------+------+
```

**Why use `process.hrtime.bigint()`?** `Date.now()` has millisecond precision and can be affected by system clock changes. `process.hrtime.bigint()` uses a monotonic clock with nanosecond precision — it only goes forward and is not affected by NTP adjustments.

**Why 5 runs?** A single run might be affected by network jitter, GC pauses, or database connection initialization. 5 runs smooth out anomalies while keeping the benchmark quick.

---

## 21. How to Run the Project

```bash
# 1. Install dependencies
npm install

# 2. Generate Prisma client
npx prisma generate

# 3. Configure .env (set DATABASE_URL, JWT_SECRET, etc.)

# 4. Push schema to database
npx prisma db push

# 5. Seed the database
node prisma/seed.js

# 6. Start development server
npm run dev

# 7. Run benchmark (in a separate terminal, while server is running)
node benchmark.js

# 8. View API documentation
# Open browser: http://localhost:5000/api/docs

# 9. View Prisma Studio (database GUI)
npx prisma studio
```

**Seed Credentials:**

| Role | Email | Password |
|---|---|---|
| Admin | admin1@urbanfarm.com | Admin@1234 |
| Vendor | vendor1@urbanfarm.com | Vendor@1234 |
| Customer | customer1@urbanfarm.com | Customer@1234 |

---

## 22. Complete API Endpoint Reference

### Auth (`/api/v1/auth`)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | /register | Public | Register (CUSTOMER or VENDOR) |
| POST | /login | Public | Login, returns JWT |
| GET | /profile | Bearer | Get current user profile |

### Vendors (`/api/v1/vendors`)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | / | ADMIN | List all vendors (paginated) |
| GET | /me | VENDOR | Get own vendor profile |
| PATCH | /me | VENDOR | Update farm name/location |
| PATCH | /:vendorId/approve | ADMIN | Approve vendor |
| PATCH | /:vendorId/reject | ADMIN | Reject vendor |
| POST | /certification | VENDOR | Submit/update certification |
| PATCH | /:vendorId/certification/approve | ADMIN | Approve certification |
| PATCH | /:vendorId/certification/reject | ADMIN | Reject certification |

### Produce (`/api/v1/produce`)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | / | Public | List approved produce (paginated, filter by category) |
| GET | /my | VENDOR | List own produce (all statuses) |
| GET | /:id | Public | Get single produce |
| POST | / | VENDOR | Create produce (status: PENDING) |
| PATCH | /:id | VENDOR | Update own produce |
| DELETE | /:id | VENDOR, ADMIN | Delete produce (ownership enforced) |
| PATCH | /:id/approve | ADMIN | Approve produce |
| PATCH | /:id/reject | ADMIN | Reject produce |

### Rentals (`/api/v1/rentals`)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | / | Public | List rental spaces (paginated, filter by location/availability) |
| GET | /:id | Public | Get single space |
| POST | / | VENDOR | Create rental space |
| PATCH | /:id | VENDOR | Update own space |
| DELETE | /:id | VENDOR | Delete own space |
| POST | /:id/book | CUSTOMER | Book a space (auto-calculates price) |
| PATCH | /bookings/:bookingId/confirm | ADMIN, VENDOR | Confirm booking (sets unavailable) |
| PATCH | /bookings/:bookingId/cancel | Any owner | Cancel booking (sets available) |
| GET | /bookings/my | CUSTOMER | List own bookings |
| GET | /bookings/vendor | VENDOR | List bookings on own spaces |

### Orders (`/api/v1/orders`)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | / | CUSTOMER | Place order (decrements stock in transaction) |
| GET | / | ADMIN | List all orders |
| GET | /my | CUSTOMER | List own orders |
| GET | /vendor | VENDOR | List orders for own produce |
| GET | /:id | Bearer | Get single order (ownership checked) |
| PATCH | /:id/status | Bearer | Update status (role-based rules, state machine enforced) |

### Forum (`/api/v1/forum`)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | / | Public | List posts (paginated, search by title/content) |
| GET | /:id | Public | Get single post |
| POST | / | Bearer | Create post |
| PATCH | /:id | Bearer | Update post (owner or admin) |
| DELETE | /:id | Bearer | Delete post (owner or admin) |

### Plant Tracking (`/api/v1/tracking`)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | / | CUSTOMER | List own plant records |
| GET | /:id | CUSTOMER | Get single record (ownership checked) |
| POST | / | CUSTOMER | Add tracking (requires confirmed booking) |
| PATCH | /:id | CUSTOMER | Update growth/health status |
| DELETE | /:id | CUSTOMER | Delete own record |

---

## 23. Scaling for Millions of Users

If this platform grew to millions of users, here's what would need to change:

### Database Layer

| Current | Scaled Solution | Why |
|---|---|---|
| Single PostgreSQL instance | Read replicas + primary for writes | 90% of API traffic is reads (listings, browsing). Replicas distribute read load. |
| Prisma connection pool (default) | PgBouncer connection pooler | Each Prisma client holds ~10 connections. 100 servers = 1000 connections. PgBouncer multiplexes thousands of app connections into a small pool of DB connections. |
| `ILIKE` for search | PostgreSQL full-text search or Elasticsearch | `ILIKE '%term%'` can't use indexes → full table scan. FTS uses inverted indexes for sub-millisecond search. |
| No caching | Redis cache layer | Popular produce listings, vendor profiles, and forum posts rarely change. Cache for 5-60 seconds reduces DB load by 80%. |

### Application Layer

| Current | Scaled Solution | Why |
|---|---|---|
| Single Express instance | Load balancer (nginx/ALB) + multiple instances | No single point of failure. Horizontal scaling. |
| In-memory rate limiting | Redis-backed rate limiting | Rate counters must be shared across all server instances. |
| JWT with DB user lookup | JWT + short TTL + Redis cache | Cache user lookups for 30 seconds. Reduces DB queries by 95% for authenticated requests. |
| File-based Winston logs | Structured JSON logs + ELK/Datadog | Centralized log aggregation enables searching across all instances. |
| No background jobs | Bull/BullMQ task queue | Email sending, notification dispatch, and report generation should not block HTTP responses. |

### Infrastructure

| Component | Technology | Purpose |
|---|---|---|
| CDN | Cloudflare/Fastly | Cache and serve static assets, API responses at edge locations |
| API Gateway | Kong/AWS API Gateway | Centralized rate limiting, request routing, API key management |
| Container Orchestration | Kubernetes/ECS | Auto-scale based on CPU/memory/request count |
| CI/CD | GitHub Actions | Automated testing, linting, and deployment on every push |
| Monitoring | Prometheus + Grafana | Real-time dashboards for request latency, error rates, DB connections |
| Alerting | PagerDuty/Opsgenie | Alert on-call engineers when error rate exceeds threshold |

---

## 24. Possible Improvements

### High Priority

1. **Refresh Token Rotation**: Currently, a JWT is valid for 7 days. If stolen, the attacker has 7 days of access. Implement short-lived access tokens (15 min) + refresh tokens with rotation — when a refresh token is used, a new one is issued and the old one is invalidated.

2. **Email Verification**: Users can register with any email. Add email verification via a signed link sent to the registered address. Prevents fake accounts and ensures communication channels work.

3. **Password Reset Flow**: Users currently have no way to reset their password. Implement a token-based reset flow: generate a time-limited reset token, email it, validate on use.

4. **Input Sanitization**: Add `xss-clean` or DOMPurify for user-submitted content (forum posts, produce descriptions) to prevent stored XSS attacks.

5. **File Upload for Certifications**: Currently `documentUrl` is just a string. Implement actual file upload to S3/Cloudflare R2 with virus scanning and file type validation.

### Medium Priority

6. **Database Indexes**: Add indexes on frequently queried columns: `produce(category)`, `produce(certificationStatus)`, `rentalSpace(location)`, `order(status)`, `communityPost(title)`.

7. **Pagination Cursor**: Current offset-based pagination (`skip/take`) gets slow on large datasets (page 1000 requires scanning 10000 rows). Cursor-based pagination (`WHERE id > lastId`) is O(1) regardless of page.

8. **Soft Deletes**: Currently, deletes are permanent. Add `deletedAt` timestamps and filter them out in queries. Enables data recovery and audit trails.

9. **Notification System**: When an order is confirmed/shipped/delivered, notify the customer via email/push/SMS. When a vendor is approved, notify them. Use a message queue (BullMQ) to send notifications asynchronously.

10. **API Versioning Strategy**: Currently at `/api/v1`. Add a version migration plan — when v2 is needed, v1 should continue working with deprecation headers.

### Nice to Have

11. **WebSocket for Real-Time Updates**: Order status changes, booking confirmations, and forum posts could push real-time updates to connected clients instead of polling.

12. **Image Upload for Produce**: Vendors should upload photos of their produce. Store in S3 with CDN-backed URLs.

13. **Review/Rating System**: Customers should rate vendors and produce. Add a `Review` model with 1-5 star ratings and text reviews.

14. **Geospatial Search**: Rental spaces have a `location` string. Convert to PostGIS coordinates and enable "find spaces within 5km" queries.

15. **Audit Log**: Track all admin actions (approvals, rejections, bans) with timestamps for accountability.

---

## 25. Interview Questions & Answers

### Architecture & Design

**Q1: Why did you choose a layered architecture (routes → controller → service)?**

A: Separation of concerns. Routes handle HTTP mapping, controllers handle request/response formatting, services handle business logic. This makes each layer independently testable and replaceable. If we switch from Express to Fastify tomorrow, only the routes layer changes. If we switch from Prisma to TypeORM, only the service layer changes.

**Q2: Why Prisma over raw SQL or Sequelize?**

A: Prisma generates a type-safe client from the schema — if I rename a column, the generated TypeScript types break at compile time, not runtime. Raw SQL has no type safety. Sequelize's decorators and model definitions become unwieldy for complex schemas. Prisma's migration system also handles schema diffs automatically.

**Q3: How does your error handling work end-to-end?**

A: Three layers. First, express-validator catches malformed input → 422. Second, the service layer throws errors with `statusCode` attached → caught by the controller's try/catch → passed to `next(error)`. Third, the global `errorHandler` middleware catches everything — maps Prisma errors (P2002→409, P2025→404), JWT errors (→401), and falls back to 500 for unknown errors. The client always gets a consistent JSON response.

**Q4: Why do you throw errors in services instead of returning them?**

A: Throwing errors lets the controller use a simple try/catch pattern with `next(error)`. If services returned error objects, every controller would need to check `if (result.error)` — which is easily forgotten. Throwing guarantees that errors bubble up to the error handler.

### Security

**Q5: How do you handle password security?**

A: bcrypt with 10 salt rounds. The salt is unique per user, so even if two users have the same password, their hashes are different. bcrypt is deliberately slow (~100ms per hash), making brute-force attacks computationally expensive. We never store or return plain-text passwords — the registration response destructures out the password field.

**Q6: Why JWT instead of sessions?**

A: JWT is stateless — the token contains all the information needed to authenticate a request. With sessions, the server must store session data and look it up on every request. With JWT, any server instance can verify the token without database access. This makes horizontal scaling trivial. The tradeoff is that we can't invalidate a token without a blacklist — which is why we check ban status from the DB on every authenticated request.

**Q7: How do you prevent brute-force attacks?**

A: Multiple layers: (1) bcrypt's computational cost slows each attempt to ~100ms, (2) `authLimiter` caps login attempts to 10 per 15 minutes per IP, (3) generic error messages ("Invalid email or password") prevent user enumeration, (4) Helmet sets security headers that prevent certain attack vectors.

**Q8: How do you prevent unauthorized access to resources?**

A: Two-tier authorization. First, the `authenticate` middleware verifies the JWT and attaches `req.user`. Then, `authorize(...roles)` checks the user's role. For resource-level access (e.g., "can this vendor edit this produce?"), the service layer checks ownership: `produce.vendorId === vendor.id`. This is defense in depth — even if someone bypasses the role check, they still can't access another vendor's resources.

**Q9: What is the P2002 error and how do you handle it?**

A: P2002 is Prisma's unique constraint violation error. It fires when someone tries to create a record with a duplicate value on a unique field (like email). The global error handler maps it to HTTP 409 Conflict with a message like "Duplicate value for email" — giving the client clear, actionable information.

### Database & Transactions

**Q10: When and why do you use Prisma transactions?**

A: Three scenarios: (1) Order creation — decrement stock and create the order atomically. If stock decrement fails, no order is created. (2) Booking confirmation — set booking to CONFIRMED and space to unavailable. Without a transaction, the space could remain "available" even after booking confirmation. (3) Order cancellation — cancel the order and restore stock. Without a transaction, stock could be lost permanently.

I use the interactive `$transaction(async (tx) => {...})` form when I need to read data within the transaction (order creation reads produce). I use the array form `$transaction([...])` for simple sequential updates (booking confirm/cancel) because it's faster.

**Q11: Why use UUID primary keys instead of auto-increment integers?**

A: Three reasons. Security: sequential IDs let attackers enumerate all users by incrementing `/users/1`, `/users/2`, etc. Scalability: UUIDs are globally unique, so they work across distributed systems and microservices without coordination. Privacy: the ID doesn't leak the total count of records.

**Q12: How does the order state machine work?**

A: The `validTransitions` object defines which statuses can transition to which. PENDING can go to CONFIRMED or CANCELLED. CONFIRMED can go to SHIPPED or CANCELLED. SHIPPED can only go to DELIVERED. DELIVERED and CANCELLED are terminal states. This prevents invalid transitions like DELIVERED → PENDING. Role-based rules add another layer: customers can only cancel, vendors can only advance or cancel their own produce orders.

**Q13: Why do you use `Promise.all` for pagination queries?**

A: `findMany` and `count` are independent queries. Running them sequentially takes time1 + time2. Running them with `Promise.all` takes max(time1, time2) — effectively halving the response time for paginated endpoints.

### Performance & Scalability

**Q14: How would you scale this to handle millions of requests?**

A: Horizontal scaling with load balancers, database read replicas, Redis caching for hot data (produce listings, vendor profiles), PgBouncer for connection pooling, CDN for static assets, background job queues for async work, and database indexing for common queries. The stateless JWT authentication already supports horizontal scaling — any server can verify tokens without shared state.

**Q15: Why is the `/orders/my` endpoint slower than others in the benchmark?**

A: It performs a JOIN across three tables (orders, produce, vendor profiles) with user filtering. At scale, adding indexes on `orders(userId)` and `orders(vendorId)` would significantly speed this up. The current ~850ms includes network latency to the Supabase database — in production, the database would be in the same region as the application servers.

**Q16: What is the N+1 query problem and does your code have it?**

A: N+1 happens when you fetch N records and then make 1 additional query per record. For example, fetching 10 orders and then querying the database 10 times for their produce. Prisma's `include` keyword generates JOINs, so our queries are efficient — we get orders with their produce and vendor in a single SQL query. No N+1 problem.

### Business Logic

**Q17: Why can't users self-register as ADMIN?**

A: The `registerValidator` only allows `CUSTOMER` or `VENDOR` as valid roles. Even if someone sends `role: "ADMIN"` in the request body, the validator rejects it. The database default is also `CUSTOMER`. Admin accounts are created through controlled processes (database seed, super-admin panel) — never through the public API. This prevents privilege escalation.

**Q18: Why is the certification process two-step (vendor approval + certification approval)?**

A: A vendor might be a legitimate farm (approved) but their organic certification documents might be expired or forged (rejected). Separating these allows the platform to verify the business independently from their sustainability claims.

**Q19: Why calculate booking price on the server instead of accepting it from the client?**

A: Never trust client-submitted prices. A malicious client could submit `{ totalPrice: 1 }` and get a 4-day rental for 1 taka. The server calculates from the stored `pricePerDay` and the date range. The client can't manipulate the price because it never comes from them.

**Q20: How does plant tracking validate that a customer actually rented the space?**

A: The `addTracking` service fetches the rental space with a nested filter: `include: { rentalBookings: { where: { userId, status: "CONFIRMED" } } }`. If no confirmed bookings exist for this user on this space, the request is rejected with 403. This prevents tracking on spaces the customer has never rented.

### Express & Node.js

**Q21: Why is the error handler defined with 4 parameters?**

A: Express identifies error-handling middleware by its signature: `(err, req, res, next)` — exactly 4 parameters. If you define it with 3, Express treats it as a regular middleware and never passes errors to it. This is a common source of bugs.

**Q22: What is middleware chaining and how does `[authLimiter, ...registerValidator, validate]` work?**

A: Express processes middleware arrays left to right. Each middleware calls `next()` to pass to the next one. `authLimiter` checks rate limit → calls next. `...registerValidator` spreads into individual validation middlewares (name, email, password, role) → each calls next. `validate` checks if any validation errors were collected → if yes, returns 422; if no, calls next. The controller only runs if ALL middleware passes.

**Q23: Why do you use `dotenv.config()` in server.js but not in other files?**

A: `dotenv.config()` loads `.env` variables into `process.env`. It only needs to be called once, as early as possible in the entry point. All other files access `process.env.JWT_SECRET` etc. — these are already loaded because Node.js requires server.js first, which triggers dotenv before anything else.

**Q24: What is graceful shutdown and why do you implement it?**

A: The `SIGINT` handler calls `prisma.$disconnect()` before `process.exit(0)`. When the server is shutting down (Ctrl+C or deployment), Prisma closes its database connections cleanly. Without this, in-flight queries might fail with connection errors, and the database might hold locks from incomplete transactions.

### Supabase & Deployment

**Q25: Why do you use two database URLs (DATABASE_URL and DIRECT_URL)?**

A: Supabase uses PgBouncer for connection pooling. The pooler (port 6543) uses transaction mode, which doesn't support Prisma's prepared statements. We add `?pgbouncer=true` to tell Prisma to avoid prepared statements. The direct connection (port 5432) is used for schema migrations (`prisma db push`) which need full SQL support. This dual-URL setup is the recommended Supabase + Prisma pattern.

**Q26: What does `?pgbouncer=true` do?**

A: It tells Prisma to use simple queries instead of prepared statements. PgBouncer in transaction mode doesn't support named prepared statements because each transaction might be routed to a different PostgreSQL backend process. Without this flag, Prisma would generate `PREPARE` statements that fail with "prepared statement already exists" errors.
