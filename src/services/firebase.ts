/**
 * Firebase Realtime Database integration for Call Gateway
 * 
 * When a new order is confirmed, it pushes to Firebase:
 * /orders/{orderId} — Android Gateway listens here and makes phone calls
 */

import { initializeApp, cert, App, getApps } from "firebase-admin/app";
import { getDatabase, Database } from "firebase-admin/database";

let firebaseApp: App | null = null;
let db: Database | null = null;

/**
 * Initialize Firebase Admin SDK
 * Requires FIREBASE_SERVICE_ACCOUNT and FIREBASE_DATABASE_URL in .env
 */
function initFirebase(): Database | null {
  if (db) return db;

  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT;
  const databaseURL = process.env.FIREBASE_DATABASE_URL?.trim();

  console.log("🔍 FIREBASE_SERVICE_ACCOUNT set:", !!serviceAccount, serviceAccount ? `(${serviceAccount.length} chars)` : "(missing)");
  console.log("🔍 FIREBASE_DATABASE_URL set:", !!databaseURL, databaseURL ? `(${databaseURL})` : "(missing)");

  if (!serviceAccount || !databaseURL) {
    console.log("🔥 Firebase not configured — Call Gateway disabled");
    console.log("   Set FIREBASE_SERVICE_ACCOUNT and FIREBASE_DATABASE_URL in .env");
    return null;
  }

  try {
    if (getApps().length === 0) {
      // Clean JSON: fix newlines inside private_key string
      // Replace literal newlines with escaped \n, then collapse whitespace
      let cleanJSON = serviceAccount.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
      // Fix private_key field: replace real newlines with \n inside the string value
      cleanJSON = cleanJSON.replace(/"private_key"\s*:\s*"([^"]*)"/g, (match, key) => {
        const fixedKey = key.replace(/\n/g, '\\n');
        return `"private_key": "${fixedKey}"`;
      });
      cleanJSON = cleanJSON.replace(/\s+/g, ' ').trim();
      const serviceAccountJSON = JSON.parse(cleanJSON);
      firebaseApp = initializeApp({
        credential: cert(serviceAccountJSON),
        databaseURL,
      });
    } else {
      firebaseApp = getApps()[0];
    }

    db = getDatabase(firebaseApp);
    console.log("🔥 Firebase connected successfully!");
    return db;
  } catch (err) {
    console.error("❌ Firebase init error:", err);
    return null;
  }
}

/**
 * Push new order to Firebase for Android Call Gateway
 * 
 * Firebase structure:
 * /orders/{orderId} = {
 *   status: "NEW",
 *   items: "2x Burger, 1x Cola",
 *   total: 85000,
 *   callNumbers: ["+998911700916", "+998XXXXXXXXX"],
 *   customerName: "Jamshid",
 *   customerPhone: "+998911700916",
 *   district: "Chinobod",
 *   paymentType: "Naqd",
 *   createdAt: 1750000000000
 * }
 */
export async function pushOrderToFirebase(order: {
  orderId: number;
  orderNumber: number;
  items: string;
  total: number;
  customerName: string;
  customerPhone: string;
  district: string;
  paymentType: string;
}): Promise<boolean> {
  const database = initFirebase();
  if (!database) return false;

  // Get call numbers from env
  const primaryNumber = process.env.PRIMARY_CALL_NUMBER || "+998911700916";
  const secondaryNumber = process.env.SECONDARY_CALL_NUMBER || "";
  const gatewaySim = process.env.GATEWAY_SIM_NUMBER || "+998943941919";
  const callNumbers = [primaryNumber];
  if (secondaryNumber) {
    callNumbers.push(secondaryNumber);
  }

  const orderData = {
    status: "NEW",
    items: order.items,
    total: order.total,
    callNumbers,
    gatewaySim,
    customerName: order.customerName,
    customerPhone: order.customerPhone,
    district: order.district,
    paymentType: order.paymentType,
    orderNumber: order.orderNumber,
    createdAt: Date.now(),
  };

  try {
    await database.ref(`orders/${order.orderId}`).set(orderData);
    console.log(`🔥 Order #${order.orderNumber} pushed to Firebase (ID: ${order.orderId})`);
    return true;
  } catch (err) {
    console.error(`❌ Firebase push error for order #${order.orderNumber}:`, err);
    return false;
  }
}

/**
 * Update order status in Firebase
 * Called when Android Gateway updates status: NEW -> CALLING -> CALLED
 */
export async function updateFirebaseOrderStatus(
  orderId: number,
  status: string
): Promise<boolean> {
  const database = initFirebase();
  if (!database) return false;

  try {
    await database.ref(`orders/${orderId}/status`).set(status);
    console.log(`🔥 Order ${orderId} status updated to ${status}`);
    return true;
  } catch (err) {
    console.error(`❌ Firebase status update error:`, err);
    return false;
  }
}
