# Shared Farm — Farm Equipment Sharing & Booking Platform

> **Tagline:** Share Equipment. Grow Together.  
> **Core model:** One account can rent equipment from others and list their own equipment for rent.

## 1. Overview

Shared Farm is a peer-to-peer agricultural equipment marketplace. Users can discover, book, share, and track farm machinery. A user can act as both a renter and an equipment provider from the same account and unified dashboard.

The platform supports tractors, harvesters, rotavators, seed drills, sprayers, cultivators, threshers, ploughs, and other agricultural equipment.

### Core journeys

- **Rent:** Search → Compare → Check availability → Book → Pay → Track authorized active rental → Complete → Review.
- **Share:** List equipment → Set price and availability → Receive request → Accept/reject → Start rental → Track equipment → Complete/return → View earnings → Review renter.

## 2. Product principles

- **One account, two capabilities:** Every user can rent and list equipment. Do not create separate Farmer and Owner account types.
- **One unified dashboard:** Separate **My Rentals** (equipment I rent) from **My Equipment** (equipment I provide).
- **Prevent double bookings:** The backend must re-check availability and prevent overlapping bookings.
- **Tracking privacy:** Only authorized participants can view equipment location during an active, approved rental. Public listings should show approximate locations only.
- **Payment security:** Verify payment results server-side. Never store card numbers or CVVs.
- **MVP first:** AI recommendations, demand prediction, smart pricing, and physical GPS/IoT hardware are future enhancements.

## 3. Main features

### Accounts and profiles
- Registration, login, logout, password recovery
- One user profile and location
- Optional farm details
- Admin permissions only; no permanent renter/provider role

### Marketplace
- Browse and search equipment
- Filter by equipment type, location, date, price, distance, rating, and operator availability
- List and map views
- Equipment details, images, specifications, provider profile, ratings, and availability
- Add, edit, pause, and deactivate personal listings

### Booking and payments
- Select date, start/end time, duration, and operator requirement
- Show a complete price breakdown before payment
- Provider accepts or rejects booking requests
- Booking history and status timeline
- Payment gateway test mode or clearly labelled demo payment
- Cancellation and refund states

### Unified dashboard
- Quick actions: **Find Equipment** and **List Equipment**
- **My Rentals:** upcoming, active, completed, cancelled
- **My Equipment:** available, reserved, in use, paused
- Unified calendar showing both rental activity and equipment supplied to others
- Earnings, payments, notifications, and messages

### Equipment tracking
- Track equipment supplied by the user
- Track a rental the user is currently using, where enabled
- Show latest location, last-updated time, tracking status, rental start/end time
- Optional route history, distance, operating hours, and alerts
- Use clearly labelled simulated GPS for the prototype if no physical tracker is available
- Never imply tracking is real unless a real location source is connected

### Trust, reviews, and administration
- Two-sided reviews after completed rentals
- User/equipment verification status
- Complaints and dispute reporting
- Admin management of users, listings, bookings, payments, complaints, and reports

### Future AI features
- Equipment recommendations based on operation, crop, farm size, budget, date, location, and availability
- Area-based demand prediction
- Optional rental-price suggestions

## 4. Recommended technology stack

- **Frontend:** React + Vite + TypeScript + Tailwind CSS
- **Backend:** Node.js + Express + TypeScript
- **Database:** PostgreSQL (Supabase-hosted PostgreSQL is an option)
- **Authentication:** Supabase Auth OR backend JWT + bcrypt; choose one approach
- **Maps:** Leaflet + OpenStreetMap for the initial prototype
- **Payments:** Razorpay test mode, added after booking works
- **Image storage:** Cloudinary or Supabase Storage
- **Testing:** Vitest/React Testing Library and a Node API test framework
- **Version control:** Git + GitHub

## 5. Main pages

### Public
- Landing page
- How it works
- Equipment marketplace
- Equipment details
- Login and registration

### Unified user area
- Dashboard
- Find equipment (list/map)
- Equipment details and availability
- Booking form, summary, payment, confirmation
- My Rentals and rental details
- My Equipment, add/edit listing
- Availability calendar
- Booking requests
- Active rental and tracking
- Unified calendar
- Earnings and payments
- Messages and notifications
- Reviews and profile

### Admin
- Admin dashboard
- User and verification management
- Equipment/listing management
- Booking and payment management
- Complaints, reviews, and analytics

## 6. Suggested database entities

| Table | Purpose |
|---|---|
| `users` | Single account for every renter/provider |
| `user_profiles` | Profile, location, optional farm details |
| `equipment_categories` | Standard equipment types |
| `equipment` | Listing, provider (`owner_id` references `users.id`), specifications, pricing, location, status |
| `equipment_images` | Equipment image URLs |
| `equipment_availability` | Working windows and blocked periods |
| `bookings` | Renter (`renter_id`), equipment, schedule, price breakdown, status |
| `payments` | Payment gateway order/payment references and status |
| `rental_sessions` | Actual start/end of a rental and tracking-session state |
| `equipment_tracking` | Timestamped location points linked to a booking/session |
| `equipment_status_history` | Audit trail of equipment status changes |
| `reviews` | Reviews linked to completed bookings |
| `notifications` | User notifications |
| `messages` | Optional renter-provider conversations |
| `complaints` | Disputes and support issues |

Suggested booking statuses: `pending`, `accepted`, `payment_pending`, `confirmed`, `in_progress`, `completed`, `rejected`, `cancelled`, `payment_failed`, `disputed`.

Suggested equipment statuses: `active`, `paused`, `reserved`, `in_use`, `maintenance`, `inactive`.

Do not rely only on a manually set availability flag. Determine bookability from listing status, calendar, and overlapping bookings according to the booking policy.

## 7. Backend API outline

```text
POST   /api/auth/register
POST   /api/auth/login
GET    /api/users/me
PATCH  /api/users/me

GET    /api/equipment
GET    /api/equipment/:id
POST   /api/equipment
PATCH  /api/equipment/:id
DELETE /api/equipment/:id
GET    /api/equipment/:id/availability
PUT    /api/equipment/:id/availability

POST   /api/bookings
GET    /api/bookings/my-rentals
GET    /api/bookings/my-equipment
GET    /api/bookings/:id
PATCH  /api/bookings/:id/status

POST   /api/payments/order
POST   /api/payments/webhook

POST   /api/rental-sessions/:bookingId/start
POST   /api/rental-sessions/:bookingId/end
GET    /api/tracking/bookings/:bookingId/latest
GET    /api/tracking/bookings/:bookingId/history
POST   /api/tracking/location

POST   /api/reviews
GET    /api/notifications
```

Every endpoint must enforce authentication and authorization. Users can edit only their own listings, view their own bookings, and access tracking only when they are an authorized participant in that rental.

## 8. Work distribution for 3 people

### Person 1 — Frontend and UI/UX
**Owns:** React/Vite frontend, design system, navigation, responsive layouts, dashboard, marketplace, listing forms, booking screens, and tracking UI.

Tasks:
- Set up frontend structure and reusable components
- Build public pages and unified dashboard
- Build search/filter, equipment cards, and map/list layouts
- Build add/edit equipment forms
- Build booking, confirmation, My Rentals, My Equipment, calendar, and profile screens
- Build tracking map and tracking states; label simulated GPS clearly
- Connect screens to the agreed API client
- Ensure mobile accessibility and loading/empty/error states

**Deliverables:** Responsive UI, reusable components, API integration, and a single dashboard supporting both renting and listing.

### Person 2 — Backend, Authentication, and Database
**Owns:** Express API, PostgreSQL schema/migrations, validation, authorization, equipment CRUD, search, availability, and booking lifecycle.

Tasks:
- Agree and document API contracts with Person 1
- Create database schema, migrations, seed/demo data, and indexes
- Implement authentication and user profile endpoints
- Implement equipment create/read/update/deactivate and search/filter endpoints
- Implement availability checks and conflict-safe booking creation
- Implement My Rentals and My Equipment endpoints
- Implement booking status transitions and server-side price calculation
- Add tests for permissions, availability, and double-booking prevention

**Deliverables:** REST API, database migrations and seed script, API documentation, and tests for core business rules.

### Person 3 — Tracking, Payments, Notifications, and QA
**Owns:** Rental tracking/session subsystem, payment gateway integration, notifications, reviews/support, end-to-end testing, and deployment coordination. Coordinate interfaces with Person 2.

Tasks:
- Design tracking/session schema with Person 2
- Implement rental start/end session workflow
- Implement location ingestion and latest/history endpoints; use simulated GPS for the demo if hardware is unavailable
- Enforce tracking access rules and stale/offline indicators
- Integrate payment gateway in test mode and verify results server-side
- Implement booking notifications and reviews, prioritizing after tracking/payment
- Create end-to-end scenarios and deployment checklist
- Test the full renter-to-provider journey and report integration bugs

**Deliverables:** Tracking workflow and UI/API integration, payment sandbox workflow, notifications/reviews as time permits, and an end-to-end test report.

### Shared responsibilities
- All three review pull requests and test their changes.
- Person 2 owns final database/API contract decisions; Person 1 owns visual consistency; Person 3 coordinates integration testing.
- Each person documents setup and environment variables for their module.
- Never commit secrets. Commit `.env.example` with placeholder values only.

## 9. Implementation milestones

1. **Plan and scaffold:** finalize stack, API contracts, schema, status enums, wireframes, repository, linting, and environment examples.
2. **Marketplace:** authentication, unified account, equipment listings/search, add/edit listing, availability calendar.
3. **Booking:** create requests, provider accepts/rejects, prevent overlaps, booking history, unified calendar.
4. **Tracking and payments:** start/end rental, simulated or real GPS, authorized map, payment test mode, notifications.
5. **Finish and demo:** reviews, loading/error/empty states, mobile polish, end-to-end tests, security review, seed data, deployment.
6. **Only after MVP is stable:** AI recommendation, demand prediction, and smart pricing.

## 10. MVP definition of done

- A user registers once and can both rent and list equipment.
- Users can create, edit, pause, and view their own equipment listings.
- Another user can search and request a booking.
- Providers can accept/reject requests.
- The backend prevents overlapping bookings.
- The same dashboard has separate My Rentals and My Equipment sections.
- A rental can be started and ended with timestamps.
- Tracking is authorized and clearly labelled simulated or real.
- Payment status is verified server-side, or demo payment mode is clearly labelled.
- Booking status and availability remain consistent.
- Mobile layouts, validation, loading, empty, and error states work.
- No secrets or payment credentials are committed to source control.

## 11. Security and privacy checklist

- Hash passwords if authentication is managed by your backend.
- Enforce server-side ownership checks for protected actions.
- Validate requests and uploaded images.
- Store keys and payment secrets in environment variables.
- Verify payment webhooks/signatures server-side.
- Use HTTPS in production and rate-limit sensitive endpoints.
- Do not publish exact live equipment coordinates in public listings.
- Start tracking only for an authorized rental and stop it when the session ends.
- Restrict tracking history to authorized participants and necessary support staff.
- Clearly label simulated tracking in the prototype.

## 12. Demo scenario

1. Rahul creates one Shared Farm account.
2. Rahul lists his tractor at ₹900/hour and sets availability.
3. Amit creates an account and books Rahul's tractor for a selected time.
4. Rahul accepts; the backend checks for schedule conflicts.
5. Amit completes the test payment flow; the booking becomes confirmed.
6. The rental starts and tracking shows the latest location (simulated if hardware is not connected).
7. The rental ends; tracking stops and the session is recorded.
8. Amit reviews the equipment/provider.
9. Rahul's dashboard shows the completed rental and earnings.
10. Rahul can still rent a harvester from another user using the same account.

## 13. Suggested repository structure

```text
shared-farm/
├── frontend/
│   └── src/{components,pages,layouts,services,hooks}/
├── backend/
│   └── src/{routes,controllers,services,middleware,validators,config}/
├── database/
│   ├── migrations/
│   └── seed/
├── docs/
│   ├── API.md
│   ├── DATABASE.md
│   └── UI-FLOWS.md
├── .env.example
├── .gitignore
└── README.md
```

## 14. Local setup

Fill in the actual commands after the stack is finalized:

1. Install a supported Node.js LTS version and PostgreSQL/Supabase project.
2. Clone the repository.
3. Install frontend and backend dependencies.
4. Copy `.env.example` to local environment files.
5. Configure database URL, authentication, image storage, maps, and payment test keys.
6. Run migrations and seed data.
7. Start backend and frontend using the commands documented in package scripts.
8. Open the frontend URL printed in the terminal.

Never commit real `.env` files.

---

**Project principle:** Build one reliable shared-equipment marketplace with one account and one dashboard first. Add real GPS/IoT and AI only after booking, availability, and rental-session workflows are correct.
