# SHARED FARM — QA TEST REPORT (PERSON 3)

> **Test Suite:** Person 3 Integration, Security & Functional QA  
> **Framework:** Vitest v3.2.7 + Supertest v7.0.0  
> **Test File:** `backend/src/tests/person3.test.ts`  
> **Total Automated Tests:** 17  
> **Passing:** 17 (100%)  
> **Failing:** 0  

---

## 1. Automated Test Execution Results

```text
 ✓ src/tests/person3.test.ts (17 tests) 940ms
   ✓ Module A: Rental Sessions & Telemetry Tracking
     ✓ should start rental session for confirmed booking and activate tracking (67ms)
     ✓ should reject starting rental session if booking is not confirmed (54ms)
     ✓ should reject start request from unauthorized user (ownership check) (52ms)
     ✓ should record location telemetry points for active session (54ms)
     ✓ should retrieve latest location and verify privacy protection (55ms)
     ✓ should end rental session and stop active tracking (53ms)
   ✓ Module B: Razorpay Payments & Verification
     ✓ should create payment order with authoritative backend amount (54ms)
     ✓ should verify payment with valid cryptographic signature and confirm booking (53ms)
     ✓ should reject payment with invalid signature (55ms)
     ✓ should handle repeated verification calls idempotently without duplicate status transitions (53ms)
   ✓ Module C: In-app Notifications
     ✓ should list notifications and unread count for user (56ms)
     ✓ should mark notification as read and decrement unread count (56ms)
   ✓ Module D: Reviews & Ratings
     ✓ should allow renter to review completed rental (54ms)
     ✓ should reject review if rental is not yet completed (55ms)
     ✓ should prevent duplicate reviews for the same booking and reviewer (55ms)
     ✓ should validate rating range (reject < 1 or > 5) (55ms)
     ✓ should fetch equipment reviews with aggregate ratings (57ms)

 Test Files  1 passed (1)
      Tests  17 passed (17)
   Duration  1.43s
```

---

## 2. Test Case Breakdown Matrix

| Test ID | Module | Scenario | Expected Outcome | Result |
|---|---|---|---|---|
| **TC-TRK-01** | Tracking | Start rental session on confirmed booking | Creates session, status `in_progress`, emits owner notification | **PASS** |
| **TC-TRK-02** | Tracking | Start session on unconfirmed booking (`accepted`) | Returns HTTP 400 with descriptive error | **PASS** |
| **TC-TRK-03** | Tracking | Start session by unauthorized stranger | Returns HTTP 403 Forbidden | **PASS** |
| **TC-TRK-04** | Tracking | Ingest GPS waypoint during active session | Returns HTTP 201 Created with point data | **PASS** |
| **TC-TRK-05** | Tracking | Query latest location as authorized participant | Returns latest coordinates, timestamp, and stale status | **PASS** |
| **TC-TRK-06** | Tracking | Query latest location as unauthorized outsider | Returns HTTP 403 Forbidden (privacy verified) | **PASS** |
| **TC-TRK-07** | Tracking | End rental session and attempt new GPS point | Transitions to `completed`, rejects post-session updates with HTTP 400 | **PASS** |
| **TC-PAY-01** | Payments | Create Razorpay order | Backend computes authoritative price in paise, never trusting client | **PASS** |
| **TC-PAY-02** | Payments | Verify valid HMAC SHA-256 signature | Updates payment to `captured`, transitions booking to `confirmed` | **PASS** |
| **TC-PAY-03** | Payments | Verify invalid forged signature | Returns HTTP 400 Bad Request, marks payment failed | **PASS** |
| **TC-PAY-04** | Payments | Duplicate / repeated verification calls | Idempotent handler returns existing captured payment without duplicate status transitions | **PASS** |
| **TC-NOT-01** | Notifications | Retrieve user notification inbox | Returns array of user-specific notifications and unread counter | **PASS** |
| **TC-NOT-02** | Notifications | Mark single notification as read | Sets `is_read: true`, decrements unread counter | **PASS** |
| **TC-REV-01** | Reviews | Submit review for completed booking | Creates review, updates equipment aggregate rating | **PASS** |
| **TC-REV-02** | Reviews | Submit review for active/uncompleted booking | Returns HTTP 400 Prohibiting review before rental completion | **PASS** |
| **TC-REV-03** | Reviews | Attempt duplicate review by same reviewer | Returns HTTP 409 Conflict | **PASS** |
| **TC-REV-04** | Reviews | Submit invalid rating (e.g. 6 stars) | Returns HTTP 400 validation error | **PASS** |

---

## 3. Manual Verification Checklist

- [x] **Browser UI Delivery:** Responsive Tailwind interface with high-contrast emerald & dark slate theme.
- [x] **Leaflet Map Rendering:** Interactive OpenStreetMap canvas, custom tractor icon, live pulsing ring, and breadcrumb polyline.
- [x] **Simulated GPS Movement:** Waypoint step button and auto-pulse timer (3.5s interval) moving the tractor across the Nashik field plot.
- [x] **Clear Simulation Labelling:** Clear badge "SIMULATED GPS DEMO" displayed at all times on the map HUD.
- [x] **Role Persona Switching:** Instant header dropdown switching between Amit Patel (Renter), Rahul Sharma (Owner), and Admin.
- [x] **Razorpay Sandbox Flow:** Order initialization card with authoritative cost breakdown, test capture simulator, and verified receipt card.
- [x] **In-App Notification Drawer:** Real-time bell icon badge and drawer showing event history.
- [x] **Review Submission:** Star rating widget and feedback form, displaying aggregate score on equipment details.
