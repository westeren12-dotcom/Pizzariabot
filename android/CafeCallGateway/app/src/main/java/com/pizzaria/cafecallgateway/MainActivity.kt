package com.pizzaria.cafecallgateway

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.PowerManager
import android.provider.Settings
import android.widget.Button
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import com.google.firebase.database.*
import java.text.SimpleDateFormat
import java.util.*

class MainActivity : AppCompatActivity() {

    private lateinit var statusText: TextView
    private lateinit var primaryText: TextView
    private lateinit var secondaryText: TextView
    private lateinit var lastOrderText: TextView
    private lateinit var connectionText: TextView
    private lateinit var testCallButton: Button
    private lateinit var clearLogButton: Button
    private lateinit var logText: TextView

    private lateinit var database: DatabaseReference
    private var ordersListener: ValueEventListener? = null
    
    // Phone numbers from config
    private var primaryNumber = "+998911700916"
    private var secondaryNumber = "+998943941919"
    
    // Processed orders to avoid duplicate calls
    private val processedOrders = mutableSetOf<String>()
    
    // Wake lock for background processing
    private var wakeLock: PowerManager.WakeLock? = null

    companion object {
        private const val PERMISSION_REQUEST_CODE = 1001
        private const val TAG = "CallGateway"
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        // Initialize views
        statusText = findViewById(R.id.statusText)
        primaryText = findViewById(R.id.primaryText)
        secondaryText = findViewById(R.id.secondaryText)
        lastOrderText = findViewById(R.id.lastOrderText)
        connectionText = findViewById(R.id.connectionText)
        testCallButton = findViewById(R.id.testCallButton)
        clearLogButton = findViewById(R.id.clearLogButton)
        logText = findViewById(R.id.logText)

        // Display phone numbers
        primaryText.text = "Primary: $primaryNumber"
        secondaryText.text = "Secondary: $secondaryNumber"

        // Request permissions
        requestPermissions()

        // Initialize Firebase
        initFirebase()

        // Test call button
        testCallButton.setOnClickListener {
            makePhoneCall(primaryNumber)
        }

        // Clear log button
        clearLogButton.setOnClickListener {
            logText.text = ""
        }

        // Acquire wake lock for background processing
        acquireWakeLock()
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
                Toast.makeText(this, "Permissions granted!", Toast.LENGTH_SHORT).show()
            } else {
                Toast.makeText(this, "Call permission required!", Toast.LENGTH_LONG).show()
                // Open settings
                val intent = Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS)
                intent.data = Uri.parse("package:$packageName")
                startActivity(intent)
            }
        }
    }

    private fun initFirebase() {
        try {
            database = FirebaseDatabase.getInstance().reference
            connectionText.text = "Status: Firebase Connected"
            connectionText.setTextColor(ContextCompat.getColor(this, android.R.color.holo_green_dark))
            addLog("Firebase connected successfully")
            
            // Listen for new orders
            listenForOrders()
        } catch (e: Exception) {
            connectionText.text = "Status: Firebase Error"
            connectionText.setTextColor(ContextCompat.getColor(this, android.R.color.holo_red_dark))
            addLog("Firebase error: ${e.message}")
        }
    }

    private fun listenForOrders() {
        val ordersRef = database.child("orders")
        
        ordersListener = object : ValueEventListener {
            override fun onDataChange(snapshot: DataSnapshot) {
                for (orderSnapshot in snapshot.children) {
                    val orderId = orderSnapshot.key ?: continue
                    val status = orderSnapshot.child("status").getValue(String::class.java)
                    
                    // Only process NEW orders
                    if (status == "NEW" && !processedOrders.contains(orderId)) {
                        processNewOrder(orderId, orderSnapshot)
                    }
                }
            }

            override fun onCancelled(error: DatabaseError) {
                addLog("Firebase error: ${error.message}")
                connectionText.text = "Status: Disconnected"
                connectionText.setTextColor(ContextCompat.getColor(this@MainActivity, android.R.color.holo_red_dark))
            }
        }
        
        ordersRef.addValueEventListener(ordersListener!!)
    }

    private fun processNewOrder(orderId: String, snapshot: DataSnapshot) {
        val items = snapshot.child("items").getValue(String::class.java) ?: "Unknown items"
        val total = snapshot.child("total").getValue(Long::class.java) ?: 0
        val callNumbers = mutableListOf<String>()
        
        // Get call numbers
        val numbersSnapshot = snapshot.child("callNumbers")
        for (numberSnapshot in numbersSnapshot.children) {
            val number = numberSnapshot.getValue(String::class.java)
            if (number != null) {
                callNumbers.add(number)
            }
        }
        
        val orderNumber = snapshot.child("orderNumber").getValue(Int::class.java) ?: orderId.toIntOrNull() ?: 0
        val customerName = snapshot.child("customerName").getValue(String::class.java) ?: "Unknown"
        
        addLog("📞 NEW ORDER #$orderNumber!")
        addLog("   Items: $items")
        addLog("   Total: $total so'm")
        addLog("   Customer: $customerName")
        addLog("   Call numbers: ${callNumbers.joinToString(", ")}")
        
        // Update last order display
        lastOrderText.text = "Last Order: #$orderNumber"
        
        // Mark as processing
        processedOrders.add(orderId)
        updateOrderStatus(orderId, "CALLING")
        
        // Make phone calls sequentially
        makeSequentialCalls(orderId, callNumbers, 0)
    }

    private fun makeSequentialCalls(orderId: String, numbers: List<String>, index: Int) {
        if (index >= numbers.size) {
            // All calls attempted
            updateOrderStatus(orderId, "CALLED")
            addLog("✅ All calls completed for order $orderId")
            return
        }
        
        val phoneNumber = numbers[index]
        addLog("📞 Calling $phoneNumber...")
        
        // Make the call
        makePhoneCall(phoneNumber)
        
        // Wait before next call (30 seconds gap)
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
            val intent = Intent(Intent.ACTION_CALL, Uri.parse("tel:$phoneNumber"))
            startActivity(intent)
            addLog("📞 Calling $phoneNumber...")
        } catch (e: Exception) {
            addLog("❌ Call failed: ${e.message}")
            // Fallback to dialer
            try {
                val intent = Intent(Intent.ACTION_DIAL, Uri.parse("tel:$phoneNumber"))
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
            addLog("📝 Order $orderId status: $status")
        } catch (e: Exception) {
            addLog("❌ Status update failed: ${e.message}")
        }
    }

    private fun addLog(message: String) {
        val timestamp = SimpleDateFormat("HH:mm:ss", Locale.getDefault()).format(Date())
        val logMessage = "[$timestamp] $message\n"
        runOnUiThread {
            logText.append(logMessage)
        }
    }

    private fun acquireWakeLock() {
        val powerManager = getSystemService(POWER_SERVICE) as PowerManager
        wakeLock = powerManager.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "CafeCallGateway::WakeLock")
        wakeLock?.acquire(10 * 60 * 1000L) // 10 minutes
    }

    override fun onDestroy() {
        super.onDestroy()
        ordersListener?.let { database.removeEventListener(it) }
        wakeLock?.let { if (it.isHeld) it.release() }
    }
}
