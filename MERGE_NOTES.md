# Merge notes (superhdk.zip base + C.zip landing page)

Base: superhdk.zip (all old features, rules, server.ts, functions, package.json UNCHANGED).
Added from C.zip: new landing page only.

## New files
- src/components/landing/HardinkaamLandingPage.tsx   (new landing, adapted)
- src/components/landing/landing.css                 (landing CSS, scoped under .hdk-landing, keyframes renamed hdk-*)
- src/components/landing/HardinkaamLandingPage.legacy.tsx (old landing backup, not imported)
- src/components/pwa/LandingPWAInstallButton.tsx + src/hooks/usePWAInstall.ts
- src/data/landingServicesData.ts, src/types/landing.ts
- public/images/* (16 service images, logo, hdk, poster)

## Edited files (small edits)
- src/App.tsx: landing props wired; old Navbar hidden only on the landing tab; helpers handleLandingOpenBooking / handleLandingDashboard; AuthModal gets mode
- src/components/auth/AuthModal.tsx: optional `defaultMode` prop ('in' | 'reg')
- index.html: Poppins font link

## Behaviour
- Register / Sign in / role buttons open the app's real AuthModal (registration fee, KYC, OTP flows intact)
- Franchise buttons open the existing Franchise portal (currentTab 'franchise')
- Brand Promoter button opens AuthModal as business_partner (AuthModal has no separate promoter role)
- Service cards -> matches the catalog category by name and opens Home filtered to it
- My Account / dashboard button routes by role: admin -> admin_dashboard, service_man -> pro_dashboard, business_partner -> partner_dashboard, franchise_admin -> franchise, customer -> profile / bookings / wallet
- Landing theme + hero text still come from Firestore cms_configs/cms_global (applied to landing only)

## Removed on purpose
- Landing's own login/register form and the hardcoded admin/franchise logins (admin@hardinkaam.online / franchise@hardinkaam.online with password 123456). If those accounts exist in Firebase Auth, change their passwords.

## Not done / to verify
- Not compiled or run (no network in the build sandbox). Run: npm install && npm run build
- "Admin Login (Direct)" / "Franchise Login (Direct)" buttons are kept visually but now open the normal admin AuthModal / Franchise portal. Remove them from the landing if you do not want them public.
