# AM Mart — Grocery E-Commerce Platform

A full-stack multi-tenant marketplace with prepaid SIM card ordering, international mobile top-up, delivery tracking, and seller/rider management.

## Architecture

```
AM Mart (pnpm monorepo)
├── apps/
│   ├── backend/          NestJS API + WebSocket (port 3001)
│   ├── mobile/           React Native (Expo) — customers, sellers, riders
│   └── admin/            Next.js admin panel (port 3000)
└── packages/
    └── shared/           Shared TypeScript types and constants
```

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | NestJS v10, Prisma ORM, PostgreSQL |
| Mobile | React Native, Expo Router, Redux Toolkit |
| Admin | Next.js 14 App Router, Tailwind CSS, React Query |
| Auth | JWT + Refresh Tokens, OTP via Twilio |
| Payments | Stripe, COD, Wallet system |
| Real-time | Socket.IO (delivery tracking) |
| Notifications | Firebase Cloud Messaging |
| Storage | AWS S3 |
| Top-up | DTone/Reloadly API |

---

## Quick Start

### 1. Prerequisites

- Node.js 20+
- pnpm 8+ (`npm install -g pnpm`)
- PostgreSQL 15+ (running locally or via Docker)
- Expo CLI (`npx expo`)

### 2. Clone and Install

```bash
git clone <repo-url>
cd am-mart
pnpm install
```

### 3. Environment Variables

Copy the example file and fill in your values:

```bash
cp .env.example apps/backend/.env
```

**Minimum required for local dev:**

```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/ammart"
JWT_SECRET="your-secret-key-min-32-chars"
JWT_REFRESH_SECRET="your-refresh-secret-min-32-chars"

# Leave these as-is for dev (OTP will log to console instead of SMS)
NODE_ENV=development
```

**For full features, also set:**

```env
TWILIO_ACCOUNT_SID=...        # SMS/OTP
TWILIO_AUTH_TOKEN=...
TWILIO_FROM_NUMBER=...

FIREBASE_PROJECT_ID=...       # Push notifications
FIREBASE_PRIVATE_KEY=...
FIREBASE_CLIENT_EMAIL=...

AWS_ACCESS_KEY_ID=...         # File uploads
AWS_SECRET_ACCESS_KEY=...
AWS_BUCKET_NAME=...
AWS_REGION=...

STRIPE_SECRET_KEY=...         # Card payments
GOOGLE_MAPS_API_KEY=...       # Delivery tracking
```

### 4. Database Setup

```bash
# Create database and run migrations
pnpm db:migrate

# Seed with demo data
pnpm db:seed
```

This creates:
- Categories (10 categories with emojis)
- Sample products (15 grocery items)
- 8 SIM numbers (SKT, KT, LG U+, MVNO)
- Demo banners and app settings
- Test user accounts (see below)

### 5. Start Development Servers

```bash
# Start all services simultaneously
pnpm dev
```

Or individually:

```bash
# Backend API (http://localhost:3001)
cd apps/backend && pnpm dev

# Admin Panel (http://localhost:3000)
cd apps/admin && pnpm dev

# Mobile App (Expo)
cd apps/mobile && npx expo start
```

---

## Test Accounts (after seeding)

| Role | Phone | Password |
|---|---|---|
| Super Admin | +82100000000 | Admin@1234 |
| Seller | +82101111111 | Seller@1234 |
| Rider | +82102222222 | Rider@1234 |
| Customer | +82103333333 | Customer@1234 |

**Admin Panel:** http://localhost:3000/login  
Use admin credentials above.

---

## API Documentation

Swagger UI is available at: **http://localhost:3001/docs**

### Key Endpoints

```
Auth:
  POST /api/v1/auth/register
  POST /api/v1/auth/login
  POST /api/v1/auth/login-otp
  POST /api/v1/auth/verify-phone
  POST /api/v1/auth/refresh
  POST /api/v1/auth/forgot-password
  POST /api/v1/auth/reset-password

Products:
  GET  /api/v1/products
  GET  /api/v1/products/:id
  POST /api/v1/products (seller)

Orders:
  POST /api/v1/orders
  GET  /api/v1/orders/my-orders
  GET  /api/v1/orders/:id
  POST /api/v1/orders/:id/status

SIM Cards:
  GET  /api/v1/sim/search?lastFour=1234&carrier=SKT
  POST /api/v1/sim/reserve
  POST /api/v1/sim/orders/:id/submit
  GET  /api/v1/sim/admin/orders (admin)
  POST /api/v1/sim/admin/orders/:id/status (admin)

Top-Up:
  GET  /api/v1/topup/countries
  GET  /api/v1/topup/amounts?countryCode=PH&operator=Globe
  POST /api/v1/topup/create

Delivery:
  WebSocket: ws://localhost:3001/tracking
    rider:location — emit location update
    track:order — subscribe to order tracking
```

---

## Mobile App Screens

### Customer
- `/(auth)/welcome` — Onboarding
- `/(auth)/login` — Password login
- `/(auth)/login-otp` — OTP login
- `/(auth)/register` — Registration
- `/(auth)/forgot-password` — Password reset
- `/(customer)` — Home with categories & products
- `/(customer)/search` — Product search
- `/(customer)/product/[id]` — Product detail
- `/(customer)/cart` — Shopping cart
- `/(customer)/checkout` — Order checkout
- `/(customer)/orders` — Order history
- `/(customer)/order/[id]` — Order detail + tracking
- `/(customer)/sim` — SIM card search (4-digit picker)
- `/(customer)/sim/reserve` — SIM reservation + ID upload
- `/(customer)/topup` — Mobile top-up selection
- `/(customer)/topup/confirm` — Top-up payment
- `/(customer)/profile` — User profile
- `/(customer)/notifications` — Notification list

### Seller
- `/(seller)` — Seller dashboard
- `/(seller)/products` — Product management
- `/(seller)/add-product` — Add product form
- `/(seller)/orders` — Order management
- `/(seller)/earnings` — Earnings analytics

### Rider
- `/(rider)` — Active deliveries
- `/(rider)/history` — Delivery history

---

## SIM Card System

The SIM ordering flow follows this state machine:

```
PENDING (added by admin)
  → AVAILABLE (admin approves)
  → RESERVED (customer searches & reserves, 15-min window)
  → CONFIRMED (customer uploads ID)
  → PROCESSING (admin verifies ID)
  → OUT_FOR_DELIVERY (dispatched)
  → DELIVERED
  → CANCELLED (from any state)
```

**Reservation expiry:** A cron job runs every minute to release expired reservations (back to AVAILABLE).

**Bulk upload:** Admin can upload `.xlsx` files with columns: number, carrier, simType, price.

---

## Commission System

Each seller has a configurable `commissionRate` (default 10%).

When an order is placed:
1. For each order item, a `Commission` record is created
2. `sellerAmount = itemTotal × (1 - commissionRate/100)`
3. `platformAmount = itemTotal × commissionRate/100`

Seller payouts are tracked in `SellerPayout` and processed manually by admin.

---

## Deployment

### Backend (Railway / Render / VPS)

```bash
cd apps/backend
pnpm build
node dist/main.js
```

Set `NODE_ENV=production` and all required env vars.

### Admin Panel (Vercel)

```bash
cd apps/admin
pnpm build
```

Set `NEXT_PUBLIC_API_URL` to your backend URL.

### Mobile (Expo EAS Build)

```bash
cd apps/mobile
npx eas build --platform all
```

Configure `app.json` with your bundle IDs and API URLs.

---

## Database Management

```bash
pnpm db:migrate      # Run pending migrations
pnpm db:seed         # Seed demo data
pnpm db:studio       # Open Prisma Studio (visual DB browser)
pnpm db:generate     # Regenerate Prisma client after schema changes
```

To reset the database completely:

```bash
cd apps/backend
npx prisma migrate reset
```

---

## Project Structure

```
apps/backend/src/modules/
  auth/         Registration, login, OTP, JWT tokens
  users/        User management, profiles
  products/     Product CRUD, search, stock management
  categories/   Category management
  orders/       Order creation, status, commission
  cart/         Shopping cart
  sim/          SIM search, reservation, ID upload, admin flow
  topup/        Country/operator data, order creation
  sellers/      Seller profiles, approval workflow
  riders/       Rider management, location tracking
  delivery/     Rider assignment, WebSocket gateway
  payments/     Stripe, wallet, refunds, payouts
  notifications/ Firebase push notifications
  admin/        Dashboard stats, settings, logs
  support/      Help tickets, admin replies
  coupons/      Discount codes
  banners/      Home screen promotions
  wallet/       Customer wallet balance, transactions
  upload/       AWS S3 file uploads
```
