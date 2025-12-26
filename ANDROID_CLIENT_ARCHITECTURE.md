# Android Client Architecture & Integration Guide

This guide provides a blueprint for building the **Inventory Management System (IMS)** Android application using **Kotlin**, **Jetpack Compose**, **Retrofit**, and **Room**. It focuses on consuming the Node.js REST API correctly.

---

## 1. Architecture Overview

We follow **Clean Architecture** with **MVVM** (Model-View-ViewModel).

*   **Presentation Layer**: Jetpack Compose UI + ViewModels.
*   **Domain Layer**: Use cases (optional for simpler apps) or Repositories interfaces.
*   **Data Layer**: Repositories implementations, API (Retrofit), Local DB (Room).

### Package Structure
```text
com.inventory.app
├── data
│   ├── api             # Retrofit Service interfaces
│   ├── local           # Room Database, DAOs, Entities
│   ├── model           # DTOs (Data Transfer Objects)
│   ├── repository      # Repository Implementations
│   └── preferences     # Session Manager (SharedPreferences)
├── di                  # Hilt Dependency Injection modules
├── ui
│   ├── auth            # Login Screens
│   ├── pos             # Point of Sale Screens
│   ├── stock           # Inventory Screens
│   └── components      # Shared UI Composables
└── util                # Constants, Extensions, Resource wrapper
```

---

## 2. Networking (Retrofit)

### Dependencies
```gradle
implementation "com.squareup.retrofit2:retrofit:2.9.0"
implementation "com.squareup.retrofit2:converter-gson:2.9.0"
implementation "com.squareup.okhttp3:logging-interceptor:4.9.0"
```

### Auth Interceptor
Required to inject the `Bearer Token` into every request.

```kotlin
class AuthInterceptor(private val tokenManager: TokenManager) : Interceptor {
    override fun intercept(chain: Interceptor.Chain): Response {
        val original = chain.request()
        val token = tokenManager.getToken()
        
        val requestBuilder = original.newBuilder()
        if (!token.isNullOrEmpty()) {
            requestBuilder.header("Authorization", "Bearer $token")
        }
        
        return chain.proceed(requestBuilder.build())
    }
}
```

### ApiService Interface
Define endpoints matching `API_ENDPOINT_MAP.md`.

```kotlin
interface InventoryApi {
    // Auth
    @POST("auth/login")
    suspend fun login(@Body req: LoginRequest): AuthResponse

    // Products
    @GET("products")
    suspend fun getProducts(): List<ProductDto>

    // Stock
    @POST("stock/receive")
    suspend fun receiveStock(@Body req: StockReceiveRequest): StockResponse

    @POST("stock/transfer")
    suspend fun transferStock(@Body req: StockTransferRequest): StockResponse

    // POS
    @POST("pos/sale")
    suspend fun createSale(@Body req: SaleRequest): SaleResponse
}
```

---

## 3. Local Storage (Room Database)

Enable "Offline-First" capability by mirroring API data locally.

### Product Entity
```kotlin
@Entity(tableName = "products")
data class ProductEntity(
    @PrimaryKey val id: Int,
    val itemCode: String,
    val nameEn: String,
    val sellingPrice: Double,
    val quantity: Double, // Synced from stock API
    val locationId: Int   // Because stock is location-specific
)
```

### Stock Balance Strategy
The API returns stock balances separately from product definitions (`StockBalance` vs `Product`).
**Recommendation**: In your DAO, create a `ProductWithStock` class or simply merge the data into `ProductEntity` during the fetch/sync phase.

---

## 4. Repository Pattern (The Brain)

One logical Repository per feature (e.g., `ProductRepository`, `AuthRepository`).

### Example: ProductRepository
Handles the "Cache then Network" strategy.

```kotlin
class ProductRepository @Inject constructor(
    private val api: InventoryApi,
    private val dao: ProductDao
) {
    // Expose a Flow from DB (Single Source of Truth)
    val products = dao.getAllProducts()

    suspend fun refreshProducts(locationId: Int) {
        try {
            // 1. Fetch from Network
            val serverProducts = api.getProducts()
            val stockBalances = api.getStockBalances(locationId) 
            
            // 2. Map and Merge Data
            val entities = serverProducts.map { p ->
                val stock = stockBalances.find { it.ProductId == p.id }
                ProductEntity(
                    id = p.id,
                    nameEn = p.nameEn,
                    sellingPrice = p.sellingPrice,
                    quantity = stock?.quantity ?: 0.0,
                    locationId = locationId
                )
            }
            
            // 3. Save to DB (Triggers Flow update automatically)
            dao.insertAll(entities)
            
        } catch (e: Exception) {
            // Handle offline error (UI will still show old DB data)
            throw e
        }
    }
}
```

---

## 5. Key Workflows Implementation

### A. Authentication
1.  User enters credentials.
2.  `AuthRepository` calls `api.login()`.
3.  On success, save `token` and `role` to `EncryptedSharedPreferences`.
4.  Navigate to dashboard.

### B. Point of Sale (POS)
1.  **Search**: Query Room DB (`dao.searchProducts(query)`).
2.  **Add to Cart**: Verify `cartItem.qty <= productEntity.quantity`.
3.  **Checkout**:
    *   Construct `SaleRequest` object.
    *   Call `api.createSale(request)`.
    *   **On Success**:
        *   Clear Cart.
        *   Trigger `socket.emit('refresh_stock')` OR rely on the server's Socket event to update the local DB.
    *   **On Failure**: Show error snackbar.

### C. Real-Time Sync
Refer to `ANDROID_SOCKET_GUIDE.md` for the Socket.IO specifics.
*   The `StockRepository` should listen to the socket `stock_updated` event.
*   When an event arrives, update the specific row in Room DB using `dao.updateQuantity(id, newQty)`.
*   This instantly updates the UI (because the UI observes the Room Flow).

---

## 6. Data Transfer Objects (DTOs)

Match these exactly to the JSON Body parameters in `API_DOCUMENTATION.md`.

```kotlin
data class SaleRequest(
    val locationId: Int,
    val clientId: Int?,
    val paymentMethod: String, // "CASH", "CARD", "CREDIT"
    val items: List<SaleItemRequest>
)

data class SaleItemRequest(
    val productId: Int,
    val quantity: Double,
    val discount: Double = 0.0
)
```

---

## 7. Error Handling

Wrap Repository calls in a sealed class to manage UI state.

```kotlin
sealed class Resource<T> {
    class Success<T>(val data: T) : Resource<T>()
    class Error<T>(val message: String, val data: T? = null) : Resource<T>()
    class Loading<T> : Resource<T>()
}
```

**Common HTTP Errors to Catch:**
*   `401 Unauthorized`: Token expired. Redirect to Login.
*   `400 Bad Request`: Usually validation (e.g., negative stock, missing fields). Display `response.errorBody()` to user.
*   `500 Server Error`: Retry later.
