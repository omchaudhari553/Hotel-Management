# Multi-platform delivery integration

The existing Hotel Management integration layer now supports four external ordering channels through the same internal workflow:

- Zomato (`ZOMATO`)
- Swiggy (`SWIGGY`)
- ONDC (`ONDC`)
- Magicpin (`MAGICPIN`)

## Internal order flow

External platform -> webhook -> security validation -> outlet/branch mapping -> idempotency -> normalized `HotelOrder` -> `KOT` -> optional `DeliveryOrder` -> kitchen/delivery -> supported outbound status -> payment/settlement reconciliation.

One external customer order creates one internal `HotelOrder`. `DeliveryOrder` is linked to that order and never represents a second customer order. Delivery and payment remain separate.

## Webhook URLs

Configure the URL approved by the respective platform/partner:

- `POST /api/webhooks/zomato`
- `POST /api/webhooks/swiggy`
- `POST /api/webhooks/ondc`
- `POST /api/webhooks/magicpin`

The same routes are also exposed under `/api/v1/webhooks/...`.

## Integration setup

From the existing Delivery/Channel Management UI:

1. Select the Business branch.
2. Configure the external outlet/store/seller identifier.
3. Enter the partner-approved API base URL and endpoint paths.
4. Enter credentials; they are encrypted in the backend and are not returned to the frontend.
5. Test connection.
6. Activate only after successful connection testing.
7. Map menu items and run menu sync.

## Environment secrets

Set only the secrets supplied by the approved partner/contract:

- `ZOMATO_WEBHOOK_SECRET`
- `SWIGGY_WEBHOOK_SECRET`
- `ONDC_WEBHOOK_SECRET`
- `MAGICPIN_WEBHOOK_SECRET`
- `INTEGRATION_SECRET`

If a partner uses another signature/authentication mechanism, implement that exact approved mechanism in the corresponding adapter before production go-live.

## Important production rule

This project deliberately does **not** invent undocumented live API URLs, credentials, payload schemas, outlet IDs, settlement APIs, or authentication requirements. The connection fields are configurable so the actual partner-approved contract can be entered without changing the core Hotel Management workflow.

For ONDC, the restaurant-side integration must follow the applicable Seller Network Participant/technology-partner onboarding and current ONDC API specifications. ONDC describes Seller Network Participants as responsible for connecting sellers, cataloguing and fulfilment, and publishes developer guides/specifications for staging and go-live.

## Local test-order workflow

The Delivery dashboard now has **+ Create Test Order**. This is a local sandbox tool and does not contact Zomato, Swiggy, ONDC or Magicpin.

1. Start SQL Server and the Spring Boot backend.
2. Log into the existing frontend.
3. Open Online Delivery.
4. Click **+ Create Test Order**.
5. Select Zomato, Swiggy, ONDC or Magicpin and the real branch from the selector.
6. Enter test customer/item details and click **Create Test Order**.
7. The backend creates/uses a `TEST_MODE` connection for that branch and sends the test payload through the same normalization pipeline used by the platform webhooks.
8. Verify one `HotelOrder`, one `KOT` and one linked `DeliveryOrder` are visible.
9. Repeat with the other three platforms.

The backend also exposes an authenticated test endpoint:

`POST /api/v1/integrations/test-orders`

Example body:

```json
{
  "platform": "ZOMATO",
  "branchId": 1,
  "customerName": "Test Customer",
  "customerPhone": "9999999999",
  "address": "Test Delivery Address",
  "itemName": "Test Burger",
  "quantity": 2,
  "unitPrice": 150
}
```

For webhook testing, use `backend/postman/Multi-Platform-Integration-Test.postman_collection.json`. It contains test-order requests and public webhook requests for all four platforms.

### What to verify in SQL Server

```sql
SELECT id, order_number, order_source, external_platform, external_order_id, external_outlet_id
FROM hotel_orders
WHERE external_order_id LIKE 'TEST-%'
ORDER BY id DESC;

SELECT id, order_id, external_platform, external_order_id, status, delivery_mode
FROM delivery_orders
WHERE external_order_id LIKE 'TEST-%'
ORDER BY id DESC;

SELECT id, platform, event_key, external_order_id, status
FROM integration_webhook_events
WHERE external_order_id LIKE 'TEST-%'
ORDER BY id DESC;
```

For a duplicate webhook test, send the same `event_id` and `order_id` twice. The second request should be reported as a duplicate and must not create another `HotelOrder`.
