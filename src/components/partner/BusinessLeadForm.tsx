import React, { useState } from 'react';
import { Building2, Send, RefreshCw, ShieldCheck, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { createBusinessLead, MarketingLead } from '../../services/marketingLeadsService';

interface BusinessLeadFormProps {
  onSuccess?: (lead: MarketingLead) => void;
  onCancel?: () => void;
  className?: string;
}

export const BusinessLeadForm: React.FC<BusinessLeadFormProps> = ({
  onSuccess,
  onCancel,
  className = '',
}) => {
  const { userProfile } = useAuth();

  const [businessName, setBusinessName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [businessType, setBusinessType] = useState('Electrician & Electrical Services');
  const [city, setCity] = useState(userProfile?.city || 'Bhopal');
  const [area, setArea] = useState('');
  const [requiredService, setRequiredService] = useState('');
  const [requirement, setRequirement] = useState('');
  const [notes, setNotes] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessSuccessMsg] = useState<string | null>(null);

  // Partner attribution parameters derived automatically from authenticated user context
  const referrerUid = userProfile?.id || '';
  const referrerRole = userProfile?.role || 'business_partner';
  const referralCode =
    userProfile?.referralCode ||
    userProfile?.memberCode ||
    userProfile?.franchiseCode ||
    'HDK-REF';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessSuccessMsg(null);

    if (!businessName.trim()) {
      setError('Business Name (फर्म/दुकान का नाम) is required.');
      return;
    }

    if (!phone.trim() || phone.replace(/\D/g, '').length < 10) {
      setError('Please enter a valid 10-digit mobile phone number.');
      return;
    }

    setIsSubmitting(true);

    try {
      const createdLead = await createBusinessLead(
        {
          businessName: businessName.trim(),
          contactPerson: contactPerson.trim(),
          phone: phone.trim(),
          email: email.trim(),
          businessType,
          city: city.trim() || 'Bhopal',
          area: area.trim(),
          requiredService: requiredService.trim(),
          requirement: requirement.trim(),
          notes: notes.trim(),
        },
        {
          id: referrerUid || 'partner_user',
          role: referrerRole,
          referralCode,
        }
      );

      setSuccessSuccessMsg('Business lead submitted successfully to marketing_leads repository!');
      
      // Reset form fields
      setBusinessName('');
      setContactPerson('');
      setPhone('');
      setEmail('');
      setArea('');
      setRequiredService('');
      setRequirement('');
      setNotes('');

      if (onSuccess) {
        onSuccess(createdLead);
      }
    } catch (err: any) {
      console.error('Failed to submit business lead:', err);
      setError(err?.message || 'Failed to submit business lead. Please check network connection.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={`bg-white rounded-3xl border border-stone-200 p-6 shadow-sm ${className}`}>
      <div className="flex items-center justify-between pb-4 mb-4 border-b border-stone-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-stone-900">
              Bring Business to HARDINKAAM (Business Lead Form)
            </h2>
            <p className="text-xs text-stone-500">
              Submit commercial client requirements linked directly to your referral attribution.
            </p>
          </div>
        </div>

        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="text-stone-400 hover:text-stone-700 text-sm font-bold p-1 rounded-lg"
          >
            ✕
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="mb-4 p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Business Name & Contact Person */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1">
              Business Name / Firm Name (फर्म या दुकान का नाम) <span className="text-rose-600">*</span>
            </label>
            <input
              type="text"
              required
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="e.g. Bhopal Hardware & Electricals"
              className="w-full p-2.5 text-xs rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1">
              Contact Person (संपर्क व्यक्ति का नाम)
            </label>
            <input
              type="text"
              value={contactPerson}
              onChange={(e) => setContactPerson(e.target.value)}
              placeholder="e.g. Ramesh Kumar Sharma"
              className="w-full p-2.5 text-xs rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
            />
          </div>
        </div>

        {/* Mobile & Email */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1">
              Mobile Number (10 अंकों का मोबाइल नंबर) <span className="text-rose-600">*</span>
            </label>
            <input
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. 9826012345"
              className="w-full p-2.5 text-xs rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1">
              Email Address (ईमेल - ऐच्छिक)
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. contact@bhopalhardware.com"
              className="w-full p-2.5 text-xs rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
            />
          </div>
        </div>

        {/* Business Type & Required Service */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1">
              Business Type (व्यापार/श्रेणी का प्रकार)
            </label>
            <select
              value={businessType}
              onChange={(e) => setBusinessType(e.target.value)}
              className="w-full p-2.5 text-xs rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none bg-white"
            >
              <option value="Electrician & Electrical Services">Electrician &amp; Electrical Services</option>
              <option value="Plumber & Sanitary Works">Plumber &amp; Sanitary Works</option>
              <option value="Civil Contractor & Mason">Civil Contractor &amp; Mason (राजमिस्त्री)</option>
              <option value="AC & Appliance Repair">AC &amp; Appliance Repair</option>
              <option value="Carpenter & Modular Furniture">Carpenter &amp; Modular Furniture</option>
              <option value="Painter & Waterproofing">Painter &amp; Waterproofing</option>
              <option value="Deep Home & Office Cleaning">Deep Home &amp; Office Cleaning</option>
              <option value="Commercial Establishment / Hotel">Commercial Establishment / Hotel / Shop</option>
              <option value="Other Commercial Business">Other Commercial Service Need</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1">
              Required Service (आवश्यक सर्विस)
            </label>
            <input
              type="text"
              value={requiredService}
              onChange={(e) => setRequiredService(e.target.value)}
              placeholder="e.g. Full Shop Wiring & MCB Installation"
              className="w-full p-2.5 text-xs rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
            />
          </div>
        </div>

        {/* City & Area / Location */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1">
              City / District (शहर या जिला)
            </label>
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Bhopal"
              className="w-full p-2.5 text-xs rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1">
              Area / Locality / Address (इलाका / पता)
            </label>
            <input
              type="text"
              value={area}
              onChange={(e) => setArea(e.target.value)}
              placeholder="e.g. MP Nagar Zone 1, Near City Hospital"
              className="w-full p-2.5 text-xs rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
            />
          </div>
        </div>

        {/* Requirement Details */}
        <div>
          <label className="block text-xs font-bold text-stone-700 mb-1">
            Requirement Details (विशेष आवश्यकताएं/विवरण)
          </label>
          <input
            type="text"
            value={requirement}
            onChange={(e) => setRequirement(e.target.value)}
            placeholder="e.g. Need 3 senior technicians for 5-day commercial project"
            className="w-full p-2.5 text-xs rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
          />
        </div>

        {/* Notes */}
        <div>
          <label className="block text-xs font-bold text-stone-700 mb-1">
            Additional Notes / Instructions (अतिरिक्त टिप्पणी)
          </label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Enter additional remarks, preferred contact times, or special details..."
            className="w-full p-2.5 text-xs rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none resize-none"
          />
        </div>

        {/* Locked Attribution Banner */}
        <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200 text-[11px] text-stone-600 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 font-semibold text-emerald-700">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Automatic Partner Attribution (Locked)</span>
          </div>
          <div className="flex items-center gap-3 font-mono text-[10px]">
            <span>UID: <strong className="text-stone-800">{referrerUid || 'N/A'}</strong></span>
            <span>Role: <strong className="text-stone-800">{referrerRole}</strong></span>
            <span>Ref Code: <strong className="text-emerald-700">{referralCode}</strong></span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-stone-600 hover:bg-stone-100 transition-colors"
            >
              Cancel
            </button>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all cursor-pointer flex items-center gap-2"
          >
            {isSubmitting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Submitting Lead...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Submit Business Lead</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
