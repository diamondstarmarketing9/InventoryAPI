# Android Socket.IO Integration Guide

This guide details how to integrate the real-time communication layer into your Android Inventory App using Socket.IO.

## 1. Dependencies

Add the Socket.IO client library to your `app/build.gradle` file:

```gradle
dependencies {
    implementation('io.socket:socket.io-client:2.1.0') {
        exclude group: 'org.json', module: 'json' // Avoid Android JSON conflict
    }
}
```

## 2. Socket Manager (Singleton)

Create a `SocketManager` object to handle the connection lifecycle and event listening.

```kotlin
package com.inventory.app.network

import android.util.Log
import io.socket.client.IO
import io.socket.client.Socket
import io.socket.emitter.Emitter
import org.json.JSONObject
import java.net.URI

object SocketManager {

    private const val TAG = "SocketManager"
    private const val BASE_URL = "http://YOUR_SERVER_IP:3000" // Replace with actual URL
    private var mSocket: Socket? = null

    // Call this after successful login
    fun connect(token: String, locationId: Int) {
        if (mSocket != null && mSocket!!.connected()) return

        try {
            val options = IO.Options.builder()
                .setAuth(mapOf("token" to token))
                .setReconnection(true)
                .setReconnectionAttempts(Int.MAX_VALUE)
                .setReconnectionDelay(1000)
                .build()

            mSocket = IO.socket(URI.create(BASE_URL), options)

            mSocket?.on(Socket.EVENT_CONNECT) {
                Log.d(TAG, "Connected to Socket.IO")
                // Join the location-specific room upon connection
                joinRoom("location_$locationId")
            }

            mSocket?.on(Socket.EVENT_CONNECT_ERROR) { args ->
                Log.e(TAG, "Connection Error: ${args[0]}")
            }

            mSocket?.on(Socket.EVENT_DISCONNECT) {
                Log.d(TAG, "Disconnected")
            }

            mSocket?.connect()

        } catch (e: Exception) {
            Log.e(TAG, "Socket Init Error", e)
        }
    }

    fun joinRoom(roomName: String) {
        mSocket?.emit("join_room", roomName)
    }

    fun disconnect() {
        mSocket?.disconnect()
        mSocket = null
    }

    // Generic Event Listener
    fun on(event: String, listener: Emitter.Listener) {
        mSocket?.on(event, listener)
    }

    fun off(event: String) {
        mSocket?.off(event)
    }
}
```

## 3. Handling Events (ViewModel / Repository)

In your `InventoryRepository` or `MainViewModel`, listen for events to update local data.

### Example: Stock Updates

```kotlin
// In your Repository or ViewModel
fun listenForStockUpdates(database: AppDatabase) {
    SocketManager.on("stock_updated") { args ->
        if (args.isNotEmpty()) {
            val data = args[0] as JSONObject
            try {
                val productId = data.getInt("productId")
                val locationId = data.getInt("locationId")
                // Check if 'newQuantity' exists (it might be omitted in some events like TRANSFER_OUT if not explicit)
                // Ideally backend sends newQuantity always. If not, trigger a fetch.
                
                if (data.has("newQuantity")) {
                     val newQty = data.getDouble("newQuantity")
                     // Update Local Room Database
                     database.stockDao().updateQuantity(productId, locationId, newQty)
                     Log.d("Socket", "Stock updated for Product $productId: $newQty")
                } else {
                    // Trigger a REST API call to sync if exact data is missing
                    fetchStock(productId, locationId)
                }
               
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
    }
}
```

### Example: New Sales

```kotlin
fun listenForSales() {
    SocketManager.on("sale_created") { args ->
        val data = args[0] as JSONObject
        val saleId = data.getInt("saleId")
        val amount = data.getDouble("totalAmount")
        
        // Show notification or refresh list
        _saleEvents.postValue(SaleEvent(saleId, amount))
    }
}
```

## 4. Lifecycle Management

Connect in your `Application` class or `MainActivity` onCreate, provided the user is logged in.
Disconnect in `onDestroy`.

```kotlin
override fun onDestroy() {
    super.onDestroy()
    SocketManager.disconnect()
}
```

## 5. Backend Event Reference

| Event Name | Payload Structure | Description |
| :--- | :--- | :--- |
| `stock_updated` | `{ productId, locationId, newQuantity, type }` | Fired on receive, transfer, sale, production, adjustment. |
| `sale_created` | `{ saleId, totalAmount, locationId, timestamp }` | Fired when a POS sale is completed. |
| `sale_returned` | `{ saleId, locationId }` | Fired when a sale is returned. |

## 6. Offline Strategy

Since Socket.IO handles reconnection automatically, the app should rely on the `EVENT_CONNECT` listener to re-join rooms.
However, if the app was offline for a long time, the local state might be stale.
**Recommendation**: On `EVENT_CONNECT`, trigger a quick "sync" API call (e.g., `GET /api/stock?lastUpdated=>timestamp`) to fetch any missed updates, or simply refresh the current view.
