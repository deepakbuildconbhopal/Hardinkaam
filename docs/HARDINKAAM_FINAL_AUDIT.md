# HARDINKAAM Final Technical Audit Report (Production Stabilization & AI Funnel Automation)

## 1. Authentication & Admin Authorization
- **Cryptographic Token Verification**: All protected `/api/*` endpoints utilize `requireAdminAuth` and `verifyFirebaseIdToken`, cryptographically verifying Firebase ID tokens via Google's public RSA-256 certificates.
- **Role Isolation**: Admin authorization strictly checks authoritative user profiles in Firestore (`users/{uid}`) for `admin`, `super_admin`, or `isSuperAdmin === true`. spoofable client headers (`x-admin-role`, `x-admin-email`) are rejected without valid cryptographic tokens.
- **UI Guard**: Normal customers and service professionals cannot access Admin tabs or panels (enforced via `AdminRouteGuard`).

## 2. Firestore Security Rules (`firestore.rules`)
- **Default Deny**: Unmatched paths are strictly blocked (`allow read, write: if false`).
- **Granular Permissions**: Users can read/write only their own profile (`users/{uid}`) and cash registration approvals (`registration_approvals/{userId}`). Admin collections (`ai_call_*`, `ai_funnel_*`, `bulk_campaigns`) are strictly Admin-only.

## 3. Payment Security & Booking Workflow
- **Server-Authoritative Razorpay**: Customer payments for services go exclusively to HARDINKAAM Admin Razorpay account, verified server-side with cryptographic signature checks (`/api/razorpay/verify`).
- **Commission Model**: Centralized commission calculation engine enforcing a 20% platform share with separate tracking for tips and professional earnings.
- **Itemized Extra Charges**: Service professionals can propose extra items before/during work; customer and admin dual approvals are mandatory before charges enter the final bill.

## 4. AI Security & Gemini Centralization
- **Centralized Model**: All AI features use `gemini-3.8-flash` configured securely on the server (`server/aiConfig.ts`).
- **No Browser Secret Exposure**: Private Gemini API keys and Razorpay secrets are never exposed to the browser.

## 5. AI Funnel Automation Module
- **New Collections**: `ai_funnels`, `ai_funnel_steps`, `ai_funnel_runs`, `ai_funnel_events`.
- **Features**: Lead inbox, AI lead scoring (0-100), deduplication against existing users and marketing leads, AI next-best-action engine, and human approval safeguards for outbound messages.

## 6. AdSense & Spark Quota Guardrails
- **Embedded AdSense**: Google AdSense scripts load once and render inline as medium-sized responsive ad units without fake popups or new browser windows.
- **Spark Optimization**: Unbounded collection scans removed; filtered queries, indexes, and pagination enforced across all admin lists.

## 7. Build & Lint Verification
- **TypeScript Lint**: `npm run lint` (`tsc --noEmit`) passes with zero errors.
- **Production Build**: `npm run build` completes successfully.
