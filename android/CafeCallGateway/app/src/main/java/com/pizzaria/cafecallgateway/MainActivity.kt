package com.pizzaria.cafecallgateway

import android.Manifest
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.os.PowerManager
import android.provider.Settings
import android.util.Log
import android.widget.Button
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.app.NotificationCompat
import androidx.core.content.ContextCompat
import androidx.core.net.toUri
import com.google.firebase.database.*
import java.text.SimpleDateFormat
import java.util.*

class MainActivity : AppCompatActivity() {

    private lateinit var primaryText: TextView
    private lateinit var secondaryText: TextView
    private lateinit var lastOrderText: TextView
    private lateinit var connectionText: TextView
    private lateinit var logText: TextView
    private lateinit var testCallButton: Button
    private lateinit var clearLogButton: Button

    private lateinit var database: DatabaseReference
    private var ordersListener: ValueEventListener? = null
    private var configListener: ValueEventListener? = null

    private var primaryNumber = "+998911700916"
    private var secondaryNumber = "+998943941919"
    private var gatewaySim = "+998943941919"

    private val processedOrders = mutableSetOf<String>()
    private var wakeLock: PowerManager.WakeLock? = null

    companion object {
        private const val TAG = "CafeCallGateway"
        private const val PERMISSION_REQUEST_CODE = 1001
        private const val NOTIFICATION_CHANNEL_ID = "call_gateway"
        private const val NOTIFICATION_ID = 1
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        primaryText = findViewById(R.id.primaryText)
        secondaryText = findViewById(R.id.secondaryText)
        lastOrderText = findViewById(R.id.lastOrderText)
        connectionText = findViewById(R.id.connectionText)
        testCallButton = findViewById(R.id.testCallButton)
        clearLogButton = findViewById(R.id.clearLogButton)
        logText = findViewById(R.id.logText)

        primaryText.text = getString(R.string.primary_number_format, primaryNumber)
        secondaryText.text = getString(R.string.secondary_number_format, secondaryNumber)

        createNotificationChannel()
        requestPermissions()
        initFirebase()

        testCallButton.setOnClickListener {
            makePhoneCall(primaryNumber)
        }

        clearLogButton.setOnClickListener {
            logText.text = ""
        }

        addLog("🚀 Cafe Call Gateway started")
        addLog("📱 Gateway SIM: $gatewaySim")
        addLog("📞 Primary: $primaryNumber")
        addLog("📞 Secondary: $secondaryNumber")
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                NOTIFICATION_CHANNEL_ID,
                "Call Gateway Service",
                NotificationManager.IMPORTANCE_LOW,
            ).apply {
                description = "Keeps Call Gateway running in background"
            }
            val manager = getSystemService(NotificationManager::class.java)
            manager.createNotificationChannel(channel)
        }
    }

    private fun showNotification() {
        try {
            val notificationIntent = Intent(this, MainActivity::class.java)
            val pendingIntent = PendingIntent.getActivity(
                this, 0, notificationIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )

            val notification = NotificationCompat.Builder(this, NOTIFICATION_CHANNEL_ID)
                .setContentTitle("Cafe Call Gateway")
                .setContentText("Listening for new orders...")
                .setSmallIcon(android.R.drawable.ic_menu_call)
                .setContentIntent(pendingIntent)
                .setOngoing(true)
                .build()

            val notificationManager = getSystemService(NOTIFICATION_SERVICE) as NotificationManager
            notificationManager.notify(NOTIFICATION_ID, notification)
        } catch (e: Exception) {
            Log.e(TAG, "Notification error: ${e.message}")
        }
    }

    private fun requestPermissions() {
        val permissions = mutableListOf<String>()

        if (ContextCompat.checkSelfPermission(this, Manifest.permission.CALL_PHONE) != PackageManager.PERMISSION_GRANTED) {
            permissions.add(Manifest.permission.CALL_PHONE)
        }

        if (ContextCompat.checkSelfPermission(this, Manifest.permission.READ_PHONE_STATE) != PackageManager.PERMISSION_GRANTED) {
            permissions.add(Manifest.permission.READ_PHONE_STATE)
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
                permissions.add(Manifest.permission.POST_NOTIFICATIONS)
            }
        }

        if (permissions.isNotEmpty()) {
            ActivityCompat.requestPermissions(this, permissions.toTypedArray(), PERMISSION_REQUEST_CODE)
        }
    }

    override fun onRequestPermissionsResult(requestCode: Int, permissions: Array<out String>, grantResults: IntArray) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode == PERMISSION_REQUEST_CODE) {
            val allGranted = grantResults.all { it == PackageManager.PERMISSION_GRANTED }
            if (allGranted) {
                Toast.makeText(this, "✅ All permissions granted!", Toast.LENGTH_SHORT).show()
                addLog("✅ Permissions granted")
            } else {
                Toast.makeText(this, "⚠️ Call permission required!", Toast.LENGTH_LONG).show()
                addLog("⚠️ Some permissions denied")
            }
        }
    }

    private fun initFirebase() {
        try {
            addLog("🔄 Initializing Firebase...")

            // Set database URL explicitly
            val config = FirebaseDatabase.getInstance().apply {
                setPersistenceEnabled(true)
            }
            database = config.reference

            connectionText.text = getString(R.string.connection_connected)
            connectionText.setTextColor(ContextCompat.getColor(this, android.R.color.holo_green_dark))
            addLog("🟢 Firebase connected")

            showNotification()
            listenForConfig()
            listenForOrders()
        } catch (e: Exception) {
            Log.e(TAG, "Firebase init error", e)
            connectionText.text = getString(R.string.connection_error)
            connectionText.setTextColor(ContextCompat.getColor(this, android.R.color.holo_red_dark))
            addLog("🔴 Firebase error: ${e.message}")

            // Retry after 5 seconds
            android.os.Handler(android.os.Looper.getMainLooper()).postDelayed({
                addLog("🔄 Retrying Firebase connection...")
                initFirebase()
            }, 5000)
        }
    }

    private fun listenForConfig() {
        try {
            val configRef = database.child("config")

            configListener = object : ValueEventListener {
                override fun onDataChange(snapshot: DataSnapshot) {
                    try {
                        val primary = snapshot.child("primaryNumber").getValue(String::class.java)
                        val secondary = snapshot.child("secondaryNumber").getValue(String::class.java)
                        val sim = snapshot.child("gatewaySim").getValue(String::class.java)

                        primary?.let { primaryNumber = it }
                        secondary?.let { secondaryNumber = it }
                        sim?.let { gatewaySim = it }

                        runOnUiThread {
                            primaryText.text = getString(R.string.primary_number_format, primaryNumber)
                            secondaryText.text = getString(R.string.secondary_number_format, secondaryNumber)
                        }
                        addLog("⚙️ Config updated from Firebase")
                    } catch (e: Exception) {
                        addLog("⚠️ Config parse error: ${e.message}")
                    }
                }

                override fun onCancelled(error: DatabaseError) {
                    addLog("⚠️ Config read error: ${error.message}")
                }
            }

            configRef.addValueEventListener(configListener!!)
        } catch (e: Exception) {
            addLog("❌ Config listener error: ${e.message}")
        }
    }

    private fun listenForOrders() {
        try {
            val ordersRef = database.child("orders")

            ordersListener = object : ValueEventListener {
                override fun onDataChange(snapshot: DataSnapshot) {
                    try {
                        for (orderSnapshot in snapshot.children) {
                            val orderId = orderSnapshot.key ?: continue
                            val status = orderSnapshot.child("status").getValue(String::class.java)

                            if ((status == "NEW") && !processedOrders.contains(orderId)) {
                                processNewOrder(orderId, orderSnapshot)
                            }
                        }
                    } catch (e: Exception) {
                        addLog("❌ Order parse error: ${e.message}")
                    }
                }

                override fun onCancelled(error: DatabaseError) {
                    addLog("🔴 Firebase error: ${error.message}")
                    connectionText.text = getString(R.string.connection_disconnected)
                    connectionText.setTextColor(ContextCompat.getColor(this@MainActivity, android.R.color.holo_red_dark))
                }
            }

            ordersRef.addValueEventListener(ordersListener!!)
            addLog("👂 Listening for orders...")
        } catch (e: Exception) {
            addLog("❌ Orders listener error: ${e.message}")
        }
    }

    private fun processNewOrder(orderId: String, snapshot: DataSnapshot) {
        try {
            val items = snapshot.child("items").getValue(String::class.java) ?: "Unknown"
            val total = snapshot.child("total").getValue(Long::class.java) ?: 0
            val callNumbers = mutableListOf<String>()

            val numbersSnapshot = snapshot.child("callNumbers")
            for (numberSnapshot in numbersSnapshot.children) {
                val number = numberSnapshot.getValue(String::class.java)
                if (number != null) callNumbers.add(number)
            }

            val orderNumber = snapshot.child("orderNumber").getValue(Int::class.java) ?: orderId.toIntOrNull() ?: 0
            val customerName = snapshot.child("customerName").getValue(String::class.java) ?: "Unknown"

            addLog("📞 NEW ORDER #$orderNumber!")
            addLog("   Items: $items")
            addLog("   Total: $total so'm")
            addLog("   Customer: $customerName")
            addLog("   Numbers: ${callNumbers.joinToString(", ")}")

            runOnUiThread {
                lastOrderText.text = getString(R.string.last_order_format, orderNumber.toString())
            }

            processedOrders.add(orderId)
            updateOrderStatus(orderId, "CALLING")

            if (callNumbers.isNotEmpty()) {
                makeSequentialCalls(orderId, callNumbers, 0)
            } else {
                addLog("⚠️ No call numbers for order $orderId")
                updateOrderStatus(orderId, "NO_NUMBERS")
            }
        } catch (e: Exception) {
            addLog("❌ Process order error: ${e.message}")
        }
    }

    private fun makeSequentialCalls(orderId: String, numbers: List<String>, index: Int) {
        if (index >= numbers.size) {
            updateOrderStatus(orderId, "CALLED")
            addLog("✅ All calls completed for order $orderId")
            return
        }

        val phoneNumber = numbers[index]
        addLog("📞 Calling $phoneNumber...")

        makePhoneCall(phoneNumber)

        android.os.Handler(android.os.Looper.getMainLooper()).postDelayed({
            makeSequentialCalls(orderId, numbers, index + 1)
        }, 30000)
    }

    private fun makePhoneCall(phoneNumber: String) {
        if (ActivityCompat.checkSelfPermission(this, Manifest.permission.CALL_PHONE) != PackageManager.PERMISSION_GRANTED) {
            addLog("❌ Call permission not granted")
            return
        }

        try {
            val intent = Intent(Intent.ACTION_CALL, "tel:$phoneNumber".toUri())
            startActivity(intent)
            addLog("📞 Calling $phoneNumber...")
        } catch (e: Exception) {
            addLog("❌ Call failed: ${e.message}")
            try {
                val intent = Intent(Intent.ACTION_DIAL, "tel:$phoneNumber".toUri())
                startActivity(intent)
                addLog("📱 Opened dialer for $phoneNumber")
            } catch (e2: Exception) {
                addLog("❌ Dialer failed: ${e2.message}")
            }
        }
    }

    private fun updateOrderStatus(orderId: String, status: String) {
        try {
            database.child("orders").child(orderId).child("status").setValue(status)
            addLog("📝 Order $orderId → $status")
        } catch (e: Exception) {
            addLog("❌ Status update failed: ${e.message}")
        }
    }

    private fun addLog(message: String) {
        try {
            val timestamp = SimpleDateFormat("HH:mm:ss", Locale.getDefault()).format(Date())
            val logMessage = "[$timestamp] $message\n"
            runOnUiThread {
                logText.append(logMessage)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Log error: ${e.message}")
        }
    }

    override fun onResume() {
        super.onResume()
        acquireWakeLock()
    }

    override fun onPause() {
        super.onPause()
        wakeLock?.let { if (it.isHeld) it.release() }
    }

    private fun acquireWakeLock() {
        try {
            val powerManager = getSystemService(POWER_SERVICE) as PowerManager
            wakeLock = powerManager.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "CafeCallGateway::WakeLock")
            wakeLock?.acquire(60 * 60 * 1000L)
        } catch (e: Exception) {
            Log.e(TAG, "WakeLock error: ${e.message}")
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        try {
            ordersListener?.let { database.removeEventListener(it) }
            configListener?.let { database.removeEventListener(it) }
        } catch (e: Exception) {
            Log.e(TAG, "Cleanup error: ${e.message}")
        }
        wakeLock?.let { if (it.isHeld) it.release() }
    }
}
