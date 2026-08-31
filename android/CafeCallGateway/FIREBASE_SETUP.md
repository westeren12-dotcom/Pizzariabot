# Firebase Setup Guide

## 1. Firebase Console'ga kiring

https://console.firebase.google.com

## 2. Yangi loyiha yarating

1. "Create a project" bosing
2. Loyiha nomi: `pizzaria-cafe-gateway`
3. Google Analytics'ni yoqing/yoqmaslik (ixtiyoriy)
4. "Create project" bosing

## 3. Android app qo'shing

1. Dashboard'da Android ikonkasini bosing
2. Package name: `com.pizzaria.cafecallgateway`
3. App nickname: `Cafe Call Gateway`
4. Debug signing certificate SHA-1 (ixtiyoriy)
5. "Register app" bosing

## 4. google-services.json download

1. "Download google-services.json" bosing
2. Faylni saqlang
3. `android/CafeCallGateway/app/google-services.json` ga joylang

## 5. Dependencies qo'shing

Android Studio avtomatik qo'shadi. Agar qo'shmasa:

`app/build.gradle` ga qo'shing:

```gradle
plugins {
    id 'com.google.gms.google-services'
}

dependencies {
    implementation platform('com.google.firebase:firebase-bom:32.7.0')
    implementation 'com.google.firebase:firebase-database'
    implementation 'com.google.firebase:firebase-messaging'
}
```

## 6. Realtime Database yarating

1. Firebase Console → Build → Realtime Database
2. "Create database" bosing
3. "Start in test mode" tanlang
4. Region tanlang (asia-southeast1 yoki eng yaqin)
5. "Enable" bosing

## 7. Database Rules (Production uchun)

```json
{
  "rules": {
    "orders": {
      ".read": true,
      ".write": true
    }
  }
}
```

> ⚠️ Production'da write rules'ni cheklang!

## 8. Railway Backend ulash

Railway .env'ga qo'shing:

```
FIREBASE_SERVICE_ACCOUNT={"type":"service_account","project_id":"...","private_key":"...","client_email":"..."}
FIREBASE_DATABASE_URL=https://pizzaria-cafe-gateway-default-rtdb.firebaseio.com
```

### Service Account olish

1. Firebase Console → Project Settings (gear icon)
2. "Service accounts" tab
3. "Generate new private key" bosing
4. JSON faylni saqlang
5. Butun JSON'ni `FIREBASE_SERVICE_ACCOUNT` ga qo'shing

## 9. Test Qilish

### 1. Android app'ni ishga tushiring

Firebase Connected deb ko'rsatishi kerak.

### 2. Firebase Console'da test order yarating

Realtime Database → Data → Add data:

```json
{
  "orders": {
    "test1": {
      "status": "NEW",
      "items": "1x Test Burger",
      "total": 35000,
      "callNumbers": ["+998911700916"],
      "customerName": "Test",
      "customerPhone": "+998911700916",
      "district": "Chinobod",
      "paymentType": "Naqd",
      "orderNumber": 1,
      "createdAt": 1750000000000
    }
  }
}
```

### 3. Android app'da qo'ng'iroq ketishi kerak!

## 10. Xatoliklar

### "Permission denied"
- Firebase Console → Realtime Database → Rules
- Read/Write ni true qiling

### "google-services.json not found"
- Faylni to'g'ri joyga qo'ying
- Android Studio'da Sync bosing

### "Firebase not initialized"
- Internetni tekshiring
- `google-services.json` to'g'ri ekanligini tekshiring

---

## 📋 Checklist

- [ ] Firebase loyiha yaratildi
- [ ] Android app qo'shildi
- [ ] `google-services.json` download qilindi
- [ ] `app/` papkaga joylandi
- [ ] Realtime Database yaratildi
- [ ] Railway .env ga qo'shildi
- [ ] Test order yaratildi
- [ ] Android app ishladi

---

**Tayyor!** Endi bot buyurtma qilganda Android app avtomatik qo'ng'iroq qiladi.
