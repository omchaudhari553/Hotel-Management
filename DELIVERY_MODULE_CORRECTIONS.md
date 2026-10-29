# Delivery Module Corrections

This build keeps the existing Delivery UI and restores the previous Delivery records while retaining the real backend/integration flow.

## Restored previous records
- 5 previous order records: Swiggy, Zomato, ONDC Food, Eatsure, Magicpin.
- 2 previous platform rider records.
- 4 previous own-rider records.
- Previous channel records including Swiggy, Zomato, ONDC Food, Eatsure, Magicpin and Domino's.
- Previous menu-sync records.
- Previous settlement records.
- Previous reconciliation records.
- Previous revenue graph data for Daily / Weekly / Monthly / Yearly.

These restored records are marked internally as legacy/demo records. They are not inserted into SQL Server and therefore cannot corrupt or duplicate live business data.

## Live/backend behavior
- Delivery records are loaded from `/api/v1/hotel/deliveries`.
- Hotel orders, branches, staff and KOTs are loaded from their backend services.
- Zomato, Swiggy, ONDC and Magicpin integrations are loaded from the integration API.
- Test Order uses the same backend integration pipeline and creates real SQL Server records.
- Own-rider assignment persists to the backend when the selected order and rider have backend IDs.
- Legacy/demo order status and assignment actions remain usable locally without pretending they are SQL Server records.
- Platform-rider assignment is informational; internal staff assignment is used only for Own Rider mode.
- Delivery payment status remains separate from delivery status.
- Refresh reloads the module and re-reads backend records.
- Backend load uses independent request handling so one unavailable endpoint does not blank the whole Delivery dashboard.

## Test
1. Start SQL Server.
2. Start backend: `mvn clean spring-boot:run`.
3. Start frontend in `Hotel-Billing`: `npm run dev`.
4. Login.
5. Open Online Delivery.
6. Confirm the restored previous records are visible immediately.
7. Select a real branch and use `+ Create Test Order`.
8. Verify the created order, KOT and DeliveryOrder in the backend/SQL Server.
9. Use Own Rider to assign a backend delivery staff member.
10. Move status in the allowed sequence: New/Confirmed -> Preparing -> Ready -> Picked Up -> Out for Delivery -> Delivered.
11. Use Refresh to reload backend data.

## Production integration
Real platform credentials, outlet mappings, webhook URLs and exact production API contracts must be supplied by the approved platform partner documentation. No undocumented production credentials are included in this build.


## Delivery finance flow added
- Delivery status and payment status are independent.
- Delivery screen now supports PAID/PENDING/FAILED/REFUNDED payment updates for backend deliveries.
- Marking a delivery PAID creates/updates a persisted settlement record.
- Test-mode paid orders also create a matched reconciliation record so the complete test flow can be verified without real platform/bank credentials.
- Live/non-test paid orders create a PENDING reconciliation record until a platform/bank amount is supplied.
- Reconciliation supports manual bank/platform amount entry and calculates the difference and MATCHED/MISMATCHED status.
- Reports & Analytics now load delivery/payment/settlement/reconciliation KPIs from backend data.
- Test Order validation requires a 10-digit Indian mobile number beginning with 6/7/8/9, non-empty customer/address/item, quantity 1-100 and non-negative price.
- Backend phone validation was added to the main phone-bearing DTOs; affected frontend forms were aligned to the same 6/7/8/9 rule.
- New additive migration: `V7__delivery_payment_settlement_reconciliation.sql`.

2026-10-03 compile fix:
- Fixed DeliveryService.analytics() Java compilation error caused by Map.of() being used with 12 key/value pairs.
- Replaced the oversized Map.of() with LinkedHashMap.put() entries.
- No delivery/payment/settlement/reconciliation behavior was removed or changed by this compile-only fix.
