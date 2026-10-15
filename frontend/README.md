# Shared Farm — Farm Equipment Sharing & Booking Platform

> **Tagline:** Share Equipment. Grow Together.  
> **Product Architecture:** Peer-to-peer agricultural equipment rental marketplace with a **single unified user account** (every farmer can both rent machinery and list their own equipment).

---

## 🌾 Project Overview

**Shared Farm** is an agricultural technology platform designed to help rural farming communities maximize machinery utilization, eliminate redundant capital debt, and access modern implements (tractors, harvesters, rotavators, seed drills, sprayers) at fair hourly rates.

This frontend repository represents the Person 1 deliverable in a three-person team (Person 1: Frontend Engineer & UI/UX; Person 2: Backend Developer; Person 3: QA & Documentation).

---

## 🛠 Technology Stack

- **Core & Build:** React 19, TypeScript, Vite
- **Styling & UI Tokens:** Tailwind CSS, Lucide React icons, Plus Jakarta Sans (Headings), Inter (Body)
- **Routing & State:** React Router DOM (v7), TanStack Query (v5), Custom Auth Context
- **Forms & Validation:** React Hook Form, Zod schema validation
- **Maps & Geospatial:** React Leaflet & OpenStreetMap (approximate location masking for privacy)
- **Analytics & Visuals:** Recharts, custom gauge cards
- **Notifications:** Sonner toasts
- **Testing:** Vitest, Testing Library, JSDOM

---

## 🚀 Quick Start & Installation

### 1. Prerequisites
- Node.js (v18+)
- npm (v9+)

### 2. Setup
```bash
# Clone or navigate to the workspace
cd "Shared Equipment"

# Install all dependencies
npm install

# Copy environment variables
cp .env.example .env

# Run unit tests
npm test

# Start the local development server
npm run dev
```

The application will be running at `http://localhost:5173`.

---

## 📱 Completed Pages & Features

### 1. Public Marketplace & Landing
- **Landing Page (`/`):**
  - Hero search with location, machinery type, and date inputs (navigates to `/equipment` with preserved query parameters).
  - 8 Agricultural machinery category cards (Tractors, Harvesters, Rotavators, Seed Drills, Sprayers, Cultivators, Threshers, Ploughs).
  - Featured verified equipment cards with rates, ratings, and status badges.
  - "How It Works" 4-step workflow.
  - Dual prominent paths: *"Need Equipment?"* vs. *"Have Equipment to Share?"*.
  - Value propositions, safety escrow guarantees, and illustrative testimonials.
- **Authentication Pages:**
  - Login (`/login`) with 1-click demo login option.
  - Register (`/register`) with **single unified farmer account** (no permanent role bifurcation).
  - Forgot Password (`/forgot-password`).
- **Equipment Marketplace (`/equipment`):**
  - Keyword search, location filter, category filters, hourly price range slider, operator availability toggle, rating filter, and sorting.
  - Grid vs. list layout toggle.
  - **Leaflet Map vs. Listings view toggle** with custom agricultural pins and popups.
  - Responsive mobile filter drawer.
- **Equipment Details (`/equipment/:id`):**
  - Photo gallery with thumbnail selector.
  - Technical specifications table (make, model, HP, hydraulics, condition).
  - Verified provider card with farmer rating and response time.
  - Dynamic transparent price calculator (hours * rate + driver fee + 4% escrow fee + refundable security deposit).
  - Booking request initiation leading to checkout.
  - Verified farmer reviews and similar machinery recommendations.
- **Booking & Checkout:**
  - Summary (`/booking/:id`): Itemized escrow breakdown and cancellation policy.
  - Payment (`/booking/:id/payment`): Simulated sandbox gateway (UPI, Net Banking, Test Card) with strict PCI-compliance adherence (no real card numbers collected).
  - Confirmation (`/booking/:id/confirmation`): Unique transaction reference and direct jump to live tracking.

### 2. Unified Farmer Dashboard (Single Account)
- **Overview (`/dashboard`):**
  - Personalized greeting with Indian locale date.
  - Two equally prominent quick actions: **Find Equipment** (Rent) and **List Equipment** (Share).
  - 4 Summary cards: Active Rentals, Listed Machinery, Pending Requests, Net Earnings.
  - Activity feeds: Upcoming rentals, incoming requests, and urgent in-field alerts.
  - Recharts monthly utilization vs. earnings chart.
- **My Rentals (`/dashboard/rentals`):**
  - Tabs: All, Active, Upcoming, Completed, Cancelled.
  - Booking timeline tracker.
  - Contextual actions: Live GPS tracking, Complete Rental, Cancel Booking (with refund), Write Verified Review.
- **My Equipment (`/dashboard/equipment`):**
  - Grid and table view toggle.
  - Status indicators (Available, In-use, Paused, Maintenance).
  - Edit listing, Pause/Reactivate, and Deactivate/Delete (with protection against deactivating machinery with active bookings).
- **Add / Edit Equipment (`/dashboard/equipment/new`, `/dashboard/equipment/:id/edit`):**
  - Multi-section validated form: Basic info, photos manager with previews, rates & driver policy, approximate location.
- **Booking Requests (`/dashboard/requests`):**
  - Incoming requests from other farmers for user's listed equipment.
  - Renter contact details, requested hours, operator requirement, price breakdown.
  - Accept and Decline (with reason dialog).
- **Unified Calendar (`/dashboard/calendar`):**
  - Shows both rentals made (I am renting) and bookings received (someone renting my machinery) in one calendar with distinctive color codes and legend.
- **Live Rental Tracking (`/dashboard/tracking`, `/dashboard/tracking/:bookingId`):**
  - Clearly labelled **SIMULATED GPS TELEMETRY** dashboard.
  - Real-time gauges: Field Speed (km/h), Fuel Level (%), Battery Health (V), Engine State (Running/Idle).
  - Interactive Leaflet map with live tractor marker and farm parcel boundary.
- **Earnings & Payouts (`/dashboard/earnings`):**
  - Financial ledger distinguishing Gross Revenue, Escrow Platform Fees (4%), and Net Farmer Payouts.
  - Weekly bank payout status (SBI Account linked).
  - Tax statement download simulation.
- **Messages (`/dashboard/messages`):**
  - Reactive conversation list and live chat interface between farmers.
- **Notifications (`/dashboard/notifications`):**
  - Categorized alerts with mark-as-read and direct action links.
- **Profile & Farm Settings (`/dashboard/profile`):**
  - Land holding acreage, primary crops grown, village/district, preferred language selector.
- **Admin Console Preview (`/admin`):**
  - Platform overview metrics and machinery listing verification queue.

---

## 🔌 API Contracts & Coordination with Person 2

The frontend includes a centralized Axios client (`src/services/api.ts`) pointing to `VITE_API_BASE_URL`.

### Core Contracts Defined:
| Endpoint | Method | Description |
|---|---|---|
| `/auth/login` | POST | Authenticate user; returns `{ token, user }` |
| `/auth/register` | POST | Register general user account; returns `{ token, user }` |
| `/auth/me` | GET | Retrieve authenticated profile |
| `/equipment` | GET | Query machinery with filters (`category`, `minPrice`, `maxPrice`, `search`, `location`, `operatorAvailable`) |
| `/equipment/:id` | GET | Retrieve listing details, specifications, and owner profile |
| `/equipment` | POST | Create new equipment listing |
| `/equipment/:id` | PUT / PATCH | Update listing details or status |
| `/equipment/:id` | DELETE | Delete listing (blocked if active bookings exist) |
| `/bookings` | POST | Submit booking request |
| `/bookings/my-rentals` | GET | Bookings where current user is renter |
| `/bookings/incoming-requests`| GET | Bookings where current user is owner |
| `/bookings/:id/accept` | PATCH | Owner accepts incoming request |
| `/bookings/:id/reject` | PATCH | Owner declines request |
| `/bookings/:id/start` | PATCH | Rental session begins |
| `/bookings/:id/end` | PATCH | Rental session completes |
| `/payments/:bookingId/charge`| POST | Escrow payment authorization |
| `/tracking/:bookingId` | GET | Telemetry data (`lat`, `lng`, `speedKmph`, `fuelLevelPercent`, `engineStatus`) |

---

## 🔒 Security & Privacy Practices

1. **Approximate Location Display:** Exact GPS coordinates of machinery owners are never exposed publicly. Public listings display only the village/district name and jittered centroid coordinates. Exact field directions are unlocked only after booking confirmation.
2. **Escrow & Safe Payments:** No raw credit card numbers or CVVs are ever captured or stored.
3. **Protected Routes:** All dashboard endpoints are wrapped in `ProtectedRoute`, checking authentication state and server-provided role permissions.
4. **Single Unified Account:** Prevents artificial friction by allowing every user to rent machinery and list their own machinery interchangeably under a single login.

---

## 🧪 Testing

Run the automated test suite:
```bash
npm test
```
The test suite validates:
- Marketplace search and category filtering logic
- Single unified farmer account architecture
- Booking lifecycle and state transitions
- Currency formatting and calculation utilities

---

## 👥 Integrations Requiring Backend Credentials

When deploying with Person 2's live backend:
1. **SMS / WhatsApp Gateway:** For instant OTP login and booking notification dispatch (e.g. Twilio, MSG91).
2. **Payment Gateway:** Escrow payment and automated UPI/bank payouts (e.g. Razorpay Route, Cashfree Escrow).
3. **Cloud Object Storage:** S3 / Cloud Storage bucket with pre-signed URLs for machinery image uploads.
4. **IoT / GPS Hardware Webhook:** MQTT or HTTP ingestion endpoint for physical tractor GPS trackers.
