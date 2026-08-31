# Firebase Setup - Cafe Call Gateway

## 📋 QADAM-BA-QADAM

### 1. Firebase Console

👉 https://console.firebase.google.com

### 2. Loyiha tanlang yoki yarating

- Loyiha nomi: `pizzaria-cafe-bot`
- Agar mavjud bo'lsa — tanlang

### 3. Android App qo'shing

1. Dashboard'da **📱 Android** bosing
2. Package name: `com.pizzaria.cafecallgateway`
3. App nickname: `Cafe Call Gateway`
4. **Register app** bosing
5. **Download google-services.json** bosing
6. Faylni `android/CafeCallGateway/app/` papkasiga joylang

### 4. Realtime Database yarating

1. Chap tomonda **Build → Realtime Database**
2. **Create database** bosing
3. **Start in test mode** tanlang
4. Region: **asia-southeast1**
5. **Enable** bosing

### 5. Database Config qo'shing

Realtime Database'ga shu ma'lumotlarni kiriting:

```json
{
  "config": {
    "primaryNumber": "+998911700916",
    "secondaryNumber": "+998943941919",
    "gatewaySim": "+998943941919"
  }
}
```

### 6. Service Account (Railway uchun)

1. ⚙️ → **Project settings**
2. **Service accounts** tab
3. **Generate new private key** bosing
4. JSON fayl download bo'ladi
5. Railway Variables'ga qo'shing:
   - `FIREBASE_SERVICE_ACCOUNT` = JSON faylning butun matni
   - `FIREBASE_DATABASE_URL` = `https://pizzaria-cafe-bot-default-rtdb.asia-southeast1.firebasedatabase.app`

## 🔧 TELEFON RAQAMLARNI O'ZGARTIRISH

### Firebase Console'dan

1. Realtime Database → `config` node'ini bosing
2. `primaryNumber` yoki `secondaryNumber` ni o'zgartiring
3. **Save** bosing

### NATIJA

Android app avtomatik yangi raqamlarni oladi!

## ✅ TEST

1. Firebase Console'da **orders** node'ini bosing
2. **+** bosing
3. Yangi order yarating:

```json
{
  "status": "NEW",
  "items": "Test order",
  "total": 50000,
  "callNumbers": ["+998911700916"],
  "orderNumber": 999,
  "customerName": "Test",
  "createdAt": 1750000000000
}
```

4. Android app'da **"📞 NEW ORDER #999!"** logi chiqishi kerak
5. Avtomatik qo'ng'iroq ketishi kerak

## ⚠️ XATOLIKLAR

### "Permission denied"
- Firebase Console → Realtime Database → Rules
- Read/Write = true bo'lishi kerak (test mode)

### "App not connecting"
- `google-services.json` to'g'ri joylanganligini tekshiring
- Package name to'g'ri ekanligini tekshiring: `com.pizzaria.cafecallgateway`
