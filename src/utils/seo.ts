export interface SEOProps {
  title: string;
  description: string;
  ogTitle?: string;
  ogDescription?: string;
  ogType?: string;
  url?: string;
  image?: string;
  keywords?: string;
}

/**
 * Updates or creates a <meta> tag in document.head
 */
export function setMetaTag(identifier: string, content: string, isProperty = false): void {
  if (typeof document === 'undefined') return;

  const selector = isProperty
    ? `meta[property="${identifier}"]`
    : `meta[name="${identifier}"]`;

  let element = document.querySelector<HTMLMetaElement>(selector);

  if (!element) {
    element = document.createElement('meta');
    if (isProperty) {
      element.setAttribute('property', identifier);
    } else {
      element.setAttribute('name', identifier);
    }
    document.head.appendChild(element);
  }

  element.setAttribute('content', content);
}

/**
 * Updates or creates a <link rel="canonical"> tag
 */
export function setCanonicalUrl(url: string): void {
  if (typeof document === 'undefined') return;

  let link = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!link) {
    link = document.createElement('link');
    link.setAttribute('rel', 'canonical');
    document.head.appendChild(link);
  }
  link.setAttribute('href', url);
}

/**
 * Dynamically updates document title and Open Graph / SEO meta tags
 */
export function updateDocumentSEO({
  title,
  description,
  ogTitle,
  ogDescription,
  ogType = 'website',
  url,
  image,
  keywords,
}: SEOProps): void {
  if (typeof document === 'undefined') return;

  // 1. Update Document Title
  document.title = title;

  // 2. Standard Meta Description
  setMetaTag('description', description);

  // 3. Keywords & Robots
  if (keywords) {
    setMetaTag('keywords', keywords);
  }
  setMetaTag('robots', 'index, follow');

  // 4. Open Graph Meta Tags (Facebook, WhatsApp, LinkedIn)
  setMetaTag('og:site_name', 'HARDINKAAM', true);
  setMetaTag('og:type', ogType, true);
  setMetaTag('og:title', ogTitle || title, true);
  setMetaTag('og:description', ogDescription || description, true);

  const currentUrl = url || (typeof window !== 'undefined' ? window.location.href : '');
  if (currentUrl) {
    setMetaTag('og:url', currentUrl, true);
    setCanonicalUrl(currentUrl);
  }

  if (image) {
    setMetaTag('og:image', image, true);
    setMetaTag('twitter:image', image);
  }

  // 5. Twitter Meta Tags
  setMetaTag('twitter:card', 'summary_large_image');
  setMetaTag('twitter:title', ogTitle || title);
  setMetaTag('twitter:description', ogDescription || description);
}

export interface CategoryLike {
  id: string;
  name: string;
}

/**
 * Helper to generate contextual SEO title and description based on current app tab and state
 */
export function getContextualSEO({
  currentTab,
  selectedCategory,
  categories = [],
  searchQuery = '',
  selectedLocality = 'Bhopal',
}: {
  currentTab: string;
  selectedCategory?: string | null;
  categories?: CategoryLike[];
  searchQuery?: string;
  selectedLocality?: string;
}): SEOProps {
  const cityLabel = selectedLocality ? selectedLocality.split('(')[0].trim() : 'Bhopal';

  // Category Selected on Home / Categories tab
  if ((currentTab === 'home' || currentTab === 'categories') && selectedCategory) {
    const matchedCategory = categories.find((c) => c.id === selectedCategory);
    let categoryName = matchedCategory ? matchedCategory.name : selectedCategory.replace(/^cat_/, '').replace(/_/g, ' ');
    // Capitalize words
    categoryName = categoryName
      .split(' ')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');

    const title = `HARDINKAAM - Book ${categoryName} Services in ${cityLabel}`;
    const description = `Book verified, Aadhaar & police-checked ${categoryName} professionals in ${cityLabel} on HARDINKAAM. Upfront transparent pricing, 60-min express arrival, and 100% satisfaction assurance.`;

    return {
      title,
      description,
      ogTitle: title,
      ogDescription: description,
      keywords: `HARDINKAAM, ${categoryName} ${cityLabel}, book ${categoryName}, home repair Bhopal, Deepak Buildcon, emergency ${categoryName}`,
    };
  }

  // Active Search Query
  if ((currentTab === 'home' || currentTab === 'categories') && searchQuery.trim().length > 1) {
    const query = searchQuery.trim();
    const title = `HARDINKAAM - Search "${query}" Services in ${cityLabel}`;
    const description = `Search results for "${query}" on HARDINKAAM. Find top-rated verified home service experts and technicians in ${cityLabel}.`;

    return {
      title,
      description,
      ogTitle: title,
      ogDescription: description,
      keywords: `HARDINKAAM, ${query}, home services ${cityLabel}, verified technicians`,
    };
  }

  // Handle Tab-based Routes
  switch (currentTab) {
    case 'categories':
      return {
        title: `HARDINKAAM - All Service Categories in ${cityLabel}`,
        description: `Explore 20+ verified home and commercial service trades in ${cityLabel}: electrical, plumbing, carpentry, AC repair, painting, deep cleaning, and civil construction.`,
        keywords: `HARDINKAAM, service categories, electrician, plumber, carpenter, Bhopal repair services`,
      };

    case 'franchise':
      return {
        title: 'HARDINKAAM - All-India Franchise & Business Partner Network | Deepak Buildcon',
        description: 'Expand your business across India with HARDINKAAM City Franchise. Proven operational blueprint, high ROI, brand equity of Deepak Buildcon, and dedicated support.',
        keywords: 'HARDINKAAM franchise, home service franchise India, business partner opportunity, Deepak Buildcon, startup franchise',
      };

    case 'bookings':
      return {
        title: 'HARDINKAAM - My Bookings & Live Service Tracking',
        description: 'Track your active service orders, verify technician OTPs, reschedule appointments, and access invoice receipts securely.',
        keywords: 'HARDINKAAM bookings, service tracking, order status, OTP verification',
      };

    case 'wallet':
      return {
        title: 'HARDINKAAM - Cash Wallet & Cashback Rewards',
        description: 'Manage your HARDINKAAM cash balance, instant cashback, reward points, and transaction statements.',
        keywords: 'HARDINKAAM wallet, cashback, reward points, payment history',
      };

    case 'profile':
      return {
        title: 'HARDINKAAM - My Account & Profile Settings',
        description: 'Manage your customer profile, saved service addresses in Bhopal, notification preferences, and security settings.',
        keywords: 'HARDINKAAM account, user profile, saved addresses',
      };

    case 'pro_dashboard':
    case 'pro_jobs':
      return {
        title: 'HARDINKAAM Pro - Partner Dashboard & Active Jobs',
        description: 'Accept incoming customer bookings in your locality, track ongoing tasks, verify OTPs, and maximize daily earnings.',
        keywords: 'HARDINKAAM pro dashboard, technician jobs, service partner',
      };

    case 'pro_wallet':
      return {
        title: 'HARDINKAAM Pro - Daily Earnings & Instant Bank Payouts',
        description: 'View daily job earnings, commission statements, incentive bonuses, and withdraw earnings directly to your bank account.',
        keywords: 'HARDINKAAM pro wallet, technician payout, daily earnings',
      };

    case 'pro_kyc':
      return {
        title: 'HARDINKAAM Pro - Aadhaar & Police KYC Verification',
        description: 'Submit your Aadhaar, trade certification, and police verification documents to receive verified technician badge on HARDINKAAM.',
        keywords: 'HARDINKAAM pro KYC, police verification, Aadhaar verification',
      };

    case 'partner_dashboard':
    case 'partner_fleet':
    case 'partner_bookings':
      return {
        title: 'HARDINKAAM Partner - Fleet Management & Dispatch Console',
        description: 'Manage your registered technician fleet, assign service orders, monitor job completion, and track business revenue.',
        keywords: 'HARDINKAAM partner portal, fleet management, technician dispatch',
      };

    case 'admin_dashboard':
      return {
        title: 'HARDINKAAM Admin - Executive Dashboard & Operations Hub',
        description: 'Master operational dashboard monitoring platform metrics, live bookings, revenue analytics, and service coverage.',
      };

    case 'admin_catalog':
      return {
        title: 'HARDINKAAM Admin - Service Catalog & Price Manager',
        description: 'Manage service categories, rate cards, transparent pricing models, and service packages.',
      };

    case 'admin_users':
      return {
        title: 'HARDINKAAM Admin - User Roles & Account Governance',
        description: 'Manage customer accounts, service professionals, business partners, and platform administrators.',
      };

    case 'admin_bookings':
      return {
        title: 'HARDINKAAM Admin - Live Bookings & Dispatch Hub',
        description: 'Real-time booking monitor, manual technician allocation, dispute resolution, and order status audits.',
      };

    case 'admin_kyc':
      return {
        title: 'HARDINKAAM Admin - KYC & Police Verification Audit',
        description: 'Audit and approve Aadhaar, trade certificates, and police verification documents for service partners.',
      };

    case 'admin_whatsapp':
      return {
        title: 'HARDINKAAM Admin - WhatsApp & SMS Notification Logs',
        description: 'Audit automated customer notifications, technician dispatch alerts, and promotional broadcasts.',
      };

    case 'admin_franchise':
      return {
        title: 'HARDINKAAM Admin - All-India Franchise Network Reports',
        description: 'City franchise territory performance, revenue sharing, expansion metrics, and franchise applications.',
      };

    case 'admin_import':
      return {
        title: 'HARDINKAAM Admin - Data Import & Database Upload Studio',
        description: 'Upload and sync CSV, TSV, JSON catalogs, pros and categories directly to Firestore with auto-cleanup and duplicate detection.',
        keywords: 'HARDINKAAM data import, database upload, catalog sync',
      };

    case 'admin_settings':
      return {
        title: 'HARDINKAAM Admin - Platform Settings & Commission Rates',
        description: 'Configure platform commission percentages, wallet referral bonuses, minimum payout thresholds, and support contacts.',
      };

    case 'admin_theme':
      return {
        title: 'HARDINKAAM Admin - Theme Studio & Brand Customizer',
        description: 'Manage custom branding, color palettes, and visual design tokens for the HARDINKAAM platform.',
      };

    case 'home':
    default:
      return {
        title: 'HARDINKAAM - On-Demand Home Services & Verified Professionals in Bhopal',
        description: 'On-demand verified electrician, plumber, carpenter, painter, AC repair, and civil construction services in Bhopal by Deepak Buildcon. Instant booking & transparent pricing.',
        keywords: 'HARDINKAAM, Bhopal home services, electrician Bhopal, plumber Bhopal, carpenter Bhopal, Deepak Buildcon, painter Bhopal, AC repair Bhopal, home repairs, on demand services',
      };
  }
}
