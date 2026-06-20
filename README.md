# RonoHub LR — Native Mobile App (Android APK + iOS IPA)

React Native **Expo** app for **Driver** and **Company Admin** roles. One codebase builds for both Android and iOS, as specified in the LR App brief.

## Prerequisites

- Node.js 20+
- [Expo Go](https://expo.dev/go) on your phone (development), OR Android Studio / Xcode (native builds)
- Backend running: `1/lr-load` Next.js API on port 3000

## Setup

```bash
cd 1/lr-mobile
cp .env.example .env
# Edit .env — use your machine's LAN IP (not localhost) for physical devices:
# EXPO_PUBLIC_API_URL=http://192.168.1.10:3000

npm install
npm start
```

Scan the QR code with Expo Go, or press `a` for Android emulator / `i` for iOS simulator.

## Demo logins

| Role | Mobile | OTP |
|------|--------|-----|
| Driver | 9012345678 | 123456 |
| Company Admin | 9876543210 | 123456 |

After OTP verify, the app routes automatically:
- `driver` → Driver tabs (Home, My LRs, Profile)
- `company_admin` → Admin tabs (Dashboard, LRs, Drivers, Profile)

## Building APK / IPA (production)

Install EAS CLI and configure:

```bash
npm install -g eas-cli
eas login
eas build:configure
```

**Android APK (internal testing):**
```bash
eas build -p android --profile preview
```

**Android AAB (Play Store):**
```bash
eas build -p android --profile production
```

**iOS (TestFlight / App Store):**
```bash
eas build -p ios --profile production
```

## Architecture

```
app/
  index.tsx          Splash → auto-route by auth
  login.tsx          OTP login (shared)
  (driver)/          Driver app — tabs + create LR flow
  (admin)/           Company Admin app — tabs + approve/reject
  submitted.tsx      LR success screen
lib/
  api.ts             REST client with Bearer token auth
  auth.tsx           SecureStore session
```

The mobile app talks to the **same Next.js API** as the web portals (`1/lr-load`). Auth uses `Authorization: Bearer <token>` (cookies are web-only).

## Platform split (per PDF)

| Platform | Technology | Location |
|----------|------------|----------|
| Super Admin | Web only | `1/lr-load` → `/super-admin` |
| Company Admin | **Native app + Web** | `1/lr-mobile` + `/company` |
| Driver | **Native app only** | `1/lr-mobile` |
| QR landing | Web (public) | `1/lr-load` → `/qr/[code]` |

## Next steps for production

- [ ] `expo-image-picker` for goods photos (camera + gallery)
- [ ] Signature pad (`react-native-signature-canvas`)
- [ ] Firebase FCM push notifications
- [ ] EAS production credentials + store listing
- [ ] Point API URL to deployed backend (not localhost)
