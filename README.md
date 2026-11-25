# TriageSync — Support Ticket Triage & Resource Booking Platform

A full-stack application for importing and classifying support tickets, reviewing tickets with an audit history, managing shared resources, and booking resource time slots.

---

## 1. Overview

**TriageSync** is a support operations and resource scheduling application developed for the **ENGN-F1 Full Stack Developer Hackathon & Placement Assessment**.

The application brings together two main workflows:

- **Ticket triage and review:** import support tickets, automatically assign a category and priority using deterministic rules, allow an authenticated agent to update ticket fields, and keep a history of ticket changes.
- **Resource scheduling:** browse rooms, laboratories, and equipment, check availability, submit booking requests, and let administrators approve or reject requests.

The frontend is a React single-page application built with Vite. The backend is a Node.js/Express REST API that stores application data in MongoDB using Mongoose. In the production Docker image, the frontend build is copied into the backend's `public/` directory and served by Express.

---

## 2. Live Links

| Resource | Link |
|---|---|
| **Live application** | [http://54.91.207.53/](http://54.91.207.53/) |
| **GitHub repository** | [titasmal75-wq/engnf1-fullstack-titasmal-wq](https://github.com/titasmal75-wq/engnf1-fullstack-titasmal-wq) |

The current demo uses an HTTP IP address. Use the seeded demo accounts below for testing, and do not enter real or sensitive information into the public demo.

---

## 3. Seeded Credentials

The database seed script creates the following demo accounts:

| Role | Name | Email | Password |
|---|---|---|---|
| ADMIN | Admin Lead | `admin@triagesync.test` | `Admin@123` |
| USER | Agent Demo | `user@triagesync.test` | `User@123` |

**Demo credentials only:** these accounts are intended for assessment/demo use. Replace or disable them before using the application with real users. The seed script uses `$setOnInsert` for users, so running it again does not reset an existing seeded user's password or overwrite that user's existing record.

---

## 4. Tech Stack

### Frontend

| Technology | Use |
|---|---|
| React 19 | Component-based user interface |
| Vite | Frontend development server and production build |
| React Router | Client-side routing |
| Axios | HTTP communication with the backend |
| React Context API | Shared authentication state (`AuthContext`) |
| CSS | Frontend styling |
| oxlint | Frontend lint command |

The React application starts from `frontend/src/main.jsx`. `App.jsx` wraps the routes with `BrowserRouter` and `AuthProvider`. The authentication context manages the current user, login, registration, logout, and initial session loading. The Vite development server proxies `/api` requests to `http://localhost:5000`.

### Backend and database

| Technology | Use |
|---|---|
| Node.js 20 (Docker runtime image) | JavaScript runtime |
| Express 5 | REST API and middleware |
| MongoDB | Persistent document database |
| Mongoose | MongoDB schemas, models, queries, and transactions |
| JSON Web Token (`jsonwebtoken`) | Access and refresh token handling |
| `bcryptjs` | Password hashing |
| `dotenv` | Environment variable loading |
| `cors` | Cross-origin request handling |
| `cookie-parser` | Refresh-token cookie parsing |
| `nodemon` | Backend development reloads |

### Deployment and developer tools

- Docker and Docker Compose
- AWS EC2 (live demo hosting)
- Git and GitHub
- GitHub Actions workflow configuration in `.github/workflows/`

---

## 5. Folder Structure

```text
engnf1-fullstack-titasmal-wq/
│
├── .github/
│   └── workflows/              # GitHub Actions workflow files
│
├── frontend/
│   ├── public/                 # Static frontend assets
│   ├── src/
│   │   ├── App.jsx             # Main React application wrapper
│   │   ├── main.jsx            # React entry point
│   │   └── context/            # Shared authentication context
│   ├── index.html
│   ├── package.json
│   └── vite.config.js          # Vite config and /api development proxy
│
├── backend/
│   ├── config/                 # MongoDB connection
│   ├── controller/             # API request handlers
│   ├── middleware/             # Authentication and role checks
│   ├── models/                 # Mongoose database models
│   ├── router/                 # Express API routes
│   ├── seed/                   # Idempotent database seed script
│   ├── services/               # Ticket classification and booking logic
│   ├── utils/                  # Shared backend utilities
│   ├── validators/             # Request/data validation
│   ├── app.js                  # Express application entry point
│   └── package.json
│
├── .dockerignore
├── docker-compose.yml
├── dockerfile
├── LICENSE
└── README.md
```

The production Docker build creates the frontend's `dist/` directory and copies it to the backend runtime as `public/`; the generated build output is not required to be committed to the repository.

---

## 6. Local Setup & Idempotent Seed Command

### Prerequisites

- Node.js 20 or a compatible Node.js LTS version
- npm
- MongoDB running locally or a MongoDB connection string
- Git
- Docker and Docker Compose (optional)

### Step 1 — Clone the repository

```bash
git clone https://github.com/titasmal75-wq/engnf1-fullstack-titasmal-wq.git
cd engnf1-fullstack-titasmal-wq
```

### Step 2 — Configure the backend

Install backend dependencies:

```bash
cd backend
npm install
```

Create a file named `backend/.env`:

```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://127.0.0.1:27017/triagesync

JWT_ACCESS_SECRET=replace_with_a_long_random_access_secret
JWT_REFRESH_SECRET=replace_with_a_different_long_random_refresh_secret
ACCESS_TOKEN_EXPIRES=15m
REFRESH_TOKEN_EXPIRES=7d

CLIENT_URL=http://localhost:5173
```

Set `MONGODB_URI` when running the seed command. The application connection code also accepts `MONGO_URL`, but the seed script specifically requires `MONGODB_URI`. Use strong, private JWT secrets and never commit `.env` files.

### Step 3 — Seed the database

Run this command from the `backend/` directory:

```bash
npm run seed
```

The seed command runs `node seed/seed.js`. It connects to the database and creates the demo records using upsert operations with `$setOnInsert`:

- 2 demo users: one ADMIN and one USER.
- 6 resources: 2 rooms, 2 labs, and 2 equipment items; one resource is inactive.
- 15 initial tickets covering the supported categories and including a ticket with HTML/script test content.
- Initial ticket-event records for the seeded tickets.

**Idempotency:** the script uses unique identifiers and upsert operations to avoid inserting duplicate seed users, resources, tickets, or matching initial ticket events when it is run repeatedly. Existing records are not generally overwritten by the seed data.

### Step 4 — Start the backend

Still inside `backend/`:

```bash
npm run dev
```

The backend listens on `http://localhost:5000` by default. For a standard Node start, use `npm start`.

### Step 5 — Start the frontend

Open a second terminal at the repository root:

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

During local development, Vite proxies requests beginning with `/api` to `http://localhost:5000` using `frontend/vite.config.js`.

### Available scripts

Run frontend scripts from `frontend/`:

```bash
npm run dev       # Start Vite development server
npm run build     # Create production build in dist/
npm run preview   # Preview the production build
npm run lint      # Run oxlint
```

Run backend scripts from `backend/`:

```bash
npm run dev       # Start backend with nodemon
npm start         # Start backend with Node.js
npm run seed      # Seed MongoDB with demo data
npm test          # Run the current backend controller-load smoke check
```

### Optional — Run with Docker Compose

From the repository root:

```bash
docker compose up --build -d
```

The Dockerfile builds the React frontend and then packages the Express backend with the frontend build. Docker Compose starts the application and a MongoDB container. The application is exposed on port `5000` by the current Compose configuration.

Useful commands:

```bash
docker compose ps
docker compose logs -f app
docker compose down
```

The current Compose MongoDB service is a standalone container. The booking service uses MongoDB transactions, so transaction-based booking behavior requires MongoDB to run as a replica set or on a transaction-capable hosted deployment. Configure a replica set before relying on this flow locally with Docker Compose.

---

## 7. Database Schema

TriageSync uses MongoDB collections backed by the following Mongoose models. Mongoose timestamps are enabled on the models as described below.

| Model / Collection | Main fields | Purpose |
|---|---|---|
| **User** | `name`, `email`, `passwordHash`, `role`, `isActive`, `refreshTokenHash`, `createdAt` | Stores user accounts, roles, password hashes, and refresh-token hash. `passwordHash` and `refreshTokenHash` are excluded from normal query selection. |
| **Ticket** | `externalId`, `subject`, `body`, `autoCategory`, `category`, `priority`, `status`, `assigneeId`, `isReviewed`, `isHumanOverride`, `createdAt`, `updatedAt` | Stores imported support tickets, the original automatic category, current agent-managed values, assignment, and review/override state. `externalId` is unique and `autoCategory` is immutable in the schema. |
| **TicketEvent** | `ticketId`, `field`, `oldValue`, `newValue`, `actor`, `createdAt` | Stores ticket change history. `field` can be `category`, `priority`, `status`, or `assigneeId`. |
| **Resource** | `name`, `type`, `capacity`, `description`, `isActive`, `bookingLockVersion`, `createdAt`, `updatedAt` | Stores bookable rooms, labs, and equipment. Resource names have a case-insensitive unique index. `bookingLockVersion` is used during booking concurrency control. |
| **Booking** | `resourceId`, `userId`, `ticketId`, `startTime`, `endTime`, `purpose`, `status`, `rejectionNote`, `decisionNote`, `createdAt`, `updatedAt` | Stores resource reservations, booking ownership, optional ticket association, time interval, and decision state. |

### Important enums

- **User role:** `USER`, `ADMIN`
- **Ticket category:** `BILLING`, `BUG`, `FEATURE_REQUEST`, `LOGIN`, `DELIVERY`
- **Ticket priority:** `LOW`, `MEDIUM`, `HIGH`, `URGENT`
- **Ticket status:** `OPEN`, `IN_PROGRESS`, `RESOLVED`, `CLOSED`
- **Resource type:** `ROOM`, `LAB`, `EQUIPMENT`
- **Booking status:** `PENDING`, `APPROVED`, `REJECTED`, `CANCELLED`

### Relationships

- `Ticket.assigneeId` references a `User`.
- `TicketEvent.ticketId` references a `Ticket`.
- `Booking.resourceId` references a `Resource`.
- `Booking.userId` references a `User`.
- `Booking.ticketId` optionally references a `Ticket`.

The backend defines indexes for common ticket queries, ticket event history, resource name uniqueness, and booking lookups. Passwords are stored as bcrypt hashes, not plain text.

---

## 8. API Summary

All API routes use the `/api` base path. Authenticated routes require a valid access token. Admin-only routes require the `ADMIN` role.

### Authentication — `/api/auth`

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/auth/register` | Public | Register a USER account |
| `POST` | `/api/auth/login` | Public | Log in and receive an access token |
| `POST` | `/api/auth/refresh` | Refresh cookie | Refresh the access token |
| `POST` | `/api/auth/logout` | Auth flow | Clear/invalidate refresh-token session |
| `GET` | `/api/auth/me` | Authenticated | Return the current user |

### Tickets — `/api/tickets`

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/tickets/import` | Authenticated | Import tickets and apply deterministic classification |
| `GET` | `/api/tickets` | Authenticated | List, filter, search, and paginate tickets |
| `GET` | `/api/tickets/:id` | Authenticated | Get one ticket and its event history |
| `GET` | `/api/tickets/:id/events` | Authenticated | Get the ticket's audit events |
| `PATCH` | `/api/tickets/:id` | Authenticated | Update category, priority, status, or assignee |

Ticket list filters include `status`, `category`, `priority`, `q`, `page`, and `limit`.

### Statistics

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/stats` | Authenticated | Get ticket statistics |
| `GET` | `/api/stats/admin` | ADMIN | Get admin statistics through the stats router |
| `GET` | `/api/admin/stats` | ADMIN | Get administrative statistics |

### Resources — `/api/resources`

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/resources` | Authenticated | List and filter resources |
| `GET` | `/api/resources/:id` | Authenticated | Get resource details |
| `GET` | `/api/resources/:id/availability` | Authenticated | Get availability for a date range |
| `POST` | `/api/resources` | ADMIN | Create a resource |
| `PATCH` | `/api/resources/:id` | ADMIN | Update resource details or active state |

### Bookings — `/api/bookings`

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/bookings` | Authenticated | Create a PENDING booking |
| `GET` | `/api/bookings/mine` | Authenticated | Get the current user's bookings |
| `GET` | `/api/bookings` | Authenticated | Get bookings (users are limited to their own; ADMIN can list all) |
| `GET` | `/api/bookings/:id` | Owner or ADMIN | Get booking details |
| `PATCH` | `/api/bookings/:id/cancel` | Owner | Cancel an eligible booking |
| `PATCH` | `/api/bookings/:id/approve` | ADMIN | Approve a pending booking |
| `PATCH` | `/api/bookings/:id/reject` | ADMIN | Reject a pending booking with a note |

---

## 9. Completed Features Checklist

### Authentication and access control

- [x] User registration and login.
- [x] JWT access-token and refresh-token flow.
- [x] Password hashing with `bcryptjs`.
- [x] USER and ADMIN roles with protected backend routes.
- [x] Shared frontend authentication state through React Context.

### Ticket triage and review

- [x] Deterministic ticket category and priority classification.
- [x] Ticket import using a unique `externalId` to avoid duplicate records.
- [x] Re-import logic that preserves agent category/priority values when `isHumanOverride` is set.
- [x] Ticket filtering by status, category, priority, and text search.
- [x] Ticket updates for category, priority, status, and assignee.
- [x] Ticket event records with old value, new value, actor, and timestamp.
- [x] Ticket statistics endpoint.

### Resource and booking workflows

- [x] Resource listing, search/filtering, detail, and availability endpoints.
- [x] Admin resource creation and update endpoints.
- [x] Booking creation with time-grid and duration validation.
- [x] Overlap check for PENDING and APPROVED bookings.
- [x] Booking creation wrapped in a MongoDB transaction with a resource lock-version update.
- [x] Booking approval, rejection, and owner cancellation endpoints.
- [x] Admin statistics endpoint.

### Frontend and deployment

- [x] React frontend with Vite.
- [x] React Router and shared authentication provider.
- [x] Axios-based frontend/backend communication.
- [x] Vite development proxy for `/api` requests.
- [x] Dockerfile with frontend build and backend runtime stages.
- [x] Docker Compose configuration for the app and MongoDB.
- [x] Public live demo and GitHub repository.

---

## 10. Known Limitations

The following items should be considered when comparing the current repository with the ENGN-F1 assessment API and business-rule specification:

1. **My bookings endpoint name:** the current route is `GET /api/bookings/my`. The assessment brief specifies `GET /api/bookings/mine`.
2. **Maximum booking duration:** the booking service currently allows a duration from 30 to 180 minutes. The assessment brief allows up to 240 minutes.
3. **Booking date window:** the current booking-time validator checks valid dates, end-after-start, and 30-minute UTC grid alignment. It does not currently enforce that the start time must be in the future and no more than 30 days ahead.
4. **Maximum active bookings per user:** the current booking creation service does not enforce the assessment brief's limit of three future PENDING/APPROVED bookings per user.
5. **Ticket list response shape:** the current `GET /api/tickets` response uses `tickets` and `limit`. The assessment brief's standard paginated response uses `data` and `pageSize`; adapt the response if exact contract matching is required.
6. **Booking transaction environment:** booking creation uses `session.withTransaction()`. MongoDB transactions need a replica-set-capable MongoDB deployment. The included Compose file starts a standard MongoDB container and does not configure replica-set initialization.
7. **Test coverage:** the current backend `npm test` script is a controller-module load smoke check, not a full automated unit, integration, or 10-request concurrency test suite.
8. **Demo transport security:** the public demo link currently uses HTTP rather than HTTPS. Use HTTPS and production-grade secret management before handling real user data.
9. **Seeded users:** the demo credentials are public in this README and must not be used for a production deployment.

These limitations are documented so the current implementation is not mistaken for having passed every external assessment test. They can be addressed in a later revision by aligning the route names and validation rules with the assessment contract, configuring a transaction-capable MongoDB deployment, and adding automated API/concurrency tests.

---

**Author:** Titas Mal  
**Project:** ENGN-F1 Full Stack Developer Assessment — TriageSync  
**Repository:** [engnf1-fullstack-titasmal-wq](https://github.com/titasmal75-wq/engnf1-fullstack-titasmal-wq)
