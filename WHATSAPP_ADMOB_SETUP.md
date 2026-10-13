# HARDINKAAM — OpenWA WhatsApp + AdMob Integration

## OpenWA WhatsApp

The WhatsApp credential shown by the user is an **OpenWA live API key**. OpenWA's documented REST authentication accepts an API key in `X-API-Key`; Bearer authentication is also supported by the OpenWA API. The integration therefore keeps the key server-side and sends it in `X-API-Key`.

Configured server settings:

- Provider: `openwa`
- Base API: `https://openwa.id/api`
- Session name: `support-main`
- API key: stored only in server `.env`

The server resolves the session name with `GET /api/sessions`, then sends text with the OpenWA session route using `POST /api/sessions/{sessionId}/messages/send-text`. The documented payload is `chatId` + `text`.

### Security

- The OpenWA API key is **not** exposed through `VITE_*` variables.
- The browser calls HARDINKAAM `/api/notifications/whatsapp` with the logged-in Firebase ID token.
- HARDINKAAM server calls OpenWA.
- The live API key must never be committed to GitHub or pasted into frontend code.
- The current `.env` file contains the live key for this private deployment archive; keep the ZIP private and rotate the OpenWA key if the archive is shared publicly.

### Booking WhatsApp notifications

The existing booking notification architecture remains in place and WhatsApp is added to the existing flow for:

- Booking created
- Technician accepted
- Technician on the way
- Technician arrived
- Start-service OTP

The Firestore `whatsapp_logs` collection records success/failure and provider message IDs where returned.

### Phone format

10-digit Indian numbers are normalized to `91XXXXXXXXXX` and sent as the OpenWA chat ID `91XXXXXXXXXX@c.us`.

---

## AdMob IDs

- App ID: `ca-app-pub-1925778784615690~2153384953`
- Ad Unit 1: `ca-app-pub-1925778784615690/1200230084`
- Ad Unit 2: `ca-app-pub-1925778784615690/8504005038`
- Ad Unit 3: `ca-app-pub-1925778784615690/6153173866`

The IDs are stored in the environment configuration. Each Ad Unit must be used only with the ad format configured for that unit in the AdMob console.

## Existing HARDINKAAM rules preserved

Ads are not intended for login, OTP verification, booking confirmation, payment/Razorpay, work timer, extra-charge approval, final bill, or other critical flows.
