import React, { createContext, useContext, useState, useEffect } from 'react';
import { Service } from '../types';
import { ServicePackage } from '../data/packagesData';

export interface CartItem {
  id: string; // unique item id
  type: 'service' | 'package';
  serviceId?: string;
  packageId?: string;
  name: string;
  categoryName: string;
  unitPrice: number;
  quantity: number;
  imageUrl?: string;
  durationMinutes: number;
  rawService?: Service;
  rawPackage?: ServicePackage;
}

export interface Coupon {
  code: string;
  type: 'percent' | 'flat';
  discountValue: number;
  minOrderValue: number;
  maxDiscount?: number;
  description: string;
}

export const AVAILABLE_COUPONS: Coupon[] = [
  {
    code: 'FIRST50',
    type: 'percent',
    discountValue: 50,
    minOrderValue: 299,
    maxDiscount: 150,
    description: '50% off on your first service booking up to ₹150',
  },
  {
    code: 'BHOPAL100',
    type: 'flat',
    discountValue: 100,
    minOrderValue: 499,
    description: 'Flat ₹100 instant discount on orders above ₹499 in Bhopal',
  },
  {
    code: 'FESTIVE20',
    type: 'percent',
    discountValue: 20,
    minOrderValue: 399,
    maxDiscount: 200,
    description: '20% off on all deep cleaning and appliance services up to ₹200',
  },
];

interface CartContextType {
  items: CartItem[];
  addItem: (service: Service, quantity?: number) => void;
  addPackageItem: (pkg: ServicePackage) => void;
  removeItem: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  clearCart: () => void;
  isItemInCart: (serviceId: string) => boolean;
  getItemQuantity: (serviceId: string) => number;
  totalItemsCount: number;

  // Coupon
  appliedCoupon: Coupon | null;
  couponCodeInput: string;
  setCouponCodeInput: (code: string) => void;
  applyCoupon: (code: string) => { success: boolean; message: string };
  removeCoupon: () => void;
  couponError: string | null;

  // Billing breakdown
  subtotal: number;
  discountAmount: number;
  safetyFee: number;
  totalAmount: number;

  // Drawer modal state
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
}

const CART_STORAGE_KEY = 'hardinkaam_cart_v1';
const COUPON_STORAGE_KEY = 'hardinkaam_cart_coupon_v1';

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>(() => {
    try {
      const stored = localStorage.getItem(CART_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.warn('Cart storage load notice:', e);
    }
    return [];
  });

  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(() => {
    try {
      const stored = localStorage.getItem(COUPON_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return parsed;
      }
    } catch (e) {
      console.warn('Coupon storage load notice:', e);
    }
    return null;
  });

  const [couponCodeInput, setCouponCodeInput] = useState('');
  const [couponError, setCouponError] = useState<string | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Persist items
  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
    } catch (e) {
      console.warn('Cart storage save notice:', e);
    }
  }, [items]);

  // Persist applied coupon
  useEffect(() => {
    try {
      if (appliedCoupon) {
        localStorage.setItem(COUPON_STORAGE_KEY, JSON.stringify(appliedCoupon));
      } else {
        localStorage.removeItem(COUPON_STORAGE_KEY);
      }
    } catch (e) {
      console.warn('Coupon storage save notice:', e);
    }
  }, [appliedCoupon]);

  const addItem = (service: Service, quantity = 1) => {
    setItems((prev) => {
      const existing = prev.find((item) => item.serviceId === service.id);
      if (existing) {
        return prev.map((item) =>
          item.serviceId === service.id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      const newItem: CartItem = {
        id: `cart_srv_${service.id}`,
        type: 'service',
        serviceId: service.id,
        name: service.name,
        categoryName: service.categoryName,
        unitPrice: service.basePrice,
        quantity: Math.max(1, quantity),
        imageUrl: service.imageUrl,
        durationMinutes: service.durationMinutes,
        rawService: service,
      };
      return [...prev, newItem];
    });
  };

  const addPackageItem = (pkg: ServicePackage) => {
    setItems((prev) => {
      const existing = prev.find((item) => item.packageId === pkg.id);
      if (existing) {
        return prev.map((item) =>
          item.packageId === pkg.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      const newItem: CartItem = {
        id: `cart_pkg_${pkg.id}`,
        type: 'package',
        packageId: pkg.id,
        name: pkg.title,
        categoryName: pkg.tag,
        unitPrice: pkg.packagePrice,
        quantity: 1,
        imageUrl: pkg.imageUrl,
        durationMinutes: pkg.durationMinutes,
        rawPackage: pkg,
      };
      return [...prev, newItem];
    });
  };

  const removeItem = (itemId: string) => {
    setItems((prev) => prev.filter((item) => item.id !== itemId));
  };

  const updateQuantity = (itemId: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(itemId);
      return;
    }
    setItems((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, quantity } : item))
    );
  };

  const clearCart = () => {
    setItems([]);
    setAppliedCoupon(null);
    setCouponError(null);
  };

  const isItemInCart = (serviceId: string) => {
    return items.some((item) => item.serviceId === serviceId);
  };

  const getItemQuantity = (serviceId: string) => {
    const item = items.find((i) => i.serviceId === serviceId);
    return item ? item.quantity : 0;
  };

  const totalItemsCount = items.reduce((acc, curr) => acc + curr.quantity, 0);

  const subtotal = items.reduce(
    (acc, curr) => acc + curr.unitPrice * curr.quantity,
    0
  );

  // Platform Safety & Hygiene Fee (₹29 when cart is not empty)
  const safetyFee = items.length > 0 ? 29 : 0;

  // Calculate discount based on coupon rules
  let discountAmount = 0;
  if (appliedCoupon && subtotal >= appliedCoupon.minOrderValue) {
    if (appliedCoupon.type === 'flat') {
      discountAmount = appliedCoupon.discountValue;
    } else if (appliedCoupon.type === 'percent') {
      const calculated = (subtotal * appliedCoupon.discountValue) / 100;
      discountAmount = appliedCoupon.maxDiscount
        ? Math.min(calculated, appliedCoupon.maxDiscount)
        : calculated;
    }
  }

  // Ensure coupon remains valid if items change
  useEffect(() => {
    if (appliedCoupon && subtotal < appliedCoupon.minOrderValue) {
      setCouponError(
        `Coupon ${appliedCoupon.code} requires a minimum order of ₹${appliedCoupon.minOrderValue}.`
      );
      setAppliedCoupon(null);
    }
  }, [subtotal, appliedCoupon]);

  const totalAmount = Math.max(0, subtotal - discountAmount + safetyFee);

  const applyCoupon = (code: string) => {
    setCouponError(null);
    const cleanCode = code.trim().toUpperCase();
    const coupon = AVAILABLE_COUPONS.find((c) => c.code === cleanCode);

    if (!coupon) {
      setCouponError('Invalid coupon code. Please try FIRST50 or BHOPAL100.');
      return { success: false, message: 'Invalid coupon code' };
    }

    if (subtotal < coupon.minOrderValue) {
      const msg = `Minimum order amount of ₹${coupon.minOrderValue} required for coupon ${coupon.code}.`;
      setCouponError(msg);
      return { success: false, message: msg };
    }

    setAppliedCoupon(coupon);
    setCouponCodeInput('');
    return { success: true, message: `Coupon ${coupon.code} applied successfully!` };
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCouponError(null);
  };

  const contextValue = React.useMemo<CartContextType>(
    () => ({
      items,
      addItem,
      addPackageItem,
      removeItem,
      updateQuantity,
      clearCart,
      isItemInCart,
      getItemQuantity,
      totalItemsCount,
      appliedCoupon,
      couponCodeInput,
      setCouponCodeInput,
      applyCoupon,
      removeCoupon,
      couponError,
      subtotal,
      discountAmount,
      safetyFee,
      totalAmount,
      isCartOpen,
      setIsCartOpen,
    }),
    [
      items,
      appliedCoupon,
      couponCodeInput,
      couponError,
      subtotal,
      discountAmount,
      safetyFee,
      totalAmount,
      isCartOpen,
      totalItemsCount,
    ]
  );

  return (
    <CartContext.Provider value={contextValue}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
