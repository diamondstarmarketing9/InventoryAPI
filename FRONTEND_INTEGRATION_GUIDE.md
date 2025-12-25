# Frontend Integration & Logic Guide

This guide details the logic flow, state management, and best practices for building a frontend (React, Vue, Flutter, Android) that consumes the Inventory API.

---

## 1. Authentication & Security Flow

**Logic:**
1.  **Login Screen:** User enters `username` and `password`.
2.  **API Call:** `POST /api/auth/login`.
3.  **Success:** API returns a `{ "token": "ey..." }` (JWT).
4.  **Storage:** Store this token securely.
    *   **Web:** `localStorage` or `HttpOnly Cookie`.
    *   **Mobile:** `SecureStorage` or `Keychain`.
5.  **Global State:** Update the User Context with the decoded token details (Role: `ADMIN`, `MANAGER`, `SHOP`).
6.  **Navigation:** Redirect to Dashboard.

**Request Interceptor:**
Every subsequent API call **MUST** include the header:
```http
Authorization: Bearer <your_token>
```

**Auto-Logout:**
If any API returns `401 Unauthorized` or `403 Forbidden`:
1.  Clear the stored token.
2.  Redirect user immediately to Login Screen.

---

## 2. Point of Sale (POS) Interface Logic

The POS screen is the most complex part of the frontend. It should act like a "Shopping Cart".

**State Variables:**
*   `currentLocationId`: (Selected Shop ID)
*   `cart`: Array of `{ productId, name, price, quantity, discount, tax, total }`
*   `selectedClient`: Object (Optional)
*   `paymentMethod`: String (`CASH`, `CARD`, `CREDIT`)

**Workflow:**
1.  **Product Search:**
    *   Fetch all products (`GET /api/products`) and cache them locally for speed.
    *   User scans barcode or types name.
    *   **Check Stock:** Before adding to cart, check `currentLocationId` stock balance. Prevent addition if `qty > available`.

2.  **Cart Calculation (Real-time):**
    *   `LineTotal = (Price * Qty) - Discount + Tax`
    *   `GrandTotal = Sum(LineTotals)`

3.  **Checkout Process:**
    *   Select Client (Optional).
    *   Select Payment Method.
    *   **Submit API:** `POST /api/pos/sale`
        ```json
        {
          "locationId": 1,
          "clientId": 5,
          "paymentMethod": "CASH",
          "items": [ ...cartMaps ]
        }
        ```

4.  **Post-Sale:**
    *   **Success:** backend updates stock, journal, and returns `saleId`.
    *   **Action:** Clear Cart, Show "Success" Modal, Print Receipt URL.
    *   **Error:** Show specific error (e.g., "Insufficient Stock").

---

## 3. Inventory Management Logic

### 3.1 Receiving Stock (Purchases)
*   **UI:** A form to select "Supplier", "Product", "Location".
*   **Logic:**
    *   User enters `Unit Cost`. This is crucial for the "Weighted Average Cost" calculation on the backend.
    *   API: `POST /api/stock/receive`.

### 3.2 Stock Transfer
*   **UI:** "From Location" (Dropdown), "To Location" (Dropdown).
*   **Validation:** frontend should block selecting the same location twice.
*   **API:** `POST /api/stock/transfer`.

### 3.3 Auditing (Stock Taking)
*   **Scenario:** Tablets used in warehouse.
*   **UI:** List of products with "System Qty" (Read-only) and "Physical Qty" (Input).
*   **Logic:**
    *   User counts items physically.
    *   Calculates Difference = `Physical - System`.
    *   **Submit:** `POST /api/audit`.
    *   **Backend Action:** Updates stock to match physical, logs the difference as profit/loss.

---

## 4. Reports & Visualization

**Dashboard Widgets:**
1.  **Total Inventory Value:** `GET /api/reports/valuation` (Display `totalPortfolioValue`).
2.  **Low Stock Alerts:** `GET /api/reports/low-stock`. Display as a red list/badge.
3.  **Sales Chart:** `GET /api/pos/report`.

**Profit & Loss:**
*   **API:** `GET /api/reports/profit?startDate=...&endDate=...`
*   **Display:** Table showing `Revenue`, `COGS`, `Gross Profit`.

---

## 5. Offline Capabilities (Advanced Mobile Logic)

If building a mobile app (Flutter/Android):

1.  **Sync Down:** On Login, fetch `Products` and `Clients` and store in local SQLite/Room DB.
2.  **Offline Sale:**
    *   If no internet, verify stock against local DB.
    *   Save Sale object to specific `pending_sync` table.
3.  **Sync Up:**
    *   Listen for Internet Connection.
    *   Loop through `pending_sync` items.
    *   Send `POST /api/pos/sale`.
    *   If success, delete from local pending.
    *   If error (e.g., stock changed on server), flag for manual review.

---

## 6. Error Handling Standards

| HTTP Code | Meaning | Frontend Action |
| :--- | :--- | :--- |
| `200/201` | Success | Show Toast/Notification "Success" |
| `400` | Bad Request | Show validation message (e.g., "Missing Client") |
| `401` | Unauthorized | Redirect to Login |
| `403` | Forbidden | Show "Access Denied" (Permission issue) |
| `404` | Not Found | Show "Item not found" |
| `500` | Server Error | Show "System Error, please try again or contact Admin" |

---

## 7. Role-Based UI Hiding

Use the decoded token `role` to hide sidebar items:

*   **ADMIN:** See Everything (Users, Reports, Settings).
*   **MANAGER:** See Stock, POS, Reports. (Hide Users).
*   **SHOP:** See POS only. (Hide Reports, Stock Adjustments).
