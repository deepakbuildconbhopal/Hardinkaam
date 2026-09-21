import React from 'react';
import {
  X,
  Star,
  Clock,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Plus,
  Minus,
  ShoppingCart,
  ChevronRight,
  Heart,
  Share2,
} from 'lucide-react';
import { Service, ServiceMan } from '../../types';
import { useCart } from '../../context/CartContext';
import { useFavourites } from '../../context/FavouritesContext';
import { useLanguage } from '../../context/LanguageContext';
import { LazyImage } from '../common/LazyImage';

interface Props {
  service: Service | null;
  allServices: Service[];
  onClose: () => void;
  onBookNow: (service: Service, preferredPro?: ServiceMan) => void;
}

export const ServiceDetailModal: React.FC<Props> = ({
  service,
  allServices,
  onClose,
  onBookNow,
}) => {
  const { addItem, getItemQuantity, updateQuantity } = useCart();
  const { isFavouriteService, toggleFavouriteService } = useFavourites();
  const { t, language } = useLanguage();

  if (!service) return null;

  const currentQty = getItemQuantity(service.id);
  const isFav = isFavouriteService(service.id);

  // Related services in same category
  const relatedServices = allServices
    .filter((s) => s.categoryId === service.categoryId && s.id !== service.id)
    .slice(0, 3);

  // Dynamic Inclusions / Exclusions based on service category
  const getInclusions = () => {
    if (service.categoryId === 'cat_construction_labour') {
      return [
        'Dedicated energetic site helper / labour squad',
        'Material loading, stacking, excavation & debris collection',
        'Strict 8-hour shift compliance with lunch break monitoring',
        'Direct site supervisor coordination & attendance verification',
      ];
    }
    if (service.categoryId === 'cat_raj_mistri') {
      return [
        'Experienced master mason (Raj Mistri) with precision tools',
        'Line dori, spirit level alignment & plumb bob verification',
        'Strong cement-sand mortar mixing guidance & joint filling',
        'Curing guidance and clean workmanship finish',
      ];
    }
    if (service.categoryId === 'cat_civil_contractor' || service.categoryId === 'cat_building_contractor') {
      return [
        'Comprehensive on-site technical inspection and measurement',
        'Bill of Quantities (BOQ) & itemized milestone estimate',
        'Quality inspection of steel reinforcement, shuttering & concrete',
        'Dedicated site manager and timely project execution roadmap',
      ];
    }
    if (service.categoryId === 'cat_fabrication_welding' || service.categoryId === 'cat_heavy_fabrication') {
      return [
        'Heavy-duty industrial welding machine & safety gear included',
        'Accurate laser/tape measurement and anti-corrosion primer coating',
        'High-strength structural joint weld with slag cleanup',
        'On-site fitment, alignment, hinges & latch testing',
      ];
    }
    if (service.categoryId === 'cat_fencing_boundary') {
      return [
        'Accurate perimeter survey & post hole alignment',
        'High-strength hot-dip galvanized wire mesh or precast RCC panels',
        'Heavy concrete footing grouting for all support posts',
        'Tension wire tightening and intruder-proof corner brackets',
      ];
    }
    if (service.categoryId === 'cat_security_manpower') {
      return [
        '100% police-verified and trained security personnel',
        'Clean uniform with badge, baton, torch & visitor log registry',
        '24x7 emergency control room backup support',
        'Active perimeter patrolling & gate access control',
      ];
    }
    if (service.categoryId === 'cat_infrastructure_crane') {
      return [
        'RTO-certified crane / earthmover with fitness documentation',
        'Highly skilled, licensed crane operator & safety rigger',
        'Heavy-duty lifting slings, D-shackles & safety barricading',
        'Pre-operation hydraulic & load chart inspection',
      ];
    }
    if (service.categoryId === 'cat_material_labour') {
      return [
        'All branded top-grade materials (UltraTech/ACC Cement, Fe550D TMT Steel, Narmada River Sand)',
        'Full skilled artisan & labour squad included under one transparent rate',
        'Engineered shuttering, vibrator compaction & curing protocols',
        'Zero hidden charges, comprehensive warranty on structural integrity',
      ];
    }
    if (service.categoryId === 'cat_ac_appliance') {
      return [
        'Indoor unit high-pressure jet cleaning with protective kit',
        'Outdoor unit fin wash and dust unclogging',
        'Cooling coil deep foam wash and deodorization',
        'Gas pressure check and operating temperature diagnosis',
      ];
    }
    if (service.categoryId === 'cat_cleaning') {
      return [
        'Single-disc heavy machine floor buffing and stain treatment',
        'Sanitizing hard-water scale on bathroom tiles & fixtures',
        'Kitchen slab degreasing, cabinet exterior & chimney wipe',
        'Balcony wash, fan cleaning & glass window buffing',
      ];
    }
    if (service.categoryId === 'cat_electrician') {
      return [
        'Complete circuit safety & load testing',
        'Heavy-duty connector joints with insulating tape',
        'Capacitor & blade angle calibration for ceiling fans',
        'MCB trip resistance check and post-job voltage test',
      ];
    }
    if (service.categoryId === 'cat_plumber') {
      return [
        'Teflon tape sealing and leakage verification',
        'Spindle washer repair and chrome bibcock seating',
        'Motor prime suction test and vibration dampening check',
        'Chemical and mechanical auger snake block removal',
      ];
    }
    return [
      'Experienced background-checked technician visit',
      'Standard toolkit and safety gear included',
      'Post-service area cleanup and demo',
      'Free 7-day warranty on all workmanship',
    ];
  };

  const getExclusions = () => [
    'Major hardware or replacement spare parts cost (charged at actual MRP invoice)',
    'Concealed masonry or brick-breaking wiring / piping unless requested as addon',
    'Hauling debris out of campus or high-altitude exterior scaffold works',
  ];

  const getFAQs = () => [
    {
      q: language === 'hi' ? 'क्या कारीगर पुलिस वेरिफाइड है?' : 'Is the technician background-verified?',
      a: language === 'hi'
        ? 'हाँ, HARDINKAAM के सभी सर्विस प्रो का आधार, कौशल प्रमाणन एवं पुलिस सत्यापन अनिवार्य रूप से किया गया है।'
        : 'Yes, every technician on HARDINKAAM undergoes mandatory Aadhaar check, skill certification, and police background verification.',
    },
    {
      q: language === 'hi' ? 'काम के बाद कोई खराबी आने पर क्या होगा?' : 'What if an issue recurs after service?',
      a: language === 'hi'
        ? 'आपको 7 दिनों की री-विजिट वारंटी मिलती है। कोई भी समस्या आने पर हमारे प्रो बिना अतिरिक्त विजिट चार्ज के समस्या दूर करेंगे।'
        : 'You are protected by our 7-Day Service Warranty. If any related issue arises, our technician will revisit and resolve it free of visit charges.',
    },
    {
      q: language === 'hi' ? 'भुगतान कब और कैसे करना होगा?' : 'When and how do I pay?',
      a: language === 'hi'
        ? 'आप काम पूरी तरह से संतुष्ट होकर पूरा होने के बाद कैश, UPI (Google Pay, PhonePe, Paytm) या कार्ड से सुरक्षित भुगतान कर सकते हैं।'
        : 'You only pay after the job is completed to your satisfaction. You can pay via Cash, UPI (PhonePe, GPay, Paytm), or Card.',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-950/70 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-stone-200 overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Header with image */}
        <div className="relative h-56 sm:h-64 w-full bg-stone-100 flex-shrink-0">
          <LazyImage
            src={service.imageUrl || 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=800&auto=format&fit=crop&q=80'}
            alt={service.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-stone-950/80 via-stone-950/20 to-transparent"></div>

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-black/50 text-white hover:bg-black/75 transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Favourite button */}
          <button
            onClick={() => toggleFavouriteService(service.id)}
            className={`absolute top-4 left-4 p-2 rounded-full backdrop-blur-md transition-colors cursor-pointer ${
              isFav ? 'bg-rose-500 text-white' : 'bg-black/50 text-white hover:bg-black/75'
            }`}
            title="Toggle favourite"
          >
            <Heart className={`w-5 h-5 ${isFav ? 'fill-white' : ''}`} />
          </button>

          {/* Service Title & Rating Banner */}
          <div className="absolute bottom-4 left-4 right-4 text-white">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2.5 py-0.5 rounded-full bg-orange-600 text-[11px] font-bold uppercase tracking-wider">
                {service.categoryName}
              </span>
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/40 backdrop-blur-xs text-amber-300 text-xs font-bold">
                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                <span>{service.rating}</span>
                <span className="text-stone-300 font-normal">({service.ratingCount} reviews)</span>
              </div>
            </div>
            <h2 className="text-xl sm:text-2xl font-black leading-tight text-white drop-shadow-sm">
              {service.name}
            </h2>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1 text-stone-800">
          {/* Price & Duration highlight */}
          <div className="flex items-center justify-between p-4 rounded-2xl bg-orange-50/70 border border-orange-200/80">
            <div>
              <span className="text-xs text-orange-950/70 font-semibold block uppercase tracking-wider">
                {t('startingAt', 'Starting from')}
              </span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-black text-stone-900">₹{service.basePrice}</span>
                <span className="text-xs text-stone-500 font-medium">/ {service.priceUnit}</span>
              </div>
            </div>

            <div className="flex items-center gap-4 text-xs font-semibold text-stone-600">
              <div className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-orange-600" />
                <span>{service.durationMinutes} {t('mins', 'mins')}</span>
              </div>
              <div className="flex items-center gap-1.5 text-emerald-700 bg-emerald-100/80 px-2.5 py-1 rounded-full">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>7-Day Warranty</span>
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <h4 className="text-sm font-bold text-stone-900 mb-1.5">About this service</h4>
            <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">{service.description}</p>
          </div>

          {/* What's Included */}
          <div>
            <h4 className="text-sm font-bold text-stone-900 mb-2.5 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" /> What is included
            </h4>
            <ul className="space-y-2">
              {getInclusions().map((inc, idx) => (
                <li key={idx} className="flex items-start gap-2 text-xs sm:text-sm text-stone-600">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 flex-shrink-0" />
                  <span>{inc}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* What's Excluded */}
          <div>
            <h4 className="text-sm font-bold text-stone-900 mb-2.5 flex items-center gap-1.5">
              <XCircle className="w-4 h-4 text-rose-500" /> What is not included
            </h4>
            <ul className="space-y-2">
              {getExclusions().map((exc, idx) => (
                <li key={idx} className="flex items-start gap-2 text-xs sm:text-sm text-stone-500">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-400 mt-1.5 flex-shrink-0" />
                  <span>{exc}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Preparation & Requirements */}
          <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 text-xs sm:text-sm text-stone-600">
            <h5 className="font-bold text-stone-900 mb-1">Customer Preparation Note:</h5>
            <p>
              Please ensure continuous water &amp; electrical supply is available at your premises during the service. Our technician carries all specialized machinery and testing meters.
            </p>
          </div>

          {/* FAQs */}
          <div>
            <h4 className="text-sm font-bold text-stone-900 mb-3 flex items-center gap-1.5">
              <HelpCircle className="w-4 h-4 text-orange-600" /> Frequently Asked Questions
            </h4>
            <div className="space-y-3">
              {getFAQs().map((faq, idx) => (
                <div key={idx} className="p-3.5 rounded-xl bg-stone-50 border border-stone-200">
                  <p className="text-xs font-bold text-stone-900 mb-1">{faq.q}</p>
                  <p className="text-xs text-stone-600 leading-relaxed">{faq.a}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Frequently Booked Together */}
          {relatedServices.length > 0 && (
            <div>
              <h4 className="text-sm font-bold text-stone-900 mb-3">Frequently Booked Together</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {relatedServices.map((rel) => (
                  <div
                    key={rel.id}
                    className="p-3 rounded-xl border border-stone-200 flex items-center justify-between gap-2 hover:border-orange-300 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-stone-900 truncate">{rel.name}</p>
                      <p className="text-[11px] text-stone-500 font-medium">₹{rel.basePrice} • {rel.durationMinutes} mins</p>
                    </div>
                    <button
                      onClick={() => addItem(rel, 1)}
                      className="px-2.5 py-1 rounded-lg bg-orange-50 hover:bg-orange-100 text-orange-700 text-xs font-bold border border-orange-200 cursor-pointer flex-shrink-0"
                    >
                      + Add
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 bg-white border-t border-stone-200 flex items-center justify-between gap-3">
          {/* Cart Quantity Adjuster */}
          {currentQty > 0 ? (
            <div className="flex items-center gap-2 bg-orange-50 border border-orange-200 rounded-xl px-2 py-1.5">
              <button
                onClick={() => updateQuantity(`cart_srv_${service.id}`, currentQty - 1)}
                className="p-1 rounded-lg bg-white text-orange-700 hover:bg-orange-100 transition-colors cursor-pointer"
                title="Decrease"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <span className="text-xs font-bold text-orange-950 px-2">{currentQty} in cart</span>
              <button
                onClick={() => updateQuantity(`cart_srv_${service.id}`, currentQty + 1)}
                className="p-1 rounded-lg bg-white text-orange-700 hover:bg-orange-100 transition-colors cursor-pointer"
                title="Increase"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => addItem(service, 1)}
              className="px-4 py-3 rounded-xl border border-stone-300 hover:border-orange-500 text-stone-700 hover:text-orange-600 font-bold text-xs sm:text-sm flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <ShoppingCart className="w-4 h-4" /> {t('addToCart', 'Add to Cart')}
            </button>
          )}

          {/* Direct Instant Booking */}
          <button
            onClick={() => {
              onClose();
              onBookNow(service);
            }}
            className="flex-1 max-w-xs px-6 py-3 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-black text-xs sm:text-sm shadow-md hover:shadow-lg transition-all cursor-pointer flex items-center justify-center gap-1.5"
          >
            {t('bookNow', 'Book Now')} <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
