# SHARED FARM — PERSON 3 STUDENT PRESENTATION MANUAL
## Equipment Tracking, Rental Sessions, Razorpay Payments, Notifications, Reviews & QA

> **Author:** Person 3 (Full-Stack Engineer: Tracking, Payments, Notifications & QA)  
> **Project:** Shared Farm — Peer-to-Peer Agricultural Equipment Sharing & Booking Platform  
> **Platform Core Concept:** One unified account for every user; farmers can rent machinery (My Rentals) and list machinery (My Equipment) without separate account roles.

---

## 1. Executive Summary: What Person 3 Built

As **Person 3**, my primary responsibility was architecting and delivering the mission-critical operational, financial, and feedback subsystems:

1. **Rental Sessions & GPS Telemetry Subsystem (Module A):**
   - Implemented state-machine-gated rental sessions (`Start Rental` / `End Rental`).
   - Built a high-frequency telemetry ingestion engine storing latitude, longitude, speed, heading, ping time, and source.
   - Engineered an interactive Leaflet + OpenStreetMap tracking interface with dynamic tractor marker, animated pulse HUD, stale telemetry warnings, and historical breadcrumb route polyline.
   - Designed a clear, ethical **Simulated GPS Engine** that moves machinery through realistic farm coordinates in Nashik without fabricating real-time hardware claims.
   - Enforced strict privacy access controls: only the verified renter, equipment owner, or admin can query high-precision coordinates. Public marketplace listings show only approximate region names.

2. **Razorpay Payment Gateway & Cryptographic Verification (Module B):**
   - Authoritative backend pricing: price is calculated exclusively from the database schedule, hourly rate, and platform fee—never trusting client-supplied values.
   - HMAC SHA-256 signature verification matching Razorpay's official cryptographic specification.
   - Idempotent transaction processing to guarantee that duplicate webhook deliveries or repeated verification calls cannot trigger repeated status transitions or duplicate financial records.
   - Strict security: no CVV, card numbers, or private keys are ever handled on the frontend or committed to source control.

3. **In-App Notification Engine (Module C):**
   - Event-driven notifications triggered automatically on booking requests, payment successes/failures, rental starts, and rental completions.
   - Real-time unread badges, mark-as-read, and mark-all-read operations.

4. **Two-Sided Verified Reviews (Module D):**
   - Integrity-enforced reviews: reviews unlock only after the rental is formally completed.
   - Double-review prevention constraint: uniquely indexes `(booking_id, reviewer_id)` to ensure no user can submit duplicate reviews for the same booking.
   - Live recalculation of equipment aggregate score (`rating_avg`) and review count.

5. **Automated QA & Integration Test Suite (Module E):**
   - 17/17 automated integration tests with 100% pass rate covering authorization checks, signature verification, duplicate events, stale warnings, and rating validations.

---

## 2. Architecture & Database Relational Model

```text
       +-------------------+             +-----------------------+
       |       users       |             |  equipment_categories |
       +-------------------+             +-----------------------+
                 |                                   |
                 v 1:N                               v 1:N
       +-------------------+             +-----------------------+
       |     equipment     |<------------|       equipment       |
       +-------------------+             +-----------------------+
                 |                                   |
                 v 1:N                               v 1:N
       +---------------------------------------------------------+
       |                        bookings                         |
       +---------------------------------------------------------+
                 | 1:N                  | 1:N              | 1:N
                 v                      v                  v
       +------------------+    +----------------+    +-----------+
       | rental_sessions  |    |    payments    |    |  reviews  |
       +------------------+    +----------------+    +-----------+
                 | 1:N
                 v
       +--------------------+
       | equipment_tracking |
       +--------------------+
```

### Key Schemas Implemented
- `rental_sessions`: `(id, booking_id, started_by, start_time, end_time, session_status, notes)`
- `equipment_tracking`: `(id, session_id, booking_id, latitude, longitude, source, speed_kmh, heading_deg, recorded_at)`
- `payments`: `(id, booking_id, user_id, razorpay_order_id, razorpay_payment_id, razorpay_signature, amount, currency, status, idempotency_key)`
- `notifications`: `(id, user_id, title, message, type, reference_id, reference_type, is_read, created_at)`
- `reviews`: `(id, booking_id, equipment_id, reviewer_id, reviewee_id, rating, comment, review_type, created_at)`

---

## 3. Step-by-Step Demonstration Script (For College / Examiner Presentation)

When presenting your contribution to professors, reviewers, or team members, follow this exact 5-minute walkthrough:

### Step 1: Persona Switching & Unified Account Principle
1. Point to the top-right **Active Persona** selector.
2. Explain: *"In Shared Farm, every user has one unified account. Amit Patel is currently our active renter, and Rahul Sharma is our equipment owner. We can seamlessly test both perspectives."*

### Step 2: Live Equipment Tracking & Simulated GPS (Tab 1)
1. Navigate to **Tab 1: Equipment Tracking & GPS**.
2. Point to the Leaflet map showing Rahul's Mahindra 575 DI tractor in Dindori, Nashik.
3. Show the **Start Rental Session** button:
   - Click it.
   - Observe the session status badge transition to **● ACTIVE SESSION**.
   - Notice the green ping animation on the tractor marker and the notification indicator in the header.
4. Show the **Simulated GPS Engine**:
   - Click **Simulate Step Forward** or toggle **Start Auto GPS Pulse**.
   - Observe the tractor moving along the field waypoints, updating ground speed (e.g. 12.0 km/h), heading (45°), and drawing the dotted green historical polyline on the Leaflet map.
   - Explain to the examiner: *"We clearly label this as SIMULATED GPS DEMO because physical IoT GPS hardware is not connected. We never claim simulated coordinates are real hardware data."*
5. Show the **Privacy Notice**:
   - Explain: *"Notice that only Amit (renter) and Rahul (owner) can see these coordinates. If another user attempts to query `/api/tracking/bookings/:id/latest`, our backend returns HTTP 403 Forbidden."*
6. Click **End Rental & Stop Tracking**:
   - Notice that the session terminates, status becomes **✓ RENTAL COMPLETED**, and any subsequent location updates are rejected by the backend.

### Step 3: Razorpay Payment Sandbox & Cryptographic Verification (Tab 2)
1. Navigate to **Tab 2: Razorpay Payments**.
2. Show the **Authoritative Booking Cost Breakdown**:
   - Explain: *"The backend calculates the total amount (₹3,780.00 for 4 hours) directly from the database. The frontend cannot manipulate the price."*
3. Click **Create Secure Razorpay Order**:
   - Show the generated Razorpay order ID (e.g., `order_xxxx`).
4. Click **Simulate Razorpay Test Payment & Verify Signature**:
   - Explain: *"Our backend verifies the payment signature using HMAC SHA-256 with the Razorpay key secret. Once verified, the booking transitions to 'confirmed' and notifications are dispatched."*
5. Show **Idempotency**:
   - Explain: *"If a webhook or user resubmits the verification, our backend detects that the payment is already captured and returns success without duplicate status transitions or financial errors."*

### Step 4: Verified Reviews & Ratings (Tab 3)
1. Navigate to **Tab 3: Verified Reviews**.
2. Show the **Booking Validation Rule**:
   - Explain: *"If a booking is still pending or active, our form prohibits reviews. Reviews only unlock after the rental is formally completed."*
3. Fill out the rating (e.g. 5 Stars) and write feedback:
   - Submit the review.
   - Show the aggregate score recalculate in real-time (`4.9 ★`) and display the verified renter badge.
   - Attempting to submit another review for the same booking triggers a duplicate rejection alert (HTTP 409).

### Step 5: In-App Notifications (Bell Icon)
1. Click the **Bell Icon** in the top navigation.
2. Point to the notification history:
   - "Rental Session Started"
   - "Payment Successful"
   - "Rental Session Completed"
3. Click **Mark all read** to demonstrate real-time unread counter decrement.

---

## 4. Running the Project Locally

### 1. Backend Server
```bash
cd backend
npm install
npm run dev
# Server starts at http://localhost:5001
# Health check at http://localhost:5001/api/health
```

### 2. Frontend Application
```bash
cd frontend
npm install
npm run dev
# Client starts at http://127.0.0.1:3000
```

### 3. Automated QA Integration Tests
```bash
cd backend
npm test
# Executes all 17 automated tests with Vitest and Supertest
```

---

## 5. Defense: Common Viva / Interview Questions & Answers

**Q1: How do you prevent users from spoofing the payment amount?**  
*Answer:* The client never sends a payment amount. The client only provides the `bookingId`. The backend retrieves the authoritative hourly rate, reserved hours, and platform fee from the database, computes the price in paise, and requests the order directly from Razorpay.

**Q2: How is Razorpay payment verified?**  
*Answer:* Using cryptographic HMAC SHA-256. We take `order_id + "|" + payment_id` and sign it with `RAZORPAY_KEY_SECRET`. The resulting hexadecimal digest must match `razorpay_signature`.

**Q3: How do you protect user privacy regarding equipment locations?**  
*Answer:* We separate public marketplace catalog data from active rental telemetry. Public listings only display an approximate location name (e.g., "Dindori, Nashik"). Exact latitude and longitude coordinates are only accessible via authenticated endpoints that verify the caller is either the booking renter, the equipment owner, or an administrator.

**Q4: What is idempotency and why did you implement it?**  
*Answer:* Payment gateways like Razorpay often retry webhook deliveries if their server does not receive an immediate response. Idempotency ensures that processing the same transaction ID multiple times produces the exact same outcome without creating duplicate payment rows or triggering repeated state changes.

**Q5: What happens if GPS hardware is offline or lost signal?**  
*Answer:* Our backend tracks `recorded_at` timestamps. If the elapsed time exceeds 5 minutes (`TRACKING_STALE_THRESHOLD_MINUTES`), our frontend flags a **Stale Location Warning** banner on the map HUD alerting both participants.
