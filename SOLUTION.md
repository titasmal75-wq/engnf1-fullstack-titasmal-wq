# TriageSync — Technical Solution

**Repository:** https://github.com/titasmal75-wq/engnf1-fullstack-titasmal-wq  
**Live demo:** http://54.91.207.53/  
**Stack:** React, Vite, Node.js, Express, MongoDB, Mongoose

This document explains the ticket-import flow, review rules, booking concurrency design, idempotent re-import behavior, and the measured ticket-list optimization.

---

# Part A — Architecture, imported-ticket flow, and “reviewed” definition

## A.1 Architecture

```text
                 External ticket source
                           |
                           | Authenticated POST /api/tickets/import
                           v
              +-----------------------------+
              | Express application         |
              | backend/app.js              |
              | mounts /api/tickets         |
              | and /api/stats              |
              +--------------+--------------+
                             |
                             v
              +-----------------------------+
              | backend/router/ticketRoutes.js
              | authMiddleware               |
              +--------------+--------------+
                             |
                 +-----------+------------+
                 |                        |
                 v                        v
          importTickets()             getTickets()
                 |                        ^
        validateTicket()                  |
                 |                GET /api/tickets
         classifyTicket()                 |
                 |                        |
                 v                        |
          Ticket.findOne()                 |
          by externalId                   |
                 |                        |
       +---------+----------+             |
       |                    |             |
       v                    v             |
   New ticket          Existing ticket    |
   Ticket.create()     update same doc    |
       |              preserve override   |
       +---------+----------+             |
                 |                        |
                 v                        |
        +---------------------+           |
        | MongoDB             |-----------+
        | Ticket documents    |  ticket list JSON
        | TicketEvent records |           |
        +----------+----------+           |
                   |                      |
                   v                      |
          getTicketStats()                |
          GET /api/stats                  |
                   |                      |
                   +----------+-----------+
                              |
                              v
                 +------------------------+
                 | React + Vite frontend  |
                 | Axios API client       |
                 | TriageSync dashboard   |
                 | ticket list and stats  |
                 +------------------------+
```

The frontend communicates with the Express REST API over HTTP and sends the access token for protected routes. Express delegates requests to routers, middleware, and controller functions. Mongoose reads and writes the ticket documents in MongoDB. The frontend receives JSON from the ticket-list and statistics endpoints and renders the queue and its summary metrics.

## A.2 Function-by-function trace: imported ticket to dashboard

1. **Import request:** The import client sends a request to `POST /api/tickets/import`. The current controller expects the request body to contain a non-empty `tickets` array: `{ "tickets": [{ "externalId": "...", "subject": "...", "body": "..." }] }`.
2. **Express route:** `backend/app.js` mounts `ticketRoutes` at `/api/tickets`. In `backend/router/ticketRoutes.js`, `router.post("/import", authMiddleware, importTickets)` protects the import endpoint and forwards the request to `importTickets()`.
3. **Input validation:** `importTickets()` in `backend/controller/ticketController.js` checks the array, validates the `externalId`, and calls `validateTicket()` from `backend/validators/ticketValidator.js` to validate the subject and body.
4. **Automatic classification:** The controller calls `classifyTicket(subject.trim(), body.trim())` from `backend/services/ticketClassifier.js`. The classifier lowercases the combined subject/body and assigns a category and priority from deterministic keyword rules. The default category is `FEATURE_REQUEST`; the default priority is `MEDIUM`.
5. **Existing-ticket lookup:** `importTickets()` calls `Ticket.findOne({ externalId })` using the trimmed external ID.
   - **New ID:** If no matching document exists, the controller calls `Ticket.create()` with the subject, body, predicted category/priority, `status: "OPEN"`, `isReviewed: false`, and `isHumanOverride: false`.
   - **Existing ID:** If a document already exists, the controller updates its subject and body instead of creating a second ticket. When `isHumanOverride` is false, it updates the category and priority from the new classifier result. When `isHumanOverride` is true, it preserves the agent's category and priority.
6. **Persistence and response:** The controller saves an updated document with `existing.save()` or inserts a new one with `Ticket.create()`. It returns import counters (`importedCount`, `updatedCount`, `skippedOverrideCount`, and `total`).
7. **Ticket-list query:** The dashboard obtains ticket rows from `GET /api/tickets`. The route calls `getTickets()` in `ticketController.js`. That function combines the requested status/category/priority filters and text search, sorts by newest `createdAt`, applies pagination, and returns the ticket rows and pagination metadata.
8. **Dashboard statistics:** The frontend can obtain ticket totals and category/priority/status counts from `GET /api/stats`. `backend/router/statsRoutes.js` maps this endpoint to `getTicketStats()` in `backend/controller/statsController.js`. That function also calculates the reviewed-ticket count and model-agreement rate.
9. **Rendering:** The React frontend receives the ticket-list and statistics JSON responses through its Axios API client and displays ticket information and summary metrics in the TriageSync dashboard.

## A.3 Definition of “reviewed”

A ticket is considered **reviewed** when an agent makes one of these changes through the ticket update endpoint:

- Changes the ticket's `category`; or
- Changes the ticket's `status` from `OPEN` to another status.

In `updateTicket()`, `isReviewed` becomes `true` when either condition is met. A newly imported ticket starts with `isReviewed: false`. A priority-only or assignee-only change does not, by itself, mark the ticket as reviewed. A request that makes no actual field change also does not create a new review action.

`isReviewed` and `isHumanOverride` represent different things. `isReviewed` records that an agent has taken a review action. `isHumanOverride` is set only when an agent actually changes the category, and is used by the import process to protect agent-entered category values from later automatic classification.

---

# Part B — Concurrency (B6) and idempotent human-override protection (T-B2)

## B.1 B6 — Race-safe booking creation

`createBooking()` in `backend/services/bookingService.js` performs the booking operation inside a MongoDB session and `session.withTransaction()`.

Inside that transaction, the service:

1. Updates the selected resource document with `$inc: { bookingLockVersion: 1 }` using `Resource.findOneAndUpdate()` and the same session. This write acts as a per-resource serialization point: simultaneous transactions for the same resource contend on the same resource document.
2. Checks that the resource exists and is active.
3. If a `ticketId` was supplied, checks the linked ticket in the same session and verifies that it may be linked by the requesting user.
4. Searches for an existing booking for the same resource with status `PENDING` or `APPROVED` and an overlapping time interval.
5. Throws a `BookingError` with HTTP status `409` when an overlap exists.
6. Creates the new booking with status `PENDING` in the same transaction.

The overlap condition is:

```text
existing.startTime < requested.endTime
AND
existing.endTime   > requested.startTime
```

Because the resource write, overlap check, and insert are inside one transaction, two requests for the same resource cannot both commit based on the same stale availability check. The losing request receives a conflict after the winning transaction commits. Requests for different resource documents do not need to serialize on the same resource lock.

**MongoDB deployment requirement:** transactions require a replica-set-capable or sharded MongoDB deployment. MongoDB Atlas supports this; a standalone local MongoDB server does not support multi-document transactions.

### Actual 10-request concurrency test

The test was run using `backend/test-concurrency.js` against one resource and one identical time slot.

| Test result | Actual result |
|---|---:|
| Simultaneous requests | 10 |
| HTTP `201 Created` | 1 |
| HTTP `409 Conflict` | 9 |
| Other responses | 0 |
| Outcome | **PASS** |

The tested resource ID was `6b046e557efc00e50ea962fe`, and the requested slot was **2026-11-25 15:30–16:00 UTC**. Exactly one request created the booking; the other nine received the overlap conflict response. This is the observed result of the 10-request test run.

## B.2 T-B2 — Idempotent re-import and human-override protection

The stable identity of an imported ticket is its `externalId`. The `Ticket` schema declares this field as required and unique. The import controller uses that identifier to decide whether to create a document or update the existing one.

The intended behavior and the behavior checked in the re-import test are:

1. **First import:** When the `externalId` is new, one ticket document is created. The deterministic classifier assigns its initial category and priority. The ticket starts with `isReviewed: false` and `isHumanOverride: false`.
2. **Repeated import:** When the same `externalId` is imported again, the controller finds the existing document and updates its subject/body. It does not intentionally create a new document for that identifier.
3. **No human category override:** When `isHumanOverride` is false, the classifier is run again and the controller updates the current `category` and `priority` from the new classification result.
4. **Human category override:** When `isHumanOverride` is true, the controller updates the subject/body but does not replace the agent-selected `category` or `priority` with the classifier output.
5. **Unique database constraint:** The unique `externalId` constraint provides a second layer of protection against two documents with the same external identifier.

**Re-import verification:** The repeated-import and human-override test was run using `TEST-OVERRIDE-20261125-01`. The subject was updated on re-import, and after the agent changed the category to `BUG`, another re-import left `category: BUG` and `isHumanOverride: true`. The inspected final record also retained `autoCategory: BILLING`. The duplicate-prevention check was separately performed and confirmed that re-importing the same external ID reused the existing ticket instead of creating another ticket.

**Important limitation:** the current implementation performs `Ticket.findOne()` followed by `Ticket.create()` for a new external ID. The unique index prevents two duplicate documents from being committed, but two simultaneous imports of the same previously unseen ID can still race: one request may receive a MongoDB duplicate-key error and fall through to the generic `500` handler. Sequential duplicate re-import and human-override preservation were checked; a parallel-import duplicate-key recovery test is a future improvement, not a claim made by the current test.

---

# Part C — Measure first, then optimise `GET /api/tickets?limit=100`

## C.1 Measurement setup

The measured endpoint was:

```text
GET /api/tickets?limit=100
```

The database contained **517 ticket documents**, meeting the assessment requirement of at least 500 tickets. Both runs used the same endpoint and dataset. Two warm-up requests were made before collecting ten timed HTTP requests for each run.

The `getTickets()` function builds the query filter, runs the sorted/paginated ticket query and `countDocuments(filter)` in parallel with `Promise.all()`, and returns the resulting page and total count. The page query uses `.lean()` to avoid creating full Mongoose document instances for read-only response data.

## C.2 Optimisation applied

An additional descending index on `createdAt` was added for the unfiltered ticket-list query, which sorts by newest creation time:

```javascript
ticketSchema.index({ createdAt: -1 });
```

This complements the existing compound and lookup indexes. The index was then checked using MongoDB `explain("executionStats")` for the equivalent sort-and-limit query.

## C.3 Actual before-and-after HTTP measurements

Each column below represents ten measured requests after two warm-up requests.

| Measurement | Before index | After index |
|---|---:|---:|
| Ticket documents | 517 | 517 |
| Warm-up requests | 2 | 2 |
| Timed requests | 10 | 10 |
| Individual response times (ms) | 116, 114, 119, 115, 120, 120, 116, 119, 119, 116 | 115, 120, 118, 115, 113, 128, 114, 117, 115, 116 |
| Average response time | **117.4 ms** | **117.1 ms** |
| Minimum response time | 114 ms | 113 ms |
| Maximum response time | 120 ms | 128 ms |

The average decreased by **0.3 ms**, approximately **0.26%**. This is a very small difference and should not be presented as a meaningful performance improvement. The post-index run also had a higher maximum response time (128 ms versus 120 ms), which shows that normal request-time variation was larger than the average change observed here.

## C.4 Query-plan verification

The MongoDB `explain("executionStats")` output for the sorted query showed:

- Winning plan included `IXSCAN` using index `createdAt_-1`.
- The query returned 100 documents.
- `totalKeysExamined`: 100.
- `totalDocsExamined`: 100.
- No collection scan (`COLLSCAN`) appeared in the winning plan.
- MongoDB displayed `executionTimeMillis` as `0` for this explain run (rounded); this is not the end-to-end HTTP latency reported in the benchmark table.

The explain output confirms that MongoDB used the intended index and examined 100 index keys/documents for the 100 returned records. However, the measured HTTP average changed only from 117.4 ms to 117.1 ms. Therefore, the accurate conclusion is that the index is being used efficiently for the sort, but the measured end-to-end latency improvement was negligible in this test environment.

## C.5 Trade-off

An additional index consumes disk space and adds maintenance work to inserts and updates because MongoDB must keep the index current. It is justified when it improves a frequent read path enough to offset that storage and write overhead. In this test, the query plan improved to an index scan, but the HTTP timing difference was too small to claim a significant speed-up.

---

# Part D — What I would improve with one more day

1. **Make new-ticket imports safe under simultaneous duplicate requests.** The current `importTickets()` logic reads by `externalId` and then creates a document when no match is found. Two simultaneous imports of the same new identifier can both pass the read step; the unique index prevents duplicate documents, but the losing request can currently become a `500`. I would replace the read-then-create sequence with an atomic upsert or catch duplicate-key errors and load/update the winning document, then add a parallel-import test. References: `backend/controller/ticketController.js:70-109` and `backend/models/Ticket.js:4-9`.

2. **Add focused regression tests for human-override behavior.** Category changes set `isHumanOverride = true`; priority-only, status-only, and assignee-only changes do not. Automated tests should verify all four field types and re-import preservation. Reference: `backend/controller/ticketController.js`.

3. **Clarify classifier-result semantics and add a latest-prediction field if required.** `autoCategory` is the original/current predicted category used by the model-agreement calculation. If an audit needs to distinguish the first prediction from later re-import predictions, add an explicit latest-prediction field and document whether agreement compares against the original or latest prediction.

4. **Add exhaustive booking boundary tests.** Booking validation now covers 30–240 minute durations, 30-minute UTC grid alignment, future starts, and a 30-day horizon. Automated tests should verify values immediately inside and outside each boundary.

5. **Add formal contract tests for both import payload variants.** `importTickets()` now accepts the bare JSON array described by the assessment and the `{ "tickets": [...] }` wrapper used by the frontend seed tools. Contract tests should verify counters and duplicate-key behavior for both shapes.

6. **Use cursor pagination for very large ticket collections.** The current list endpoint calculates an offset and uses `.skip(skip)` before `.limit(limitNum)`, and it also runs `countDocuments()` on each request. Large page numbers can become increasingly expensive. I would add stable cursor pagination using `createdAt` plus `_id` as a tie-breaker, preserve the existing page-based response for compatibility where needed, and measure the result before replacing the current endpoint. Reference: `backend/controller/ticketController.js:184-208`.

---

## Summary of evidence

| Requirement | Evidence recorded here |
|---|---|
| Part A — architecture and imported-ticket trace | Express route, controller, validator, classifier, MongoDB, list endpoint, statistics endpoint, and dashboard flow documented |
| Part A — definition of reviewed | `isReviewed` is set for category changes or a transition from `OPEN` to another status |
| B6 — race-safe booking | 10 simultaneous requests: 1 × `201`, 9 × `409`, 0 other responses |
| T-B2 — idempotent re-import | Re-import of the same external ID reused the record; subject/body update and human category override preservation checked |
| Part C — 500+ ticket benchmark | 517 tickets; ten before and ten after HTTP measurements recorded |
| Part C — query plan | `createdAt_-1` index used; 100 keys and 100 documents examined for 100 returned documents |
| Part D — one-day improvements | Each improvement points to concrete source file and line ranges |
