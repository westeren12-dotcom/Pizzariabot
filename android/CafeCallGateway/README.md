# Cafe Call Gateway - Android App

## 🎯 Maqsad

Pizza Ria Telegram botidan kelgan buyurtmalar uchun avtomatik telefon qo'ng'iroqlarini amalga oshiradi.

## 📱 Qanday ishlaydi

1. Telegram bot yangi buyurtma qabul qiladi
2. Railway backend Firebase'ga order yuboradi
3. Android app Firebase'dan new orderni oladi
4. App SIM kartasi orqali telefon qo'ng'iroq qiladi
5. Kafe egasi telefonni ko'taradi

## 🔧 O'rnatish

### 1. Android Studio'ni oching

### 2. Loyihani import qiling
- File → Open → `android/CafeCallGateway`

### 3. Firebase'ni ulang
- Firebase Console'ga kiring (https://console.firebase.google.com)
- Yangi loyiha yarating
- Android app qo'shing (package: `com.pizzaria.cafecallgateway`)
- `google-services.json` faylni download qiling
- `app/google-services.json` ga joylang

### 4. Build qiling
- Build → Make Project
- Yoki: `./gradlew assembleDebug`

### 5. APK'ni o'rnating
- APK fayl: `app/build/outputs/apk/debug/app-debug.apk`
- Kafedagi Android telefonga o'rnating

## ⚙️ Sozlamalar

### Telefon raqamlarni o'zgartirish

`MainActivity.kt` da:

```kotlin
private var primaryNumber = "+998911700916"
private var secondaryNumber = "+998943941919"
```

Yoki Firebase Realtime Database'da:

```
/orders/{orderId}/callNumbers = ["+998911700916", "+998943941919"]
```

## 🔐 Ruxsatlar

App quyidagi ruxsatlarni so'raydi:

- `CALL_PHONE` — Telefon qo'ng'iroq qilish
- `READ_PHONE_STATE` — Telefon holatini o'qish
- `INTERNET` — Firebase bilan bog'lanish
- `WAKE_LOCK` — Background'da ishlash

## 📋 Firebase Database Structure

```
/orders/{orderId}
  ├── status: "NEW" | "CALLING" | "CALLED"
  ├── items: "2x Burger, 1x Cola"
  ├── total: 85000
  ├── callNumbers: ["+998911700916", "+998943941919"]
  ├── customerName: "Jamshid"
  ├── customerPhone: "+998911700916"
  ├── district: "Chinobod"
  ├── paymentType: "Naqd"
  ├── orderNumber: 152
  └── createdAt: 1750000000000
```

## ⚠️ Muhim Eslatmalar

### Background Mode
- Android 8.0+ da background'da ishlash uchun foreground service kerak
- App ekranda ochiq turganda eng yaxshi ishlaydi
- Screen off bo'lsa ham Firebase listener ishlaydi

### Call Permission
- Birinchi marta app ochilganda ruxsat so'raydi
- Agar ruxsat berilmasa, Settings'dan yoqish kerak

### Firebase Connection
- Internet kerak
- WiFi yoki mobil data ishlaydi

## 🐛 Xatoliklar

### "Call permission denied"
- Settings → Apps → Cafe Call Gateway → Permissions → Phone → Allow

### "Firebase not connecting"
- Internetni tekshiring
- `google-services.json` to'g'ri ekanligini tekshiring

### "Call not making"
- SIM kartani tekshiring
- Telefon raqam to'g'ri ekanligini tekshiring

## 📞 Test Qilish

1. App'ni oching
2. "TEST CALL" tugmasini bosing
3. Primary raqamga qo'ng'iroq ketishi kerak

## 🔄 Flow

```
Mijoz buyurtma beradi
        ↓
Telegram Bot
        ↓
Railway Backend
        ↓
Firebase Realtime Database
        ↓
Android Gateway
        ↓
SIM Card → Telefon qo'ng'iroq
        ↓
Kafe egasi javob beradi
```

## 💡 Maslahatlar

1. App'ni doimo ochiq holda saqlang
2. Telefon zaryadda bo'lsin
3. WiFi ga ulang
4. Firebase connection'ni tekshirib turing

---

**Version:** 1.0
**Developer:** Pizza Ria Tech Team
