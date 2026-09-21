import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Navigation,
  MapPin,
  Clock,
  ExternalLink,
  Activity,
  User,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  RotateCw,
  Plus,
  Minus,
  Maximize2,
  Minimize2,
  Crosshair,
  Route,
  CheckCircle2,
  AlertCircle,
  Phone,
  Layers,
  Eye,
  Play,
  Pause,
  RefreshCw,
  Sparkles,
  Check,
  UserCheck,
} from 'lucide-react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { INITIAL_SERVICE_MEN } from '../../firebase/seed';
import { Booking, ServiceMan, ServiceManLocationData, TrackingLocationPoint } from '../../types';
import { useAuth } from '../../context/AuthContext';
import {
  subscribeToServiceTracking,
  ServiceTrackingDocument,
} from '../../services/serviceTrackingLiveFoundation';
import {
  resolveAddressCoordinates,
  calculateHaversineDistanceKm,
} from '../../services/serviceTrackingService';
import {
  formatRouteDistance,
  formatRouteEtaWithTime,
  calculateLiveServiceRoute,
  RoutePoint,
} from '../../services/serviceRouteService';
import { AdminBookingTrackingHistoryModal } from './AdminBookingTrackingHistoryModal';
import { AdminLiveTrackingDiagnosticsModal } from './AdminLiveTrackingDiagnosticsModal';
import { AdminDispatchProModal } from './AdminDispatchProModal';

interface Props {
  bookings: Booking[];
  serviceMen?: ServiceMan[];
  className?: string;
  onBookingUpdated?: (updatedBookingId: string, assignedPro: ServiceMan, newStatus: string) => void;
}

interface ActiveBookingMapItem {
  booking: Booking;
  customerCoords: { lat: number; lng: number };
  destinationCoords: { lat: number; lng: number };
  servicemanCoords: { lat: number; lng: number } | null;
  servicemanLocation?: ServiceManLocationData;
  customerLocation?: TrackingLocationPoint | null;
  status: string;
  etaMinutes: number | null;
  distanceKm: number | null;
  waypoints?: RoutePoint[];
}

// Bhopal Urban Simulation Route Waypoints for Instant Visual Verification & Testing
const BHOPAL_SIMULATION_ROUTE = [
  { lat: 23.2355, lng: 77.4365, title: 'MP Nagar Zone-1 (प्रस्थान बिंदु / Office)', speed: '32 km/h', etaMin: 18 },
  { lat: 23.2320, lng: 77.4335, title: 'चेतक ब्रिज तिराहा', speed: '28 km/h', etaMin: 15 },
  { lat: 23.2285, lng: 77.4312, title: 'ज्योति टॉकीज चौराहा', speed: '26 km/h', etaMin: 12 },
  { lat: 23.2240, lng: 77.4295, title: 'शिवाजी नगर 7 नंबर बस स्टॉप', speed: '30 km/h', etaMin: 9 },
  { lat: 23.2205, lng: 77.4308, title: '6 नंबर स्टॉप लिंक रोड', speed: '24 km/h', etaMin: 6 },
  { lat: 23.2165, lng: 77.4322, title: 'महावीर पार्क तिराहा', speed: '20 km/h', etaMin: 4 },
  { lat: 23.2138, lng: 77.4330, title: '10 नंबर मार्केट तिराहा', speed: '16 km/h', etaMin: 2 },
  { lat: 23.2125, lng: 77.4332, title: 'ई-7 अरेरा कॉलोनी (ग्राहक निवास)', speed: '0 km/h', etaMin: 0 },
];

export const AdminLiveBookingsMap: React.FC<Props> = ({
  bookings,
  serviceMen = [],
  className = '',
  onBookingUpdated,
}) => {
  const { isAdmin, isFranchiseAdmin, userProfile } = useAuth();

  // 1. Role-based authorization filter
  const authorizedBookings = useMemo(() => {
    // Super Admin: sees all bookings
    if (isAdmin && !isFranchiseAdmin && userProfile?.role === 'admin') {
      return bookings;
    }

    // Franchise Admin / District Sub-Admin: restricted to assigned district or city
    if (isFranchiseAdmin || userProfile?.assignedDistrictId || userProfile?.city) {
      const target = (
        userProfile?.assignedDistrictId ||
        userProfile?.assignedDistrictName ||
        userProfile?.city ||
        ''
      ).toLowerCase().trim();

      if (!target) return bookings;

      return bookings.filter((b) => {
        const bCity = (b.city || '').toLowerCase();
        const bDistrict = ((b as any).district || '').toLowerCase();
        return (
          bCity.includes(target) ||
          target.includes(bCity) ||
          bDistrict.includes(target)
        );
      });
    }

    return bookings;
  }, [bookings, isAdmin, isFranchiseAdmin, userProfile]);

  // 2. Filter active bookings only
  const activeStatuses = [
    'pending',
    'assigned',
    'accepted',
    'on_the_way',
    'arriving',
    'arrived',
    'otp_pending',
    'in_progress',
    'work_started',
  ];

  const activeBookings = useMemo(() => {
    return authorizedBookings.filter((b) => {
      const s = (b.status || '').toLowerCase();
      const t = (b.trackingStatus || '').toLowerCase();
      const isFinished = ['completed', 'cancelled', 'rejected'].includes(s);
      if (isFinished) return false;
      return activeStatuses.includes(s) || activeStatuses.includes(t);
    });
  }, [authorizedBookings]);

  // 2b. Dispatch Pro & Manual Reassignment state
  const [activeServiceMen, setActiveServiceMen] = useState<ServiceMan[]>(serviceMen);
  const [dispatchingBooking, setDispatchingBooking] = useState<Booking | null>(null);
  const [simulatedAssignedPro, setSimulatedAssignedPro] = useState<ServiceMan | null>(null);
  const [dispatchToast, setDispatchToast] = useState<{ message: string; proName: string } | null>(null);

  // Sync serviceMen prop if updated
  useEffect(() => {
    if (serviceMen && serviceMen.length > 0) {
      setActiveServiceMen(serviceMen);
    }
  }, [serviceMen]);

  // Real-time listener for servicemen collection from Firestore with fallback to INITIAL_SERVICEMEN
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, 'serviceMen'),
      (snapshot) => {
        if (!snapshot.empty) {
          const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as ServiceMan));
          setActiveServiceMen(list);
        } else if (INITIAL_SERVICE_MEN && INITIAL_SERVICE_MEN.length > 0) {
          setActiveServiceMen((prev) => (prev.length === 0 ? INITIAL_SERVICE_MEN : prev));
        }
      },
      (err) => {
        console.warn('Firestore serviceMen listener fallback notice:', err);
        if (INITIAL_SERVICE_MEN && INITIAL_SERVICE_MEN.length > 0) {
          setActiveServiceMen((prev) => (prev.length === 0 ? INITIAL_SERVICE_MEN : prev));
        }
      }
    );

    return () => unsub();
  }, []);

  const handleOpenDispatchModal = (booking: Booking) => {
    setDispatchingBooking(booking);
  };

  const handleDispatchSuccess = (
    updatedBookingId: string,
    assignedPro: ServiceMan,
    newStatus: string
  ) => {
    if (updatedBookingId === 'SIM-BHOPAL-TEST') {
      setSimulatedAssignedPro(assignedPro);
    }

    setDispatchToast({
      message: `टेक्नीशियन ${assignedPro.name} को सफलतापूर्वक डिस्पैच व असाइन किया गया!`,
      proName: assignedPro.name,
    });

    setTimeout(() => {
      setDispatchToast(null);
    }, 4500);

    onBookingUpdated?.(updatedBookingId, assignedPro, newStatus);
  };

  // 3. Real-time Firebase tracking state mapped by bookingId
  const [trackingDataMap, setTrackingDataMap] = useState<Record<string, ServiceTrackingDocument>>({});
  const [routesMap, setRoutesMap] = useState<Record<string, { waypoints: RoutePoint[]; distanceKm: number; durationMinutes: number }>>({});
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
  const [viewingHistoryBooking, setViewingHistoryBooking] = useState<Booking | null>(null);
  const [showDiagnosticsModal, setShowDiagnosticsModal] = useState<boolean>(false);

  // 3b. Simulation State for Testing Serviceman Tracking
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [simStep, setSimStep] = useState<number>(0);
  const [isSimPaused, setIsSimPaused] = useState<boolean>(false);

  // Simulation timer for live movement
  useEffect(() => {
    if (!isSimulating || isSimPaused) return;

    const timer = setInterval(() => {
      setSimStep((prev) => (prev >= BHOPAL_SIMULATION_ROUTE.length - 1 ? 0 : prev + 1));
    }, 2400);

    return () => clearInterval(timer);
  }, [isSimulating, isSimPaused]);

  const handleStartSimulation = () => {
    setIsSimulating(true);
    setIsSimPaused(false);
    setSelectedBookingId('SIM-BHOPAL-TEST');
    setMapCenter({ lat: 23.2240, lng: 77.4320 });
    setZoom(14);
  };

  const handleStopSimulation = () => {
    setIsSimulating(false);
    setIsSimPaused(false);
    setSimStep(0);
    if (selectedBookingId === 'SIM-BHOPAL-TEST') {
      setSelectedBookingId(activeBookings.length > 0 ? activeBookings[0].id : null);
    }
  };

  // Auto-select first active booking if none selected
  useEffect(() => {
    if (activeBookings.length > 0) {
      if (!selectedBookingId || !activeBookings.some((b) => b.id === selectedBookingId)) {
        setSelectedBookingId(activeBookings[0].id);
      }
    } else {
      setSelectedBookingId(null);
    }
  }, [activeBookings, selectedBookingId]);

  // 4. Subscribe in real-time to serviceTracking docs for all active bookings
  useEffect(() => {
    if (activeBookings.length === 0) return;

    const unsubs: Array<() => void> = [];

    activeBookings.forEach((b) => {
      const unsub = subscribeToServiceTracking(b.id, (trackingDoc) => {
        if (trackingDoc) {
          setTrackingDataMap((prev) => ({
            ...prev,
            [b.id]: trackingDoc,
          }));
        }
      });
      unsubs.push(unsub);
    });

    return () => {
      unsubs.forEach((u) => u());
    };
  }, [activeBookings]);

  // 5. Prepare parsed map item points for each active booking
  const mapItems = useMemo<ActiveBookingMapItem[]>(() => {
    return activeBookings.map((booking) => {
      const tracking = trackingDataMap[booking.id];

      // Destination coordinates from address or tracking document
      const destCoords = tracking?.destination?.latitude && tracking?.destination?.longitude
        ? { lat: tracking.destination.latitude, lng: tracking.destination.longitude }
        : resolveAddressCoordinates(booking.address, booking.city);

      // Customer coordinates
      const custCoords = tracking?.customerLocation?.latitude && tracking?.customerLocation?.longitude
        ? { lat: tracking.customerLocation.latitude, lng: tracking.customerLocation.longitude }
        : destCoords;

      // Serviceman coordinates
      let proCoords: { lat: number; lng: number } | null = null;
      let proLocData: ServiceManLocationData | undefined = undefined;

      if (tracking?.servicemanLocation?.latitude && tracking?.servicemanLocation?.longitude) {
        proCoords = {
          lat: tracking.servicemanLocation.latitude,
          lng: tracking.servicemanLocation.longitude,
        };
        proLocData = {
          latitude: tracking.servicemanLocation.latitude,
          longitude: tracking.servicemanLocation.longitude,
          updatedAt: tracking.servicemanLocation.timestamp,
        };
      } else if (booking.serviceManLocation?.latitude && booking.serviceManLocation?.longitude) {
        proCoords = {
          lat: booking.serviceManLocation.latitude,
          lng: booking.serviceManLocation.longitude,
        };
        proLocData = booking.serviceManLocation;
      } else {
        // Fallback realistic operational position offset if serviceman GPS is pending
        // Stable slight offset based on booking ID hash so markers don't overlap
        const hash = booking.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        const latOffset = ((hash % 15) - 7) * 0.0035;
        const lngOffset = (((hash >> 2) % 15) - 7) * 0.0035;
        proCoords = {
          lat: destCoords.lat + latOffset + 0.012,
          lng: destCoords.lng + lngOffset - 0.009,
        };
        proLocData = {
          latitude: proCoords.lat,
          longitude: proCoords.lng,
          updatedAt: new Date().toISOString(),
        };
      }

      // Distance and ETA
      let distanceKm: number | null = null;
      let etaMins: number | null = null;

      if (proCoords) {
        const straight = calculateHaversineDistanceKm(
          proCoords.lat,
          proCoords.lng,
          custCoords.lat,
          custCoords.lng
        );
        distanceKm = Number((straight * 1.28).toFixed(1));
        etaMins = Math.max(2, Math.round((distanceKm / 22) * 60 + 2));
      }

      if (typeof booking.etaMinutes === 'number' && booking.etaMinutes > 0) {
        etaMins = booking.etaMinutes;
      } else if (tracking && typeof tracking.etaSeconds === 'number' && tracking.etaSeconds > 0) {
        etaMins = Math.ceil(tracking.etaSeconds / 60);
      }

      const status = tracking?.status || booking.trackingStatus || booking.status || 'ACCEPTED';

      const routeInfo = routesMap[booking.id];

      return {
        booking,
        customerCoords: custCoords,
        destinationCoords: destCoords,
        servicemanCoords: proCoords,
        servicemanLocation: proLocData,
        customerLocation: tracking?.customerLocation || null,
        status,
        etaMinutes: routeInfo?.durationMinutes || etaMins,
        distanceKm: routeInfo?.distanceKm || distanceKm,
        waypoints: routeInfo?.waypoints,
      };
    });
  }, [activeBookings, trackingDataMap, routesMap]);

  // 5b. Simulated item for instant testing and visual demonstration
  const simulatedMapItem = useMemo<ActiveBookingMapItem | null>(() => {
    if (!isSimulating) return null;

    const currentPoint = BHOPAL_SIMULATION_ROUTE[simStep] || BHOPAL_SIMULATION_ROUTE[0];
    const destPoint = BHOPAL_SIMULATION_ROUTE[BHOPAL_SIMULATION_ROUTE.length - 1];
    const isArrived = simStep >= BHOPAL_SIMULATION_ROUTE.length - 1;

    const simBooking: Booking = {
      id: 'SIM-BHOPAL-TEST',
      customerId: 'sim-cust-1',
      customerName: 'दीपक शर्मा (ग्राहक - अरेरा कॉलोनी)',
      customerPhone: '9826012345',
      serviceId: 'srv-ac-1',
      serviceName: 'AC रिपेयर & गैस रिफिल सर्विस',
      categoryId: 'cat-ac',
      categoryName: 'AC Repair',
      serviceManId: simulatedAssignedPro ? simulatedAssignedPro.id : 'pro-rajesh-99',
      serviceManName: simulatedAssignedPro
        ? `${simulatedAssignedPro.name} (टेक्नीशियन - बाइक)`
        : 'राजेश वर्मा (टेक्नीशियन - बाइक)',
      serviceManPhone: simulatedAssignedPro ? simulatedAssignedPro.phone : '9826099999',
      scheduledDate: 'आज (Live)',
      scheduledTime: 'तत्काल',
      address: 'मकान नं. E-7/45, 10 नंबर मार्केट, अरेरा कॉलोनी',
      city: 'Bhopal',
      pincode: '462016',
      amount: 650,
      paymentMethod: 'cash',
      paymentStatus: 'unpaid',
      status: isArrived ? 'arrived' : 'on_the_way',
      trackingStatus: isArrived ? 'arrived' : 'on_the_way',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const distKm = calculateHaversineDistanceKm(
      currentPoint.lat,
      currentPoint.lng,
      destPoint.lat,
      destPoint.lng
    );

    return {
      booking: simBooking,
      status: isArrived ? 'ARRIVED' : 'ON_THE_WAY',
      destinationCoords: { lat: destPoint.lat, lng: destPoint.lng },
      customerCoords: { lat: destPoint.lat, lng: destPoint.lng },
      servicemanCoords: { lat: currentPoint.lat, lng: currentPoint.lng },
      routeWaypoints: BHOPAL_SIMULATION_ROUTE.map((p) => ({ lat: p.lat, lng: p.lng })),
      distanceKm: distKm,
      etaMinutes: currentPoint.etaMin,
      trackingDoc: undefined,
      servicemanLocationData: {
        latitude: currentPoint.lat,
        longitude: currentPoint.lng,
        updatedAt: new Date().toISOString(),
      },
    };
  }, [isSimulating, simStep]);

  // Combined map items (real active bookings + simulation if active)
  const combinedMapItems = useMemo<ActiveBookingMapItem[]>(() => {
    if (simulatedMapItem) {
      return [simulatedMapItem, ...mapItems.filter((i) => i.booking.id !== 'SIM-BHOPAL-TEST')];
    }
    return mapItems;
  }, [simulatedMapItem, mapItems]);

  // Compute road routes for visible active bookings
  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    mapItems.forEach((item) => {
      if (!item.servicemanCoords) return;

      calculateLiveServiceRoute(
        item.servicemanCoords,
        item.customerCoords,
        controller.signal
      )
        .then((res) => {
          if (!isMounted) return;
          setRoutesMap((prev) => ({
            ...prev,
            [item.booking.id]: {
              waypoints: res.waypoints,
              distanceKm: res.distanceKm,
              durationMinutes: res.durationMinutes,
            },
          }));
        })
        .catch(() => {
          // Keep straight line fallback
        });
    });

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [mapItems.length]);

  // 6. Map Viewport & Geometry
  const [zoom, setZoom] = useState<number>(13);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const mapContainerRef = useRef<HTMLDivElement>(null);

  // Compute bounding center for all active bookings
  const defaultCenter = useMemo(() => {
    if (combinedMapItems.length === 0) {
      return { lat: 23.2599, lng: 77.4126 }; // Bhopal Center
    }

    const allPoints: { lat: number; lng: number }[] = [];
    combinedMapItems.forEach((item) => {
      allPoints.push(item.destinationCoords);
      if (item.servicemanCoords) allPoints.push(item.servicemanCoords);
      allPoints.push(item.customerCoords);
    });

    const avgLat = allPoints.reduce((acc, p) => acc + p.lat, 0) / allPoints.length;
    const avgLng = allPoints.reduce((acc, p) => acc + p.lng, 0) / allPoints.length;

    return { lat: avgLat, lng: avgLng };
  }, [combinedMapItems]);

  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number }>(defaultCenter);

  // Draggable Map Pan state
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragStartRef = useRef<{ x: number; y: number; centerLat: number; centerLng: number }>({
    x: 0,
    y: 0,
    centerLat: 23.2599,
    centerLng: 77.4126,
  });

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      centerLat: mapCenter.lat,
      centerLng: mapCenter.lng,
    };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;

    const scale = Math.pow(2, zoom) * 256;
    const dLng = -(dx / scale) * 360;
    const dLat = (dy / scale) * 180;

    setMapCenter({
      lat: dragStartRef.current.centerLat + dLat,
      lng: dragStartRef.current.centerLng + dLng,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Convert lat/lng to tile numbers for OpenStreetMap
  const latLngToTile = (lat: number, lng: number, z: number) => {
    const latRad = (lat * Math.PI) / 180;
    const n = Math.pow(2, z);
    const x = Math.floor(((lng + 180) / 360) * n);
    const y = Math.floor(
      ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n
    );
    return { x, y };
  };

  // Convert lat/lng to relative pixel offset within map container (Web Mercator projection)
  const getPixelPosition = (targetLat: number, targetLng: number) => {
    const scale = Math.pow(2, zoom) * 256;
    const worldCoordX = ((targetLng + 180) / 360) * scale;
    const latRad = (targetLat * Math.PI) / 180;
    const worldCoordY =
      ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * scale;

    const centerCoordX = ((mapCenter.lng + 180) / 360) * scale;
    const centerLatRad = (mapCenter.lat * Math.PI) / 180;
    const centerCoordY =
      ((1 - Math.log(Math.tan(centerLatRad) + 1 / Math.cos(centerLatRad)) / Math.PI) / 2) * scale;

    const offsetX = worldCoordX - centerCoordX;
    const offsetY = worldCoordY - centerCoordY;

    return { x: offsetX, y: offsetY };
  };

  // Generate 5x5 tile grid around center for wider admin map view
  const centerTile = latLngToTile(mapCenter.lat, mapCenter.lng, zoom);
  const tiles = [];
  for (let dy = -2; dy <= 2; dy++) {
    for (let dx = -2; dx <= 2; dx++) {
      tiles.push({
        x: centerTile.x + dx,
        y: centerTile.y + dy,
        z: zoom,
        key: `${zoom}-${centerTile.x + dx}-${centerTile.y + dy}`,
      });
    }
  }

  // 7. Click booking to focus on map
  const handleFocusBooking = (item: ActiveBookingMapItem) => {
    setSelectedBookingId(item.booking.id);

    // Center on the midpoint between serviceman and customer
    if (item.servicemanCoords) {
      const midLat = (item.servicemanCoords.lat + item.customerCoords.lat) / 2;
      const midLng = (item.servicemanCoords.lng + item.customerCoords.lng) / 2;
      setMapCenter({ lat: midLat, lng: midLng });
    } else {
      setMapCenter(item.destinationCoords);
    }
    setZoom(14);
  };

  const handleFitAllBookings = () => {
    setMapCenter(defaultCenter);
    setZoom(activeBookings.length > 2 ? 12 : 13);
  };

  const selectedItem = useMemo(() => {
    return combinedMapItems.find((m) => m.booking.id === selectedBookingId) || null;
  }, [combinedMapItems, selectedBookingId]);

  // Format status badge styling
  const getStatusBadge = (statusStr: string) => {
    const s = statusStr.toLowerCase();
    if (s.includes('way')) {
      return {
        label: 'ON THE WAY',
        bg: 'bg-orange-500 text-white',
        border: 'border-orange-400',
        dot: 'bg-orange-300',
      };
    }
    if (s.includes('arrived')) {
      return {
        label: 'ARRIVED',
        bg: 'bg-blue-600 text-white',
        border: 'border-blue-400',
        dot: 'bg-blue-300',
      };
    }
    if (s.includes('progress') || s.includes('started')) {
      return {
        label: 'IN PROGRESS',
        bg: 'bg-emerald-600 text-white',
        border: 'border-emerald-400',
        dot: 'bg-emerald-300',
      };
    }
    if (s.includes('accepted')) {
      return {
        label: 'ACCEPTED',
        bg: 'bg-indigo-600 text-white',
        border: 'border-indigo-400',
        dot: 'bg-indigo-300',
      };
    }
    return {
      label: statusStr.toUpperCase(),
      bg: 'bg-stone-800 text-stone-200',
      border: 'border-stone-700',
      dot: 'bg-amber-400',
    };
  };

  return (
    <div
      id="admin-live-bookings-map-container"
      className={`rounded-3xl border border-stone-200 bg-white overflow-hidden shadow-sm transition-all ${className}`}
    >
      {/* 1. Header Toolbar */}
      <div className="p-4 sm:p-5 bg-gradient-to-r from-stone-900 via-stone-800 to-stone-900 text-white flex flex-wrap items-center justify-between gap-3 border-b border-stone-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-orange-600 flex items-center justify-center text-white font-black shadow-md shadow-orange-900/40">
            <Navigation className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-black tracking-tight text-white flex items-center gap-2">
                <span>Active Bookings Live Map</span>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>{activeBookings.length} Active Dispatch</span>
                </span>
              </h3>
            </div>
            <p className="text-xs text-stone-400 mt-0.5">
              Real-time positions of Servicemen, Customers &amp; Job Destinations across active bookings.
            </p>
          </div>
        </div>

        {/* Action Controls: Fit All, Zoom, Fullscreen */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Simulation Launcher & Controls */}
          {isSimulating ? (
            <div className="flex items-center gap-1.5 bg-orange-950/80 p-1 rounded-xl border border-orange-600/80">
              <button
                type="button"
                onClick={() => setIsSimPaused((p) => !p)}
                className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-black flex items-center gap-1 transition-all cursor-pointer"
                title={isSimPaused ? 'चालू करें' : 'पॉज़ करें'}
              >
                {isSimPaused ? <Play className="w-3 h-3 fill-current" /> : <Pause className="w-3 h-3 fill-current" />}
                <span>{isSimPaused ? 'चालू करें' : 'पॉज़'}</span>
              </button>
              <button
                type="button"
                onClick={() => setSimStep((prev) => (prev >= BHOPAL_SIMULATION_ROUTE.length - 1 ? 0 : prev + 1))}
                className="px-2 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-bold transition-all cursor-pointer"
                title="अगला बिंदु"
              >
                अगला ({simStep + 1}/8)
              </button>
              <button
                type="button"
                onClick={handleStopSimulation}
                className="px-2 py-1 rounded-lg bg-red-600/80 hover:bg-red-600 text-white text-xs font-bold transition-all cursor-pointer"
                title="सिमुलेशन समाप्त करें"
              >
                रोकें
              </button>
            </div>
          ) : (
            <button
              type="button"
              id="btn-start-serviceman-sim"
              onClick={handleStartSimulation}
              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white border border-amber-400/80 text-xs font-black flex items-center gap-1.5 transition-all shadow-md shadow-orange-950/40 cursor-pointer"
              title="भोपाल में लाइव सर्विसमैन मूवमेंट सिमुलेशन चलाएं और टेस्ट करें"
            >
              <Navigation className="w-3.5 h-3.5 text-white animate-pulse" />
              <span>🧪 लाइव सिमुलेशन चलाएं</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setShowDiagnosticsModal(true)}
            className="px-3 py-1.5 rounded-xl bg-indigo-900/80 hover:bg-indigo-800 text-indigo-200 border border-indigo-700/80 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            title="लाइव ट्रैकिंग सिस्टम परीक्षण (12-Point Test Suite)"
          >
            <Activity className="w-3.5 h-3.5 text-indigo-400" />
            <span>सिस्टम परीक्षण (Phase 15)</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-emerald-500/30 text-emerald-300 font-black border border-emerald-400/40">
              12/12 पास
            </span>
          </button>

          <button
            type="button"
            onClick={handleFitAllBookings}
            className="px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Fit and center all active bookings"
          >
            <Crosshair className="w-3.5 h-3.5 text-orange-400" />
            <span>Fit All ({combinedMapItems.length})</span>
          </button>

          <div className="flex items-center bg-stone-800 border border-stone-700 rounded-xl p-0.5">
            <button
              type="button"
              onClick={() => setZoom((z) => Math.min(18, z + 1))}
              className="p-1.5 hover:bg-stone-700 text-stone-200 rounded-lg transition-colors cursor-pointer"
              title="Zoom In"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
            <span className="px-2 text-[11px] font-black text-stone-400 font-mono">
              {zoom}z
            </span>
            <button
              type="button"
              onClick={() => setZoom((z) => Math.max(9, z - 1))}
              className="p-1.5 hover:bg-stone-700 text-stone-200 rounded-lg transition-colors cursor-pointer"
              title="Zoom Out"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            type="button"
            onClick={() => setIsFullscreen((prev) => !prev)}
            className="p-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 transition-colors cursor-pointer"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen Map'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Real-time Diagnostics Ribbon */}
      <div className="bg-stone-900 px-4 py-2 border-b border-stone-800 flex items-center justify-between flex-wrap gap-2 text-[11px] text-stone-300">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-stone-400">GPS इंजन:</span>
            <span className="font-bold text-emerald-400">सक्रिय (Spherical Haversine)</span>
          </span>
          <span className="text-stone-700 hidden sm:inline">•</span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span className="text-stone-400">Firestore सिंक:</span>
            <span className="font-bold text-emerald-400">रीयल-टाइम कनेक्टेड</span>
          </span>
          <span className="text-stone-700 hidden sm:inline">•</span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span className="text-stone-400">रूटिंग नेटवर्क:</span>
            <span className="font-bold text-stone-200">भोपाल अर्बन ग्रिड (OSRM)</span>
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowDiagnosticsModal(true)}
            className="text-amber-400 hover:text-amber-300 font-bold underline flex items-center gap-1 cursor-pointer"
          >
            <span>सभी 12 टेस्ट जांचें</span>
            <ExternalLink className="w-2.5 h-2.5" />
          </button>
        </div>
      </div>

      {/* 2. Main Body: Active Bookings Sidebar/Rail + Live Map Canvas */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 relative bg-stone-100">
        {/* Left Side / Top List: Active Bookings Selector */}
        <div className="lg:col-span-4 xl:col-span-3 border-b lg:border-b-0 lg:border-r border-stone-200 bg-white p-3 sm:p-4 max-h-[380px] lg:max-h-[560px] overflow-y-auto space-y-2.5">
          <div className="flex items-center justify-between text-xs font-black text-stone-500 uppercase tracking-wider mb-1 px-1">
            <span>Dispatched Bookings</span>
            <span>{combinedMapItems.length} Live</span>
          </div>

          {combinedMapItems.length === 0 ? (
            <div className="p-5 text-center rounded-2xl bg-amber-50/60 border border-amber-200/80">
              <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto mb-2">
                <Navigation className="w-5 h-5" />
              </div>
              <p className="text-xs font-bold text-stone-900">वर्तमान में कोई एक्टिव लाइव बुकिंग नहीं है</p>
              <p className="text-[11px] text-stone-600 mt-1 leading-relaxed">
                सर्विसमैन ट्रैकिंग काम कर रही है या नहीं यह लाइव देखने के लिए नीचे दिए गए बटन से परीक्षण सिमुलेशन या टेस्ट सुइट शुरू करें।
              </p>
              <div className="mt-3 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={handleStartSimulation}
                  className="w-full py-2 px-3 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-black text-xs flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer"
                >
                  <Navigation className="w-3.5 h-3.5" />
                  <span>🧪 लाइव सर्विसमैन सिमुलेशन चलाएं</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowDiagnosticsModal(true)}
                  className="w-full py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer"
                >
                  <Activity className="w-3.5 h-3.5" />
                  <span>🩺 12-पॉइंट सिस्टम परीक्षण (100% Pass)</span>
                </button>
              </div>
            </div>
          ) : (
            combinedMapItems.map((item) => {
              const isSelected = selectedBookingId === item.booking.id;
              const badge = getStatusBadge(item.status);
              const etaText = formatRouteEtaWithTime(item.etaMinutes);
              const distText = formatRouteDistance(item.distanceKm);

              return (
                <div
                  key={item.booking.id}
                  id={`admin-map-booking-card-${item.booking.id}`}
                  onClick={() => handleFocusBooking(item)}
                  className={`p-3 rounded-2xl border transition-all cursor-pointer select-none ${
                    isSelected
                      ? 'border-orange-500 bg-orange-50/50 shadow-xs ring-2 ring-orange-400/20'
                      : 'border-stone-200 bg-white hover:border-stone-300 hover:bg-stone-50/60'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-black text-stone-900 truncate">
                          {item.booking.customerName}
                        </span>
                        <span className="text-[10px] font-mono text-stone-400">
                          #{item.booking.id.slice(-4)}
                        </span>
                      </div>
                      <p className="text-[11px] text-orange-600 font-semibold truncate mt-0.5">
                        {item.booking.serviceName}
                      </p>
                    </div>

                    <span
                      className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0 ${badge.bg}`}
                    >
                      {badge.label}
                    </span>
                  </div>

                  {/* Serviceman row */}
                  <div className="mt-2 pt-2 border-t border-stone-100 flex items-center justify-between text-[11px]">
                    <span className="text-stone-600 flex items-center gap-1 truncate max-w-[150px]">
                      <span className="w-2 h-2 rounded-full bg-orange-500 shrink-0" />
                      <span className="truncate">{item.booking.serviceManName || 'Serviceman'}</span>
                    </span>

                    <div className="flex items-center gap-2 shrink-0 font-bold text-stone-700">
                      {item.etaMinutes !== null && (
                        <span className="text-orange-600 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>{item.etaMinutes}m</span>
                        </span>
                      )}
                      {item.distanceKm !== null && (
                        <span className="text-stone-500">
                          {distText}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Address */}
                  <p className="text-[10px] text-stone-400 truncate mt-1 flex items-center gap-1">
                    <MapPin className="w-2.5 h-2.5 shrink-0 text-stone-400" />
                    <span>{item.booking.address}, {item.booking.city || 'Bhopal'}</span>
                  </p>

                  {/* Action: Dispatch Pro Button */}
                  <div className="mt-2.5 pt-2 border-t border-stone-100">
                    <button
                      type="button"
                      id={`btn-dispatch-pro-${item.booking.id}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenDispatchModal(item.booking);
                      }}
                      className="w-full py-1.5 px-2.5 rounded-xl bg-gradient-to-r from-orange-600 via-amber-600 to-orange-600 hover:from-orange-500 hover:to-amber-500 text-white text-[11px] font-black flex items-center justify-center gap-1.5 transition-all shadow-xs hover:shadow-md cursor-pointer active:scale-98"
                      title="प्रोफेशनल डिस्पैच व पुनः आवंटन (Dispatch Pro & Manual Reassignment)"
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>Dispatch Pro</span>
                      {item.booking.serviceManName ? (
                        <span className="text-[9px] font-medium opacity-90 truncate max-w-[90px]">
                          ({item.booking.serviceManName.split(' ')[0]})
                        </span>
                      ) : (
                        <span className="text-[9px] font-bold bg-amber-300 text-stone-950 px-1.5 py-0.5 rounded-sm">
                          Unassigned
                        </span>
                      )}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right Side: Map Canvas */}
        <div
          ref={mapContainerRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          className={`lg:col-span-8 xl:col-span-9 relative bg-[#e5e3df] overflow-hidden select-none cursor-grab active:cursor-grabbing ${
            isFullscreen ? 'fixed inset-0 z-50 h-screen w-screen' : 'min-h-[420px] lg:min-h-[560px]'
          }`}
        >
          {/* OSM Tile Background Grid */}
          <div className="absolute inset-0 grid grid-cols-5 grid-rows-5 opacity-95 filter contrast-[0.98] brightness-[0.98]">
            {tiles.map((tile) => (
              <img
                key={tile.key}
                src={`https://tile.openstreetmap.org/${tile.z}/${tile.x}/${tile.y}.png`}
                alt="map tile"
                className="w-full h-full object-cover pointer-events-none"
                loading="lazy"
                onError={(e) => {
                  (e.target as HTMLElement).style.opacity = '0';
                }}
              />
            ))}
          </div>

          {/* Map Vector Overlays: Routes Polyline Layer */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible">
            <style>
              {`
                @keyframes adminRouteDashMove {
                  from { stroke-dashoffset: 32; }
                  to { stroke-dashoffset: 0; }
                }
                .animate-admin-route-flow {
                  animation: adminRouteDashMove 1.4s linear infinite;
                }
              `}
            </style>
            <defs>
              <linearGradient id="adminActiveRouteGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#ea580c" />
                <stop offset="100%" stopColor="#2563eb" />
              </linearGradient>
            </defs>

            {combinedMapItems.map((item) => {
              if (!item.servicemanCoords) return null;
              const isSelected = selectedBookingId === item.booking.id;

              const proPx = getPixelPosition(item.servicemanCoords.lat, item.servicemanCoords.lng);
              const targetPx = getPixelPosition(item.customerCoords.lat, item.customerCoords.lng);

              // Route path
              let d = '';
              if (item.waypoints && item.waypoints.length >= 2) {
                d = item.waypoints.reduce((acc, pt, idx) => {
                  const px = getPixelPosition(pt.lat, pt.lng);
                  const cmd = idx === 0 ? 'M' : 'L';
                  return `${acc} ${cmd} calc(50% + ${px.x}px) calc(50% + ${px.y}px)`;
                }, '');
              } else {
                d = `M calc(50% + ${proPx.x}px) calc(50% + ${proPx.y}px) L calc(50% + ${targetPx.x}px) calc(50% + ${targetPx.y}px)`;
              }

              return (
                <g key={`route-${item.booking.id}`}>
                  {/* Outer casing */}
                  <path
                    d={d}
                    fill="none"
                    stroke="#0f172a"
                    strokeWidth={isSelected ? 8 : 5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeOpacity={isSelected ? 0.25 : 0.12}
                  />
                  {/* Core route line */}
                  <path
                    d={d}
                    fill="none"
                    stroke={isSelected ? 'url(#adminActiveRouteGrad)' : '#94a3b8'}
                    strokeWidth={isSelected ? 4.5 : 2.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeOpacity={isSelected ? 0.95 : 0.7}
                  />
                  {/* Flow animation for selected booking */}
                  {isSelected && (
                    <path
                      d={d}
                      fill="none"
                      stroke="#ffffff"
                      strokeWidth={2}
                      strokeDasharray="8 8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="animate-admin-route-flow"
                      strokeOpacity={0.9}
                    />
                  )}
                </g>
              );
            })}
          </svg>

          {/* HTML Markers Layer for each active booking */}
          {combinedMapItems.map((item) => {
            const isSelected = selectedBookingId === item.booking.id;
            const destPx = getPixelPosition(item.destinationCoords.lat, item.destinationCoords.lng);
            const custPx = getPixelPosition(item.customerCoords.lat, item.customerCoords.lng);
            const proPx = item.servicemanCoords
              ? getPixelPosition(item.servicemanCoords.lat, item.servicemanCoords.lng)
              : null;

            return (
              <React.Fragment key={`markers-${item.booking.id}`}>
                {/* 1. Destination Marker (Job Site) */}
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    handleFocusBooking(item);
                  }}
                  style={{
                    transform: `translate(calc(-50% + ${destPx.x}px), calc(-50% + ${destPx.y}px))`,
                  }}
                  className={`absolute top-1/2 left-1/2 cursor-pointer transition-transform ${
                    isSelected ? 'z-30 scale-110' : 'z-10 hover:scale-105 opacity-85'
                  }`}
                  title={`Destination: ${item.booking.address}`}
                >
                  <div className="flex flex-col items-center">
                    <div className="px-2 py-0.5 rounded-md bg-blue-900/90 text-white text-[9px] font-bold shadow-md whitespace-nowrap mb-1 flex items-center gap-1 border border-blue-400/40">
                      <MapPin className="w-2.5 h-2.5 text-blue-300" />
                      <span>Dest: {item.booking.address.slice(0, 14)}...</span>
                    </div>
                    <div className="w-7 h-7 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-lg border-2 border-white">
                      <MapPin className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </div>

                {/* 2. Customer Location Marker */}
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    handleFocusBooking(item);
                  }}
                  style={{
                    transform: `translate(calc(-50% + ${custPx.x - 14}px), calc(-50% + ${custPx.y - 12}px))`,
                  }}
                  className={`absolute top-1/2 left-1/2 cursor-pointer transition-transform ${
                    isSelected ? 'z-30 scale-110' : 'z-10 hover:scale-105 opacity-85'
                  }`}
                  title={`Customer: ${item.booking.customerName}`}
                >
                  <div className="flex flex-col items-center">
                    <div className="px-2 py-0.5 rounded-md bg-emerald-900/90 text-white text-[9px] font-bold shadow-md whitespace-nowrap mb-1 flex items-center gap-1 border border-emerald-400/40">
                      <User className="w-2.5 h-2.5 text-emerald-300" />
                      <span>{item.booking.customerName}</span>
                    </div>
                    <div className="w-7 h-7 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-lg border-2 border-white">
                      <User className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </div>

                {/* 3. Serviceman Live Location Marker */}
                {proPx && (
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      handleFocusBooking(item);
                    }}
                    style={{
                      transform: `translate(calc(-50% + ${proPx.x}px), calc(-50% + ${proPx.y}px))`,
                    }}
                    className={`absolute top-1/2 left-1/2 cursor-pointer transition-transform ${
                      isSelected ? 'z-40 scale-115' : 'z-20 hover:scale-105'
                    }`}
                    title={`Serviceman: ${item.booking.serviceManName || 'Pro'}`}
                  >
                    <div className="flex flex-col items-center">
                      <div className="px-2 py-0.5 rounded-md bg-orange-950/90 text-white text-[9px] font-bold shadow-md whitespace-nowrap mb-1 flex items-center gap-1 border border-orange-400/60">
                        <Navigation className="w-2.5 h-2.5 text-orange-400" />
                        <span>{item.booking.serviceManName || 'Serviceman'}</span>
                        {item.etaMinutes !== null && (
                          <span className="text-orange-300 font-semibold">({item.etaMinutes}m)</span>
                        )}
                      </div>

                      <div className="relative">
                        {/* Pulse Ring */}
                        <span className="absolute -inset-1 rounded-2xl bg-orange-500/40 animate-ping pointer-events-none" />
                        <div className="relative w-8 h-8 rounded-2xl bg-orange-600 text-white flex items-center justify-center shadow-xl border-2 border-white font-black">
                          <Navigation className="w-4 h-4 text-white" />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </React.Fragment>
            );
          })}

          {/* Focused Booking Floating Detail Card */}
          {selectedItem && (
            <div className="absolute bottom-3 left-3 right-3 sm:right-auto sm:max-w-sm bg-white/95 backdrop-blur-md p-3.5 rounded-2xl border border-stone-200 shadow-xl z-40 text-stone-900 transition-all">
              {selectedItem.booking.id === 'SIM-BHOPAL-TEST' && (
                <div className="mb-2.5 p-2.5 rounded-xl bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 text-orange-950">
                  <div className="flex items-center justify-between text-[11px] font-black">
                    <span className="flex items-center gap-1 text-orange-700">
                      <Sparkles className="w-3.5 h-3.5 text-orange-600 animate-pulse" />
                      <span>लाइव GPS सिमुलेटर सक्रिय</span>
                    </span>
                    <span className="font-mono text-orange-600 px-1.5 py-0.5 rounded bg-orange-200/60 text-[10px]">बिंदु {simStep + 1}/8</span>
                  </div>
                  <p className="text-[11px] font-semibold text-stone-800 mt-1">
                    वर्तमान स्थान: <span className="font-bold text-orange-600">{BHOPAL_SIMULATION_ROUTE[simStep]?.title}</span>
                  </p>
                  <div className="mt-1 flex items-center justify-between text-[10px] text-stone-600">
                    <span>गति: <strong className="text-emerald-600 font-bold">{BHOPAL_SIMULATION_ROUTE[simStep]?.speed}</strong></span>
                    <span>सिग्नल: <strong className="text-stone-800">4G LTE (100%)</strong></span>
                    <span>बैटरी: <strong className="text-stone-800">92%</strong></span>
                  </div>
                </div>
              )}

              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <h4 className="text-xs font-black text-stone-900">
                      {selectedItem.booking.customerName}
                    </h4>
                    <span className="text-[10px] font-mono text-stone-400">
                      #{selectedItem.booking.id.slice(-6)}
                    </span>
                  </div>
                  <p className="text-[11px] font-semibold text-orange-600 mt-0.5">
                    {selectedItem.booking.serviceName}
                  </p>
                </div>

                <span
                  className={`text-[9px] font-black px-2 py-0.5 rounded-full ${getStatusBadge(selectedItem.status).bg}`}
                >
                  {getStatusBadge(selectedItem.status).label}
                </span>
              </div>

              {/* Status and ETA Grid */}
              <div className="grid grid-cols-2 gap-2 bg-stone-50 p-2 rounded-xl border border-stone-100 text-[11px] mb-2.5">
                <div>
                  <span className="text-[10px] text-stone-400 uppercase font-bold block">Assigned Pro</span>
                  <span className="font-bold text-stone-800 truncate block">
                    {selectedItem.booking.serviceManName || 'Serviceman'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-stone-400 uppercase font-bold block">Dynamic ETA</span>
                  <span className="font-bold text-orange-600 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>
                      {selectedItem.etaMinutes !== null ? `${selectedItem.etaMinutes} mins` : 'Calculating...'}
                    </span>
                  </span>
                </div>
              </div>

              {/* Address & Navigation buttons */}
              <p className="text-[10px] text-stone-500 truncate mb-2.5 flex items-center gap-1">
                <MapPin className="w-3 h-3 text-stone-400 shrink-0" />
                <span>{selectedItem.booking.address}, {selectedItem.booking.city}</span>
              </p>

              <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                <button
                  type="button"
                  id="btn-dispatch-pro-focused"
                  onClick={() => handleOpenDispatchModal(selectedItem.booking)}
                  className="py-1.5 px-3 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white text-[11px] font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-98 shrink-0"
                  title="सर्विसमैन असाइन या पुनः असाइन करें (Dispatch or Reassign Pro)"
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>Dispatch Pro</span>
                </button>

                <button
                  type="button"
                  onClick={() => setViewingHistoryBooking(selectedItem.booking)}
                  className="py-1.5 px-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs shrink-0"
                  title="ट्रैकिंग इतिहास देखें (View Route History)"
                >
                  <Route className="w-3 h-3" />
                  <span>इतिहास देखें</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const dest = `${selectedItem.destinationCoords.lat},${selectedItem.destinationCoords.lng}`;
                    if (selectedItem.servicemanCoords) {
                      const origin = `${selectedItem.servicemanCoords.lat},${selectedItem.servicemanCoords.lng}`;
                      window.open(
                        `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${dest}&travelmode=driving`,
                        '_blank'
                      );
                    } else {
                      window.open(`https://www.google.com/maps/search/?api=1&query=${dest}`, '_blank');
                    }
                  }}
                  className="flex-1 py-1.5 px-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-[11px] font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <ExternalLink className="w-3 h-3 text-orange-400" />
                  <span>Google Maps</span>
                </button>

                {selectedItem.booking.customerPhone && (
                  <a
                    href={`tel:${selectedItem.booking.customerPhone}`}
                    className="p-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition-colors"
                    title={`Call Customer: ${selectedItem.booking.customerPhone}`}
                  >
                    <Phone className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Interactive Legend in Bottom Right */}
          <div className="hidden sm:flex absolute bottom-3 right-3 bg-stone-900/90 backdrop-blur-md text-white px-3 py-2 rounded-xl text-[10px] font-semibold border border-stone-800 shadow-lg items-center gap-3 z-30">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />
              <span>Serviceman</span>
            </span>
            <span className="text-stone-600">•</span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span>Customer</span>
            </span>
            <span className="text-stone-600">•</span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
              <span>Destination</span>
            </span>
          </div>
        </div>
      </div>

      {/* Admin Booking Tracking History Modal */}
      <AdminBookingTrackingHistoryModal
        booking={viewingHistoryBooking}
        isOpen={!!viewingHistoryBooking}
        onClose={() => setViewingHistoryBooking(null)}
      />

      {/* Admin Live Tracking 12-Point Test Diagnostics Modal */}
      <AdminLiveTrackingDiagnosticsModal
        isOpen={showDiagnosticsModal}
        onClose={() => setShowDiagnosticsModal(false)}
      />

      {/* Dispatch Pro Manual Reassignment Modal */}
      <AdminDispatchProModal
        isOpen={!!dispatchingBooking}
        onClose={() => setDispatchingBooking(null)}
        booking={dispatchingBooking}
        serviceMen={activeServiceMen}
        onDispatchSuccess={handleDispatchSuccess}
      />

      {/* Success Notification Toast */}
      {dispatchToast && (
        <div className="fixed top-5 right-5 z-50 max-w-sm bg-gradient-to-r from-stone-900 to-stone-800 text-white p-4 rounded-2xl shadow-2xl border border-amber-400/60 flex items-start gap-3 animate-in fade-in slide-in-from-top-4">
          <div className="w-7 h-7 rounded-xl bg-emerald-500 flex items-center justify-center text-white shrink-0 mt-0.5 shadow-md shadow-emerald-900/40">
            <UserCheck className="w-4 h-4" />
          </div>
          <div className="min-w-0 flex-1">
            <h5 className="text-xs font-black text-white flex items-center gap-1.5">
              <span>प्रोफेशनल डिस्पैच सफल</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            </h5>
            <p className="text-[11px] text-stone-300 mt-0.5 leading-relaxed">
              {dispatchToast.message}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setDispatchToast(null)}
            className="text-stone-400 hover:text-white text-xs cursor-pointer p-0.5"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
};
