# Hotel Management Backend

Spring Boot 3.5 + Java 21 + MySQL 8 + JPA/Hibernate + Spring Security/JWT + Flyway + OpenAPI.

## Scope

This backend is intentionally limited to the Hotel workflow discovered in the supplied frontend:
- Hotel dashboard/KPIs
- Rooms
- Guests/bookings/services
- Hotel tables/orders/KOT
- Staff/attendance
- Billing/invoices/payments
- Suppliers/purchases/supplier payments
- Hotel delivery
- Branches/outlets foundation
- Hotel profile/settings
- Expenses/reports
- Authentication/security/audit schema

Mess and Cafe business logic are excluded.

## Run

1. Create MySQL database: `CREATE DATABASE hotel_management CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`
2. Copy `.env.example` to `.env` or export the variables.
3. Use Java 21 and Maven 3.9+.
4. Development profile:
   `mvn spring-boot:run -Dspring-boot.run.profiles=dev`
5. Swagger: `http://localhost:8080/swagger-ui.html`
6. Health: `http://localhost:8080/actuator/health`

### Development credentials

Only the `dev` profile creates demo data:
- username: `admin`
- password: `Admin@123`
- email: `admin@hotel.local`

Do not use these credentials in production.

## API

Base path: `/api/v1`

Auth:
- POST `/auth/register`
- POST `/auth/login`
- POST `/auth/refresh`
- POST `/auth/logout`
- GET `/auth/me`
- POST `/auth/change-password`

Hotel:
- `/hotel/profile`
- `/hotel/settings`
- `/hotel/branches`
- `/hotel/rooms`
- `/hotel/guests`
- `/hotel/bookings`
- `/hotel/tables`
- `/hotel/orders`
- `/hotel/kot`
- `/hotel/staff`
- `/hotel/staff/attendance`
- `/hotel/invoices`
- `/hotel/payments`
- `/hotel/suppliers`
- `/hotel/purchase-orders`
- `/hotel/purchase-invoices`
- `/hotel/supplier-payments`
- `/hotel/deliveries`
- `/hotel/expenses`
- `/hotel/dashboard`
- `/hotel/reports/*`

All authenticated hotel data is scoped to the business of the JWT principal. The frontend must not be trusted to choose another business.

## Frontend integration

The current supplied frontend has several mock/localStorage implementations. The backend is integration-ready, but not every hotel component was rewritten in this delivery because those screens contain large independent local state models. See `HOTEL_BACKEND_FEATURE_MAP.md` and `HOTEL_BACKEND_IMPLEMENTATION_REPORT.md` for the exact status.

Set the frontend API base URL to `http://localhost:8080/api/v1` and send `Authorization: Bearer <access-token>`.

## Security notes

- Passwords use BCrypt.
- JWT access tokens are signed and expire.
- Refresh tokens are persisted, rotated on refresh, and revocable.
- MySQL credentials/JWT secret are environment variables.
- Flyway owns schema changes; Hibernate uses `validate`.
- Financial calculations use `BigDecimal`.
