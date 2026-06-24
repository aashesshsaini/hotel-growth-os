# Hotel Growth OS

Industry-level SaaS platform for Indian hotels to manage enquiries, WhatsApp leads, bookings, rooms, guests, payments, reviews, campaigns, corporate leads, event leads, staff, dashboards and reports.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Backend | Node.js, Express.js, TypeScript |
| Database | MongoDB + Mongoose |
| Frontend | Next.js 14, React, TypeScript |
| UI | Tailwind CSS |
| Cache/Queue | Redis + BullMQ |
| Auth | JWT + RBAC |
| Payments | Razorpay-ready |
| Messaging | WhatsApp Business API-ready |
| File Upload | AWS S3 / Cloudinary-ready |

## Monorepo Structure

```
hotel-growth-os/
├── apps/
│   ├── backend/          # Express API
│   └── frontend/         # Next.js admin panel
├── packages/
│   └── shared/           # Shared types & enums
├── docs/
│   └── API.md            # API documentation
├── postman/
│   └── Hotel-Growth-OS.postman_collection.json
└── README.md
```

## Prerequisites

- Node.js 18+
- MongoDB 6+ (local or Atlas)
- Redis 6+ (optional; set `START_WORKERS=false` if unavailable)

## Quick Start

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp apps/backend/.env.example apps/backend/.env
cp apps/frontend/.env.example apps/frontend/.env.local
```

Edit `apps/backend/.env` with your MongoDB URI and JWT secret.

### 3. Seed database

```bash
npm run seed
```

This creates:
- **Super Admin:** `admin@hotelgrowthos.com` / `Admin@123456`
- **Demo Hotel Owner:** `owner@demohotel.com` / `Owner@123456`
- Sample hotel, room types, rooms, and enquiry

### 4. Start development

```bash
npm run dev
```

- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:5000/api/v1
- **Health check:** http://localhost:5000/health

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start backend + frontend |
| `npm run dev:backend` | Backend only |
| `npm run dev:frontend` | Frontend only |
| `npm run build` | Build all packages |
| `npm run seed` | Seed database |

## Roles

- `super_admin` — Platform admin, manages all hotels
- `hotel_owner` — Full hotel access
- `hotel_manager` — Hotel management
- `reception_staff` — Front desk operations
- `sales_staff` — Enquiries & leads
- `accountant` — Payments & reports

## API Modules

Auth, Hotels, Staff, Room Types, Rooms, Guests, Enquiries, Bookings, Payments, Reviews, Campaigns, WhatsApp, Corporate Leads, Event Leads, Dashboard, Reports, Notifications, Tasks

See [docs/API.md](./docs/API.md) for full endpoint reference.

## Architecture

- **Controller → Service → Repository** pattern
- **Multi-tenant** hotel-level data isolation via `hotelId`
- **Soft delete** on core entities
- **BullMQ queues** for WhatsApp, reminders, campaigns, reports
- **Placeholder services** for Razorpay, WhatsApp, S3, Cloudinary (configure via `.env`)

## Production Notes

1. Change `JWT_SECRET` and all default passwords
2. Configure Razorpay, WhatsApp, and file upload credentials
3. Use managed MongoDB and Redis
4. Set `NODE_ENV=production`
5. Run `npm run build` before deploying

## License

Proprietary — Hotel Growth OS
