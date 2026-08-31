# Cafe Call Gateway

## 🎯 Maqsad

Pizza Ria Telegram botidan kelgan buyurtmalar uchun avtomatik telefon qo'ng'iroqlarini amalga oshiradi.

## 📱 Qanday ishlaydi

```
Mijoz buyurtma beradi
        ↓
Telegram Bot → Railway Backend
        ↓
Firebase Realtime Database
        ↓
📱 Cafe Call Gateway App
        ↓
SIM kartasi → Telefon qo'ng'iroq
        ↓
📞 Admin javob beradi
```

## 🔧 HARDWARE KERAK

### ❌ GSM Desk Phone yetarli EMAS

GSM desk phone (domashniy telefon) faqat qo'lda ishlatiladi — uni dasturiy boshqarish mumkin emas (model bilmasdan).

### ✅ KERAKLI QURILMA: ARZON ANDROID TELEFON

| Xususiyat | Tavsif |
|-----------|--------|
| Narx | ~$50-100 |
| Model | Har qanday Android 8.0+ |
| SIM | +998943941919 qo'yiladi |
| Internet | WiFi yoki mobil data |
| Joylashuv | Kafeda, doimo zaryadda |

### 📋 Qanday qilish:

1. **Arzon Android telefon sotib oling** (~$50-100)
2. **SIM kartani qo'shing** (+998943941919)
3. **Cafe Call Gateway app'ni o'rnating**
4. **Firebase'ga ulang**
5. **Doimo ochiq turing**

## 📲 O'RATISH

### 1. Firebase sozlash

Firebase Console → Project Settings → General → Firebase SDK Snippet → Config

`google-services.json` faylini download qiling va `app/` papkasiga joylang.

### 2. Firebase Database Config

Firebase Realtime Database'ga shu ma'lumotlarni kiriting:

```
/config
  ├── primaryNumber: "+998911700916"
  ├── secondaryNumber: "+998943941919"
  └── gatewaySim: "+998943941919"
```

### 3. Android Studio'da build

```bash
# Loyihani oching
File → Open → android/CafeCallGateway

# Build qiling
Build → Make Project

# APK oling
Build → Build Bundle(s) / APK(s) → Build APK(s)
```

### 4. APK'ni o'rnating

1. APK faylini telefonga yuklang
2. **Settings → Security → Unknown Sources** yoqing
3. O'rnating
4. App'ni oching
5. **CALL_PHONE** ruxsatini bering
6. **"🟢 Firebase Connected"** ko'rinishi kerak

## ⚙️ SOZLAMALAR

### Telefon raqamlarni o'zgartirish

**Variant 1: Firebase'dan** (tavsiya etiladi)

Firebase Console → Realtime Database → config → raqamlarni o'zgartiring

**Variant 2: Kod'dan**

`MainActivity.kt` da:
```kotlin
private var primaryNumber = "+998911700916"
private var secondaryNumber = "+998943941919"
private var gatewaySim = "+998943941919"
```

## 🔄 ORDER FLOW

```
1. Mijoz Telegram'da buyurtma beradi
2. Railway backend Firebase'ga order yuboradi:
   /orders/152 = {
     status: "NEW",
     items: "2x Burger",
     total: 85000,
     callNumbers: ["+998911700916", "+998943941919"]
   }
3. Android app Firebase'dan "NEW" order'ni topadi
4. Status → "CALLING"
5. Birinchi raqamga qo'ng'iroq (+998911700916)
6. 30 soniya kutadi
7. Ikkinchi raqamga qo'ng'iroq (+998943941919)
8. Status → "CALLED"
```

## 🔐 RUXSATLAR

- `CALL_PHONE` — Qo'ng'iroq qilish
- `READ_PHONE_STATE` — Telefon holati
- `INTERNET` — Firebase bilan bog'lanish
- `WAKE_LOCK` — Background'da ishlash
- `FOREGROUND_SERVICE` — Doimo ishlash
- `RECEIVE_BOOT_COMPLETED` — Yoqilganda avtomatik boshlash

## ⚠️ MUHIM ESLATMALAR

### Background Mode
- App **doimo ochiq** turishi kerak
- **Foreground service** avtomatik yoqiladi
- **Wake lock** 1 soat davomida saqlaydi
- **Boot receiver** telefon yoqilganda avtomatik boshlaydi

### Internet
- **WiFi** yoki **mobil data** kerak
- Firebase connection doimo bo'lishi kerak

### Zaryad
- Telefon **doimo zaryadda** turishi kerak
- USB zaryadga ulang

## 🐛 XATOLIKLAR

### "Firebase not connecting"
- Internetni tekshiring
- `google-services.json` to'g'ri ekanligini tekshiring

### "Call permission denied"
- Settings → Apps → Cafe Call Gateway → Permissions → Phone → Allow

### "Call not making"
- SIM kartani tekshiring
- Telefon raqam to'g'ri ekanligini tekshiring

## 📞 TEST

1. App'ni oching
2. **"TEST CALL"** tugmasini bosing
3. Primary raqamga qo'ng'iroq ketishi kerak
4. Firebase'da order yarating — avtomatik qo'ng'iroq ketishi kerak

## 📊 FIREBASE DATABASE STRUCTURE

```
/config
  ├── primaryNumber: "+998911700916"
  ├── secondaryNumber: "+998943941919"
  └── gatewaySim: "+998943941919"

/orders/{orderId}
  ├── status: "NEW" | "CALLING" | "CALLED"
  ├── items: "2x Burger, 1x Cola"
  ├── total: 85000
  ├── callNumbers: ["+998911700916", "+998943941919"]
  ├── gatewaySim: "+998943941919"
  ├── customerName: "Jamshid"
  ├── customerPhone: "+998911700916"
  ├── district: "Chinobod"
  ├── paymentType: "Naqd"
  ├── orderNumber: 152
  └── createdAt: 1750000000000
```

---

**Version:** 2.0
**Developer:** Pizza Ria Tech Team
