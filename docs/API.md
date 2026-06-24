# Hotel Growth OS — API Documentation

Base URL: `http://localhost:5000/api/v1`

## Authentication

All protected routes require header:

```
Authorization: Bearer <jwt_token>
```

Hotel-scoped routes also accept:

```
x-hotel-id: <hotel_object_id>
```

Super admins must pass `x-hotel-id` or `hotelId` query param for hotel-specific operations.

---

## Auth

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/register` | Register user |
| POST | `/auth/login` | Login, returns JWT |
| GET | `/auth/profile` | Get current user profile |

### Login Request

```json
{
  "email": "admin@hotelgrowthos.com",
  "password": "Admin@123456"
}
```

---

## Hotels

| Method | Endpoint | Roles | Description |
|--------|----------|-------|-------------|
| GET | `/hotels` | super_admin, hotel staff | List hotels |
| GET | `/hotels/:id` | super_admin, hotel staff | Get hotel |
| POST | `/hotels` | super_admin | Create hotel |
| PUT | `/hotels/:id` | super_admin, owner, manager | Update hotel |
| PATCH | `/hotels/:id/settings` | super_admin, owner, manager | Update settings |
| DELETE | `/hotels/:id` | super_admin | Soft delete |

---

## Staff

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/staff` | List staff (paginated) |
| GET | `/staff/:id` | Get staff member |
| POST | `/staff` | Add staff (creates user + HotelStaff) |
| PUT | `/staff/:id` | Update staff |
| PATCH | `/staff/:id/assign` | Assign to hotel |
| DELETE | `/staff/:id` | Deactivate staff |

Query params: `page`, `limit`, `search`, `role`, `isActive`

---

## Room Types

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/room-types` | List room types |
| GET | `/room-types/:id` | Get room type |
| POST | `/room-types` | Create room type |
| PUT | `/room-types/:id` | Update room type |
| DELETE | `/room-types/:id` | Soft delete |

---

## Rooms

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/rooms` | List rooms |
| GET | `/rooms/:id` | Get room |
| POST | `/rooms` | Create room |
| PUT | `/rooms/:id` | Update room |
| PATCH | `/rooms/:id/status` | Update status (available/occupied/maintenance/blocked) |
| DELETE | `/rooms/:id` | Soft delete |

---

## Guests

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/guests` | List guests |
| GET | `/guests/repeat` | Repeat guests |
| GET | `/guests/:id` | Get guest |
| GET | `/guests/:id/history` | Booking history |
| POST | `/guests` | Create guest |
| PUT | `/guests/:id` | Update guest |
| PATCH | `/guests/:id/visit` | Record visit |
| DELETE | `/guests/:id` | Soft delete |

---

## Enquiries

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/enquiries` | List with filters |
| GET | `/enquiries/:id` | Get enquiry |
| POST | `/enquiries` | Create enquiry |
| PUT | `/enquiries/:id` | Update enquiry |
| PATCH | `/enquiries/:id/assign` | Assign to staff |
| PATCH | `/enquiries/:id/follow-up` | Set follow-up date |
| DELETE | `/enquiries/:id` | Soft delete |

Filters: `status`, `source`, `followUpDue`, `assignedTo`

Sources: `whatsapp`, `phone`, `website`, `walk_in`, `instagram`, `facebook`

---

## Bookings

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/bookings` | List bookings |
| GET | `/bookings/calendar` | Calendar view |
| GET | `/bookings/available-rooms` | Check availability |
| GET | `/bookings/:id` | Get booking |
| POST | `/bookings` | Create booking |
| PUT | `/bookings/:id` | Update booking |
| PATCH | `/bookings/:id/status` | Update status |
| PATCH | `/bookings/:id/rooms` | Assign rooms |
| DELETE | `/bookings/:id` | Cancel booking |

---

## Payments

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/payments` | List payments |
| GET | `/payments/pending` | Pending payment report |
| GET | `/payments/history/:bookingId` | Payment history |
| GET | `/payments/:id` | Get payment |
| POST | `/payments/cash` | Record cash payment |
| POST | `/payments/upi` | Record UPI payment |
| POST | `/payments/razorpay/order` | Create Razorpay order |
| POST | `/payments/razorpay/verify` | Verify Razorpay payment |

---

## Reviews

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/reviews` | List reviews |
| GET | `/reviews/:id` | Get review |
| GET | `/reviews/public/:id` | Public review form data |
| POST | `/reviews/request` | Send review request |
| POST | `/reviews/:id/submit` | Submit rating (staff) |
| POST | `/reviews/public/:id/submit` | Guest submit (no auth) |

Positive ratings (≥4) return Google review link. Negative ratings notify managers.

---

## Campaigns

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/campaigns` | List campaigns |
| GET | `/campaigns/:id` | Get campaign |
| GET | `/campaigns/:id/stats` | Campaign stats |
| POST | `/campaigns` | Create campaign |
| PATCH | `/campaigns/:id` | Update campaign |
| POST | `/campaigns/:id/launch` | Launch campaign |
| DELETE | `/campaigns/:id` | Soft delete |

Types: `old_guests`, `festival_offer`, `weekend_offer`, `birthday_offer`

---

## WhatsApp

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/whatsapp/webhook` | No | Meta webhook verification |
| POST | `/whatsapp/webhook?hotelId=` | No | Incoming messages |
| GET | `/whatsapp/messages` | Yes | List messages |
| GET | `/whatsapp/messages/:phone` | Yes | Conversation thread |
| POST | `/whatsapp/send` | Yes | Send message |

---

## Corporate Leads

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/corporate-leads` | List |
| GET | `/corporate-leads/:id` | Get |
| POST | `/corporate-leads` | Create |
| PUT | `/corporate-leads/:id` | Update |
| PATCH | `/corporate-leads/:id/assign` | Assign staff |
| PATCH | `/corporate-leads/:id/follow-up` | Set follow-up |
| DELETE | `/corporate-leads/:id` | Soft delete |

---

## Event Leads

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/event-leads` | List |
| GET | `/event-leads/reminders/due` | Due reminders |
| GET | `/event-leads/:id` | Get |
| POST | `/event-leads` | Create |
| PUT | `/event-leads/:id` | Update |
| PATCH | `/event-leads/:id/follow-up` | Set follow-up |
| PATCH | `/event-leads/:id/reminder` | Set reminder |
| DELETE | `/event-leads/:id` | Soft delete |

---

## Dashboard

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/dashboard` | All metrics summary |
| GET | `/dashboard/today-enquiries` | Today's enquiries |
| GET | `/dashboard/today-bookings` | Today's bookings |
| GET | `/dashboard/occupancy` | Occupancy percentage |
| GET | `/dashboard/monthly-revenue` | Monthly revenue |
| GET | `/dashboard/pending-payments` | Pending payments |
| GET | `/dashboard/reviews-collected` | Reviews collected |
| GET | `/dashboard/lost-enquiries` | Lost enquiries |
| GET | `/dashboard/repeat-guests` | Repeat guests |

---

## Reports

All reports accept `?from=YYYY-MM-DD&to=YYYY-MM-DD`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/reports/revenue` | Revenue report |
| GET | `/reports/bookings` | Booking report |
| GET | `/reports/enquiry-conversion` | Enquiry conversion |
| GET | `/reports/staff-performance` | Staff performance |
| GET | `/reports/campaigns` | Campaign report |
| GET | `/reports/payments` | Payment report |

---

## Notifications & Tasks

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/notifications` | List notifications |
| PATCH | `/notifications/read` | Mark all read |
| PATCH | `/notifications/:id/read` | Mark one read |
| GET | `/tasks` | List tasks |
| POST | `/tasks` | Create task |
| PUT | `/tasks/:id` | Update task |
| DELETE | `/tasks/:id` | Delete task |

---

## Pagination

List endpoints support:

```
?page=1&limit=10&search=keyword&sortBy=createdAt&sortOrder=desc
```

Response format:

```json
{
  "success": true,
  "data": {
    "data": [],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 100,
      "totalPages": 10
    }
  }
}
```

## Error Response

```json
{
  "success": false,
  "error": "Error message"
}
```
