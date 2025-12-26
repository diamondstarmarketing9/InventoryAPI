# API Models & Endpoints Map

This document lists all active API endpoints and the full JSON structure (including field types) of the associated data models. Use this to bind frontend forms and tables.

## Host
Base URL: `http://<YOUR_VPS_IP>:3000/api`

---

## 🔐 Auth
**Controller**: `authController`

### Endpoints
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| **POST** | `/auth/register` | Create a new user (admin/manager) |
| **POST** | `/auth/login` | Authenticate and get JWT |

### Payload (Login)
```json
{
  "username": "admin",
  "password": "password123"
}
```

### Payload (Register)
```json
{
  "username": "newuser",
  "password": "securepass",
  "role": "MANAGER" // Options: ADMIN, MANAGER, SHOP
}
```

---

## 📦 Products
**Model**: `Product`
**Controller**: `productController`

### Fields
| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | Integer | Auto-generated PK |
| `itemCode` | String | Unique SKU/Barcode (Mandatory) |
| `shortCode` | String | Quick Lookup Code |
| `nameAr` | String | Arabic Name |
| `nameEn` | String | English Name |
| `unit` | String | e.g., PCS, KG, BOX |
| `brand` | String | Manufacturer/Brand |
| `category` | String | (Optional field if added to model, currently not in base definition but commonly used) |
| `purchasePrice` | Decimal | Weighted Average Cost (Auto-calc or Manual) |
| `sellingPrice` | Decimal | Retail Price |
| `minStockLevel` | Integer | Low Stock Alert Threshold |
| `createdAt` | Date | Auto-generated |
| `updatedAt` | Date | Auto-generated |

### Endpoints
*   `GET /products` - List all products
*   `GET /products/:id` - Get single product
*   `POST /products` - Create product
*   `PUT /products/:id` - Update product
*   `DELETE /products/:id` - Delete product

---

## 🏢 Locations / Warehouses
**Model**: `Location`
**Controller**: `locationController`

### Fields
| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | Integer | PK |
| `name` | String | e.g. "Main Warehouse", "Downtown Shop" |
| `type` | String | "SHOP" or "WAREHOUSE" |

### Endpoints
*   `GET /locations`
*   `POST /locations`
*   `PUT /locations/:id`
*   `DELETE /locations/:id`

---

## 👥 Clients (Customers)
**Model**: `Client`
**Controller**: `clientController`

### Fields
| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | Integer | PK |
| `name` | String | Full Name (Mandatory) |
| `phone` | String | Contact Number |
| `email` | String | Email Address |
| `address` | String | Billing/Shipping Address |
| `creditBalance` | Decimal | Balance Owed (Receivable) |
| `loyaltyPoints` | Integer | Calculated Points |

### Endpoints
*   `GET /clients`
*   `POST /clients`
*   `PUT /clients/:id`
*   `DELETE /clients/:id`

---

## 🚛 Suppliers
**Model**: `Supplier`
**Controller**: `supplierController`

### Fields
| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | Integer | PK |
| `name` | String | Company Name (Mandatory) |
| `contactPerson` | String | Sales Rep Name |
| `phone` | String | Phone |
| `email` | String | Email |
| `address` | String | Physical Address |
| `openingBalance` | Decimal | Initial Debt (Payable) |
| `status` | Enum | 'ACTIVE', 'INACTIVE' |

### Endpoints
*   `GET /suppliers`
*   `POST /suppliers`
*   `PUT /suppliers/:id`
*   `DELETE /suppliers/:id`

---

## 📊 Stock (Inventory)
**Controllers**: `stockController`, `auditController`

### Models Involved
*   **StockBalance**: Pure inventory count per location.
*   **StockMovement**: Audit trail of every transaction.

### Endpoints & Payloads

#### 1. Check Balance
*   **Endpoint**: `GET /stock/balances?locationId=1&productId=5`
*   **Response**: `[ { "id": 1, "quantity": 100, "ProductId": 5, "LocationId": 1 } ]`

#### 2. Get Movement History
*   **Endpoint**: `GET /stock/movements?productId=5`
*   **Filter Params**: `locationId`, `productId`, `type` (SALE, PURCHASE, TRANSFER), `start`, `end`

#### 3. Receive Stock (Purchase)
*   **Endpoint**: `POST /stock/receive`
```json
{
  "productId": 1,
  "locationId": 1,
  "quantity": 50,
  "unitCost": 10.50, // Updates WAC
  "supplierId": 5, // Optional reference
  "remarks": "PO #1234"
}
```

#### 4. Transfer Stock
*   **Endpoint**: `POST /stock/transfer`
```json
{
  "productId": 1,
  "fromLocationId": 1,
  "toLocationId": 2, // Destination
  "quantity": 10
}
```

#### 5. Adjust Stock (Audit/Correction)
*   **Endpoint**: `POST /stock/adjust`
```json
{
  "productId": 1,
  "locationId": 1,
  "quantity": -5, // Negative to deduct, Positive to add
  "type": "ADJUSTMENT",
  "remarks": "Damaged goods"
}
```

#### 6. Physical Audit (Set Absolute Count)
*   **Endpoint**: `POST /audit`
```json
{
  "productId": 1,
  "locationId": 1,
  "physicalCount": 45, // Sets stock directly to 45. System calcs diff.
  "remarks": "Annual Audit"
}
```

---

## 🛒 POS & Sales
**Model**: `POS_Sale`, `POS_SaleItem`
**Controller**: `posController`

### Fields (POS_Sale)
| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | Integer | Invoice Number |
| `LocationId` | Integer | Store ID |
| `ClientId` | Integer | Customer (Optional) |
| `UserId` | Integer | Cashier |
| `totalAmount` | Decimal | Final Total (Net) |
| `discount` | Decimal | Global Discount |
| `tax` | Decimal | Global Tax |
| `paymentMethod` | String | CASH, CARD, CREDIT |
| `status` | String | COMPLETED, RETURNED |

### Endpoints
#### Process Sale
*   **Endpoint**: `POST /pos/sale`
```json
{
  "locationId": 1,
  "clientId": 5, // Optional
  "paymentMethod": "CASH",
  "items": [
    {
      "productId": 101,
      "quantity": 2,
      "discount": 0, // Per item discount amount
      "tax": 0
    }
  ]
}
```

#### Daily Report
*   **Endpoint**: `GET /pos/report?date=2024-01-01&locationId=1`

---

## 🏛 Accounting
**Models**: `ChartOfAccounts`, `Journal`, `Ledger`

### 1. Chart Of Accounts
**Fields**:
*   `code` (String): e.g. "1010"
*   `name` (String): e.g. "Cash"
*   `type` (Enum): ASSET, LIABILITY, EQUITY, INCOME, EXPENSE

**Endpoints**:
*   `GET /chart-of-accounts`
*   `POST /chart-of-accounts`

### 2. Journal & Ledger
**Fields (Journal)**:
*   `date`: Date
*   `description`: String
*   `debit`: Decimal
*   `credit`: Decimal
*   `ChartOfAccountId`: ID key to COA

**Endpoints**:
*   `GET /journal`: Filter by `start`, `end`, `accountId`.
*   `POST /journal`: Create manual entry.
```json
{
  "description": "Opening Balance Correction",
  "entries": [
    { "accountId": 1, "debit": 1000, "credit": 0 },
    { "accountId": 2, "debit": 0, "credit": 1000 }
  ]
}
```
*   `GET /ledger`: General Ledger view.
*   `GET /ledger/trial-balance`: Summary view.
