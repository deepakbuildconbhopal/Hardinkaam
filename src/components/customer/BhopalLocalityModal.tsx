import React, { useState } from 'react';
import { MapPin, Search, Navigation, Check, X, Building2, AlertCircle } from 'lucide-react';
import { BHOPAL_LOCALITIES } from '../../utils/translations';
import { ALL_INDIA_LOCATIONS } from '../../data/indiaLocations';
import { useLanguage } from '../../context/LanguageContext';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  selectedLocality: string;
  onSelectLocality: (locality: string) => void;
}

export const BhopalLocalityModal: React.FC<Props> = ({
  isOpen,
  onClose,
  selectedLocality,
  onSelectLocality,
}) => {
  const { t } = useLanguage();
  const [tab, setTab] = useState<'bhopal' | 'other_districts'>('bhopal');
  const [search, setSearch] = useState('');
  const [isDetecting, setIsDetecting] = useState(false);

  if (!isOpen) return null;

  const filteredLocalities = BHOPAL_LOCALITIES.filter((loc) =>
    loc.toLowerCase().includes(search.toLowerCase())
  );

  // Flatten all India districts for search
  const allDistricts = ALL_INDIA_LOCATIONS.flatMap((state) =>
    state.districts.map((d) => ({
      district: d.district,
      hindiDistrict: d.hindiDistrict,
      state: state.state,
      hindiState: state.hindiState,
      isActive: ['bhopal', 'gwalior'].includes(d.district.toLowerCase()),
    }))
  ).filter((d) =>
    d.district.toLowerCase().includes(search.toLowerCase()) ||
    d.hindiDistrict.toLowerCase().includes(search.toLowerCase()) ||
    d.state.toLowerCase().includes(search.toLowerCase())
  );

  const handleUseCurrentLocation = () => {
    setIsDetecting(true);
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (_pos) => {
          setIsDetecting(false);
          onSelectLocality('MP Nagar (Zone 1 & 2)');
          onClose();
        },
        (_err) => {
          setIsDetecting(false);
          onSelectLocality('Arera Colony (E1-E7)');
          onClose();
        },
        { timeout: 5000 }
      );
    } else {
      setIsDetecting(false);
      onSelectLocality('MP Nagar (Zone 1 & 2)');
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-950/70 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-stone-200 overflow-hidden my-auto max-h-[88vh] flex flex-col">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-stone-200 flex items-center justify-between bg-stone-50">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-orange-100 text-orange-600">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-extrabold text-stone-900">
                {t('whereDoYouNeedService', 'Where do you need service?')}
              </h3>
              <p className="text-[11px] text-stone-500 font-medium">स्थान या जिला चुनें (Select Locality / District)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-stone-200/60 text-stone-400 hover:text-stone-700 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs: Bhopal vs Other Districts */}
        <div className="flex border-b border-stone-200 bg-stone-100/60 p-1">
          <button
            type="button"
            onClick={() => setTab('bhopal')}
            className={`flex-1 py-2 text-xs font-black rounded-xl transition-all cursor-pointer ${
              tab === 'bhopal'
                ? 'bg-white text-orange-600 shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            भोपाल क्षेत्र (Bhopal)
          </button>
          <button
            type="button"
            onClick={() => setTab('other_districts')}
            className={`flex-1 py-2 text-xs font-black rounded-xl transition-all cursor-pointer ${
              tab === 'other_districts'
                ? 'bg-white text-orange-600 shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            अन्य जिले (Other Districts)
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          {tab === 'bhopal' && (
            <button
              type="button"
              onClick={handleUseCurrentLocation}
              disabled={isDetecting}
              className="w-full p-3 rounded-2xl bg-orange-50 border border-orange-200 hover:bg-orange-100/70 transition-colors flex items-center gap-3 text-left cursor-pointer group"
            >
              <div className="w-9 h-9 rounded-xl bg-orange-600 text-white flex items-center justify-center group-hover:scale-105 transition-transform">
                <Navigation className={`w-4 h-4 ${isDetecting ? 'animate-spin' : ''}`} />
              </div>
              <div>
                <span className="text-xs font-bold text-orange-950 block">
                  {isDetecting ? 'Detecting GPS location...' : t('useCurrentLocation', 'Use My Current Location')}
                </span>
                <span className="text-[11px] text-orange-800/80">Auto-detect via GPS (Bhopal)</span>
              </div>
            </button>
          )}

          {/* Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={
                tab === 'bhopal'
                  ? 'Search locality (e.g. MP Nagar, Arera Colony, Kolar)...'
                  : 'Search district (e.g. Gwalior, Indore, Jabalpur)...'
              }
              className="w-full pl-10 pr-4 py-2.5 text-xs rounded-xl bg-stone-50 border border-stone-200 focus:bg-white focus:border-orange-500 focus:outline-hidden text-stone-800"
            />
          </div>

          {/* Localities / Districts List */}
          {tab === 'bhopal' ? (
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wider px-1">
                Popular Localities in Bhopal
              </p>
              <div className="max-h-60 overflow-y-auto space-y-1 pr-1">
                {filteredLocalities.map((loc) => {
                  const isSelected = selectedLocality === loc;
                  return (
                    <button
                      key={loc}
                      type="button"
                      onClick={() => {
                        onSelectLocality(loc);
                        onClose();
                      }}
                      className={`w-full p-2.5 rounded-xl text-left text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-orange-600 text-white shadow-xs'
                          : 'hover:bg-stone-100 text-stone-700'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <MapPin className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : 'text-stone-400'}`} />
                        {loc}
                      </span>
                      {isSelected && <Check className="w-4 h-4 text-white" />}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wider px-1">
                All-India Districts Network
              </p>
              <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1">
                {allDistricts.slice(0, 40).map((d) => {
                  const districtLabel = `${d.district} (${d.hindiDistrict}), ${d.state}`;
                  const isSelected = selectedLocality.includes(d.district);
                  return (
                    <button
                      key={`${d.state}-${d.district}`}
                      type="button"
                      onClick={() => {
                        onSelectLocality(districtLabel);
                        onClose();
                      }}
                      className={`w-full p-2.5 rounded-xl text-left text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-orange-600 text-white shadow-xs'
                          : 'hover:bg-stone-100 text-stone-700'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Building2 className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : 'text-stone-400'}`} />
                        <div>
                          <div className="font-bold">
                            {d.hindiDistrict} ({d.district})
                          </div>
                          <div className={`text-[10px] ${isSelected ? 'text-white/80' : 'text-stone-400'}`}>
                            {d.hindiState} ({d.state})
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                            d.isActive
                              ? isSelected
                                ? 'bg-white/20 text-white'
                                : 'bg-emerald-100 text-emerald-800'
                              : isSelected
                              ? 'bg-white/20 text-white'
                              : 'bg-stone-200 text-stone-600'
                          }`}
                        >
                          {d.isActive ? 'सक्रिय (Live)' : 'जल्द आ रहा है'}
                        </span>
                        {isSelected && <Check className="w-4 h-4 text-white" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

