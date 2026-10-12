# Shared Farm — Person 3 API Documentation

This document specifies the REST API contracts, authentication requirements, request parameters, validation rules, and response payloads for **Person 3's subsystems**:
- **Module A: Rental Sessions & Equipment Tracking**
- **Module B: Razorpay Payments & Webhook Verification**
- **Module C: In-App Notifications**
- **Module D: Verified Reviews & Ratings**

---

## Authentication & Authorization Model

All protected endpoints require an `Authorization` header containing a valid Bearer token:
```http
Authorization: Bearer <jwt_token>
```
During local testing and peer demonstration, the backend also supports role testing using the header:
```http
x-demo-user-id: user_amit   # Amit Patel (Renter)
x-demo-user-id: user_rahul  # Rahul Sharma (Equipment Owner)
x-demo-user-id: user_admin  # Administrator
```

### Authorization Rules
1. **Rental Sessions & Tracking:** Only the booking's `renter_id`, the equipment's `owner_id`, or an administrator can access or control telemetry. Public marketplace listings never expose live coordinates.
2. **Payments:** Only the verified booking renter can create an order or submit verification.
3. **Reviews:** Only participants of a strictly **completed** rental can review each other. Duplicate reviews for the same booking are rejected (HTTP 409).

---

## Module A: Rental Sessions & Equipment Tracking

### 1. Start Rental Session
- **Endpoint:** `POST /api/rental-sessions/:bookingId/start`
- **Auth Required:** Yes (Renter or Owner)
- **Preconditions:** Booking status must be `confirmed` or `in_progress`. No other active session may exist.
- **Request Body:**
  ```json
  {
    "notes": "Starting early morning plowing"
  }
  ```
- **Response (201 Created):**
  ```json
  {
    "success": true,
    "message": "Rental session started successfully. Live tracking telemetry is now active.",
    "data": {
      "session": {
        "id": "sess_a1b2c3d4",
        "booking_id": "booking_demo_confirmed",
        "started_by": "user_amit",
        "start_time": "2026-10-12T17:00:00.000Z",
        "session_status": "active",
        "notes": "Starting early morning plowing"
      },
      "bookingStatus": "in_progress"
    }
  }
  ```

### 2. End Rental Session
- **Endpoint:** `POST /api/rental-sessions/:bookingId/end`
- **Auth Required:** Yes (Renter or Owner)
- **Preconditions:** An active rental session must exist.
- **Request Body:**
  ```json
  {
    "notes": "Work completed and equipment returned"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Rental session ended successfully. Location tracking has ceased.",
    "data": {
      "session": {
        "id": "sess_a1b2c3d4",
        "session_status": "completed",
        "end_time": "2026-10-12T21:00:00.000Z"
      },
      "bookingStatus": "completed"
    }
  }
  ```

### 3. Record Location Telemetry
- **Endpoint:** `POST /api/tracking/location`
- **Auth Required:** Yes (Authorized participant)
- **Preconditions:** Session must be in `active` state. Rejects updates if rental is completed.
- **Request Body:**
  ```json
  {
    "bookingId": "booking_demo_confirmed",
    "latitude": 20.1995,
    "longitude": 73.8355,
    "source": "simulated_gps",
    "speed_kmh": 12.5,
    "heading_deg": 45.0
  }
  ```
- **Response (201 Created):**
  ```json
  {
    "success": true,
    "message": "Telemetry point recorded successfully.",
    "data": {
      "point": {
        "id": "trk_9f8e7d6c",
        "session_id": "sess_a1b2c3d4",
        "booking_id": "booking_demo_confirmed",
        "latitude": 20.1995,
        "longitude": 73.8355,
        "source": "simulated_gps",
        "speed_kmh": 12.5,
        "heading_deg": 45,
        "recorded_at": "2026-10-12T17:05:00.000Z"
      }
    }
  }
  ```

### 4. Get Latest Location & Stale Telemetry Check
- **Endpoint:** `GET /api/tracking/bookings/:bookingId/latest`
- **Auth Required:** Yes (Renter, Owner, or Admin only. Returns 403 Forbidden for outsiders)
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "bookingId": "booking_demo_confirmed",
      "equipment": {
        "id": "eq_tractor_rahul",
        "title": "Mahindra 575 DI (45 HP Tractor)",
        "locationName": "Dindori, Nashik"
      },
      "sessionStatus": "active",
      "latestLocation": {
        "latitude": 20.1995,
        "longitude": 73.8355,
        "source": "simulated_gps",
        "speed_kmh": 12.5,
        "heading_deg": 45,
        "recorded_at": "2026-10-12T17:05:00.000Z"
      },
      "isStale": false,
      "staleMinutes": 0,
      "trackingActive": true
    }
  }
  ```

### 5. Get Route History Breadcrumbs
- **Endpoint:** `GET /api/tracking/bookings/:bookingId/history`
- **Auth Required:** Yes (Authorized participant)
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "bookingId": "booking_demo_confirmed",
      "equipmentId": "eq_tractor_rahul",
      "totalPoints": 5,
      "history": [...]
    }
  }
  ```

---

## Module B: Razorpay Payments

### 1. Create Razorpay Order
- **Endpoint:** `POST /api/payments/create-order`
- **Auth Required:** Yes (Renter only)
- **Security Rule:** Server calculates amount strictly from database `total_price` (never trusts frontend amount).
- **Request Body:**
  ```json
  {
    "bookingId": "booking_demo_accepted"
  }
  ```
- **Response (201 Created):**
  ```json
  {
    "success": true,
    "message": "Razorpay payment order created successfully.",
    "data": {
      "orderId": "order_7a9f8b1c2d3e4f",
      "amount": 378000,
      "currency": "INR",
      "amountInRupees": 3780.0,
      "keyId": "rzp_test_placeholder_key_id",
      "bookingId": "booking_demo_accepted"
    }
  }
  ```

### 2. Verify Razorpay Payment (Idempotent)
- **Endpoint:** `POST /api/payments/verify`
- **Auth Required:** Yes
- **Verification Rule:** Cryptographic HMAC SHA-256 verification of `order_id|payment_id` against `RAZORPAY_KEY_SECRET`.
- **Request Body:**
  ```json
  {
    "razorpay_order_id": "order_7a9f8b1c2d3e4f",
    "razorpay_payment_id": "pay_test_payment_12345",
    "razorpay_signature": "c8b8719f9f9b5c2a1e...",
    "is_demo_simulated": true
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Payment verified and captured successfully. Booking is now confirmed!",
    "data": {
      "payment": {
        "id": "pay_9f8e7d",
        "status": "captured",
        "razorpay_order_id": "order_7a9f8b1c2d3e4f",
        "razorpay_payment_id": "pay_test_payment_12345"
      },
      "bookingStatus": "confirmed"
    }
  }
  ```

### 3. Razorpay Webhook Handler
- **Endpoint:** `POST /api/payments/webhook`
- **Auth Required:** No (Signature verified via `x-razorpay-signature` and raw body HMAC)
- **Idempotency:** Ignores duplicate deliveries if status is already `captured`.

---

## Module C: In-App Notifications

### 1. List User Notifications
- **Endpoint:** `GET /api/notifications`
- **Auth Required:** Yes
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "notifications": [
        {
          "id": "notif_1",
          "title": "Rental Session Started",
          "message": "Your active rental session for \"Mahindra 575 DI (45 HP Tractor)\" has started.",
          "type": "rental_started",
          "is_read": false,
          "created_at": "2026-10-12T17:00:00.000Z"
        }
      ],
      "unreadCount": 1
    }
  }
  ```

### 2. Mark Notification as Read
- **Endpoint:** `PATCH /api/notifications/:id/read`
- **Auth Required:** Yes

### 3. Mark All Notifications as Read
- **Endpoint:** `PATCH /api/notifications/mark-all-read`
- **Auth Required:** Yes

---

## Module D: Verified Reviews & Ratings

### 1. Submit Review
- **Endpoint:** `POST /api/reviews`
- **Auth Required:** Yes (Participant of completed rental)
- **Preconditions:** Booking status must be `completed`. No duplicate review by the same user for this booking.
- **Request Body:**
  ```json
  {
    "bookingId": "booking_demo_completed",
    "rating": 5,
    "comment": "Outstanding tractor condition and very helpful owner!"
  }
  ```
- **Response (201 Created):**
  ```json
  {
    "success": true,
    "message": "Review submitted successfully. Thank you for your feedback!",
    "data": {
      "review": {
        "id": "rev_7c8d9e",
        "booking_id": "booking_demo_completed",
        "rating": 5,
        "comment": "Outstanding tractor condition and very helpful owner!",
        "review_type": "renter_to_owner"
      },
      "equipmentAggregate": {
        "ratingAvg": 4.9,
        "ratingCount": 6
      }
    }
  }
  ```

### 2. Get Equipment Reviews
- **Endpoint:** `GET /api/equipment/:equipmentId/reviews`
- **Auth Required:** No (Publicly viewable)
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "equipmentId": "eq_tractor_rahul",
      "ratingAvg": 4.9,
      "ratingCount": 6,
      "reviews": [...]
    }
  }
  ```
