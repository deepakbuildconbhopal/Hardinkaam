export interface ServicePackage {
  id: string;
  title: string;
  subtitle: string;
  tag: string;
  originalPrice: number;
  packagePrice: number;
  discountPercent: number;
  durationMinutes: number;
  imageUrl: string;
  categorySlug: string;
  includedServices: string[];
  features: string[];
}

export const POPULAR_PACKAGES: ServicePackage[] = [
  {
    id: 'pkg_ac_clean_combo',
    title: 'AC Power Jet + Full Home Deep Cleaning',
    subtitle: '1 Split AC Jet Clean + Complete 2BHK Deep Cleaning with machine scrub',
    tag: 'Bestseller Combo',
    originalPrice: 2498,
    packagePrice: 1999,
    discountPercent: 20,
    durationMinutes: 270,
    imageUrl: 'https://images.unsplash.com/photo-1621905252507-b35492cc74b4?w=500&auto=format&fit=crop&q=80',
    categorySlug: 'cleaning',
    includedServices: [
      'Split AC Deep Power Jet Coil Wash',
      '2BHK Kitchen Degreasing & Cabinet Wash',
      'Bathroom Hard Water Stain Descaling',
      'Floor Machine Buffing & Balcony Flush',
    ],
    features: ['7-Day Revisit Warranty', 'Bhopal High-Pressure Gear', 'Police-Verified Crew'],
  },
  {
    id: 'pkg_elec_safety_bundle',
    title: 'Home Electrical Safety & Inspection Pack',
    subtitle: 'Up to 3 Ceiling Fan alignments + 4 Switchboards & MCB Trip check',
    tag: 'Safety First',
    originalPrice: 1195,
    packagePrice: 799,
    discountPercent: 33,
    durationMinutes: 90,
    imageUrl: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=500&auto=format&fit=crop&q=80',
    categorySlug: 'electrician',
    includedServices: [
      '3x Ceiling Fan noise and capacitor service',
      '4x Burnt switch / socket replacements',
      'Main Distribution Box & Inverter Earthing test',
      'Free voltage stabilizer check',
    ],
    features: ['Certified Electricians', 'Genuine Spare parts', 'Same-day slot'],
  },
  {
    id: 'pkg_plumb_monsoon_care',
    title: 'Bathroom & Water Motor Refresh Pack',
    subtitle: 'Motor pump inspection + 2 Leaking Taps + Basin drain unblock',
    tag: 'Zero Leakage',
    originalPrice: 997,
    packagePrice: 699,
    discountPercent: 30,
    durationMinutes: 75,
    imageUrl: 'https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=500&auto=format&fit=crop&q=80',
    categorySlug: 'plumber',
    includedServices: [
      'Water motor priming & seal inspection',
      '2 Chrome tap washer & spindle fix',
      'Kitchen sink / washbasin auger unclog',
      'Water tank overflow valve check',
    ],
    features: ['No mess guarantee', 'Chrome polish included', '30-Day support'],
  },
  {
    id: 'pkg_pest_shield_max',
    title: 'Total Home Pest & Cockroach Shield',
    subtitle: 'Herbal odorless gel for Kitchen + Drain baiting + Ant treatment',
    tag: '100% Child-Safe',
    originalPrice: 899,
    packagePrice: 649,
    discountPercent: 28,
    durationMinutes: 45,
    imageUrl: 'https://images.unsplash.com/photo-1632833239869-a37e3a5806d2?w=500&auto=format&fit=crop&q=80',
    categorySlug: 'pest-control',
    includedServices: [
      'Bayer Maxforce herbal gel in kitchen cabinets',
      'Sink pipe & drain trap treatment',
      'Anti-termite inspection of wooden frames',
      'No need to empty kitchen cabinets',
    ],
    features: ['Odorless chemicals', 'Pet and baby safe', '90-Day efficacy'],
  },
];
