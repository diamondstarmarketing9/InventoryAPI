# Inventory API Documentation

Base URL: `http://localhost:3000/api`

## 1. Authentication
**Base URL:** `/auth`

| Method | Endpoint | Description | Body Parameters |
| :--- | :--- | :--- | :--- |
| `POST` | `/register` | Register a new user | `{ "username": "admin", "password": "password", "role": "ADMIN" }` |
| `POST` | `/login` | Login and get JWT token | `{ "username": "admin", "password": "password" }` |

## 2. Products
**Base URL:** `/products`

| Method | Endpoint | Description | Body Parameters |
| :--- | :--- | :--- | :--- |
| `GET` | `/` | Get all products | - |
| `POST` | `/` | Create a new product | `{ "itemCode": "P001", "nameEn": "Drill", "purchasePrice": 100, "sellingPrice": 150, "minStockLevel": 10 }` |

## 3. Locations
**Base URL:** `/locations`

| Method | Endpoint | Description | Body Parameters |
| :--- | :--- | :--- | :--- |
| `GET` | `/` | List all locations | - |
| `POST` | `/` | Create a location | `{ "name": "Main Warehouse", "type": "WAREHOUSE" }` |
| `PUT` | `/:id` | Update a location | `{ "name": "New Name" }` |
| `DELETE` | `/:id` | Delete a location | - |

## 4. Stock Management
**Base URL:** `/stock`

| Method | Endpoint | Description | Body Parameters |
| :--- | :--- | :--- | :--- |
| `POST` | `/receive` | Receive stock (Purchase) | `{ "productId": 1, "locationId": 1, "quantity": 100, "unitCost": 50, "supplierId": 1 }` |
| `POST` | `/transfer` | Transfer stock between locations | `{ "productId": 1, "fromLocationId": 1, "toLocationId": 2, "quantity": 10 }` |
| `POST` | `/sale` | Record manual sale (Direct Stock Out) | `{ "productId": 1, "locationId": 1, "quantity": 5, "sellingPrice": 150 }` |
| `POST` | `/produce` | Manufacture finished goods | `{ "finishedProductId": 3, "locationId": 1, "quantity": 10, "components": [{"productId": 1, "quantity": 2}] }` |

## 5. Point of Sale (POS)
**Base URL:** `/pos`

| Method | Endpoint | Description | Body Parameters |
| :--- | :--- | :--- | :--- |
| `POST` | `/sale` | Process a POS Sale | `{ "locationId": 1, "clientId": 1, "paymentMethod": "CASH", "items": [{"productId": 1, "quantity": 2, "discount": 0}] }` |
| `POST` | `/return` | Return items from a sale | `{ "saleId": 1, "items": [{"productId": 1, "quantity": 1, "reason": "Defect"}] }` |
| `GET` | `/report` | Get daily sales report | Query Params: `?date=2024-12-25&locationId=1` |

## 6. Inventory Audit
**Base URL:** `/audit`

| Method | Endpoint | Description | Body Parameters |
| :--- | :--- | :--- | :--- |
| `POST` | `/` | Record Physical Count Adjustment | `{ "productId": 1, "locationId": 1, "physicalCount": 98, "remarks": "Lost item" }` |

## 7. Clients
**Base URL:** `/clients`

| Method | Endpoint | Description | Body Parameters |
| :--- | :--- | :--- | :--- |
| `GET` | `/` | List all clients | - |
| `POST` | `/` | Create a new client | `{ "name": "John Doe", "phone": "555-0123", "email": "john@example.com" }` |
| `PUT` | `/:id` | Update client details | `{ "creditBalance": 0 }` |
| `DELETE` | `/:id` | Delete a client | - |

## 8. Reports & Analytics
**Base URL:** `/reports`

| Method | Endpoint | Description | Query Parameters |
| :--- | :--- | :--- | :--- |
| `GET` | `/low-stock` | Get items below min stock level | - |
| `GET` | `/movement-history` | Get stock movement log | `?productId=1` |
| `GET` | `/profit` | Get profit report | `?startDate=2024-01-01&endDate=2024-12-31` |
| `GET` | `/valuation` | Get current inventory valuation | - |

## 9. Price History
**Base URL:** `/prices`

| Method | Endpoint | Description | Query Parameters |
| :--- | :--- | :--- | :--- |
| `GET` | `/` | Get price history for a product | `?productId=1` |
