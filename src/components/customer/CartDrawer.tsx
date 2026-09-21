import React from 'react';
import {
  X,
  Trash2,
  Plus,
  Minus,
  Tag,
  ShieldCheck,
  ChevronRight,
  ArrowRight,
  ShoppingBag,
  Clock,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';
import { useCart, AVAILABLE_COUPONS } from '../../context/CartContext';
import { useLanguage } from '../../context/LanguageContext';
import { Service, ServiceMan } from '../../types';

interface Props {
  onProceedToBooking: (service: Service) => void;
}

export const CartDrawer: React.FC<Props> = ({ onProceedToBooking }) => {
  const {
    items,
    removeItem,
    updateQuantity,
    clearCart,
    subtotal,
    discountAmount,
    safetyFee,
    totalAmount,
    appliedCoupon,
    couponCodeInput,
    setCouponCodeInput,
    applyCoupon,
    removeCoupon,
    couponError,
    isCartOpen,
    setIsCartOpen,
  } = useCart();

  const { t } = useLanguage();

  if (!isCartOpen) return null;

  const handleCheckout = () => {
    if (items.length === 0) return;
    setIsCartOpen(false);

    // Pick first service to launch existing robust booking modal flow
    const firstServiceItem = items.find((i) => i.rawService);
    if (firstServiceItem && firstServiceItem.rawService) {
      onProceedToBooking(firstServiceItem.rawService);
    } else if (items[0].rawPackage) {
      // Fallback pseudo service for package
      const pseudoService: Service = {
        id: items[0].packageId || 'custom_pkg',
        categoryId: 'cat_cleaning',
        categoryName: items[0].categoryName,
        name: items[0].name,
        description: `Combo Package (${items[0].name}) with all inclusions`,
        basePrice: items[0].unitPrice,
        priceUnit: 'package',
        durationMinutes: items[0].durationMinutes,
        imageUrl: items[0].imageUrl,
        rating: 4.9,
        ratingCount: 150,
        isActive: true,
      };
      onProceedToBooking(pseudoService);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden animate-in fade-in duration-200">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-stone-950/60 backdrop-blur-xs transition-opacity"
        onClick={() => setIsCartOpen(false)}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col border-l border-stone-200">
          {/* Header */}
          <div className="px-5 py-4 border-b border-stone-200 flex items-center justify-between bg-stone-50">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-orange-600" />
              <h3 className="font-extrabold text-stone-900 text-base">
                {t('cartTitle', 'Your Service Cart')}
              </h3>
              <span className="px-2 py-0.5 rounded-full bg-orange-100 text-orange-800 text-xs font-bold">
                {items.length}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {items.length > 0 && (
                <button
                  type="button"
                  onClick={clearCart}
                  className="text-xs text-stone-400 hover:text-rose-600 font-semibold cursor-pointer"
                >
                  {t('clearCart', 'Clear')}
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsCartOpen(false)}
                className="p-1.5 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-200/60 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Cart Body */}
          <div className="flex-1 overflow-y-auto p-5 space-y-6">
            {items.length === 0 ? (
              <div className="py-16 text-center space-y-3">
                <div className="w-16 h-16 rounded-full bg-stone-100 flex items-center justify-center mx-auto text-stone-300">
                  <ShoppingBag className="w-8 h-8" />
                </div>
                <h4 className="text-base font-bold text-stone-800">
                  {t('emptyCartMessage', 'Your cart is empty')}
                </h4>
                <p className="text-xs text-stone-500 max-w-xs mx-auto">
                  Explore our top-rated electrician, plumbing, AC, and cleaning services in Bhopal.
                </p>
                <button
                  type="button"
                  onClick={() => setIsCartOpen(false)}
                  className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-orange-600 text-white font-bold text-xs hover:bg-orange-700 cursor-pointer shadow-xs"
                >
                  {t('browseServices', 'Browse Services')} <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <>
                {/* List of Items */}
                <div className="space-y-3">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className="p-3.5 rounded-2xl border border-stone-200 bg-stone-50/50 hover:bg-white hover:border-orange-200 transition-all flex items-center justify-between gap-3 shadow-2xs"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          {item.type === 'package' && (
                            <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-bold">
                              COMBO
                            </span>
                          )}
                          <h5 className="text-xs font-bold text-stone-900 truncate">
                            {item.name}
                          </h5>
                        </div>
                        <p className="text-[11px] text-stone-500 flex items-center gap-2 mt-0.5">
                          <span>₹{item.unitPrice} each</span>
                          <span>•</span>
                          <span className="flex items-center gap-0.5 text-stone-400">
                            <Clock className="w-3 h-3" /> {item.durationMinutes} mins
                          </span>
                        </p>
                      </div>

                      {/* Quantity buttons */}
                      <div className="flex items-center gap-1.5 bg-white border border-stone-200 rounded-xl px-1.5 py-1">
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="w-5 h-5 rounded-md hover:bg-stone-100 flex items-center justify-center text-stone-500 cursor-pointer"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="text-xs font-bold text-stone-900 px-1 min-w-[16px] text-center">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="w-5 h-5 rounded-md hover:bg-stone-100 flex items-center justify-center text-stone-500 cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      {/* Delete */}
                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        className="text-stone-300 hover:text-rose-600 p-1 cursor-pointer transition-colors"
                        title="Remove"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Coupon Code Section */}
                <div className="p-4 rounded-2xl bg-orange-50/60 border border-orange-200/80 space-y-3">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-orange-950">
                    <Tag className="w-3.5 h-3.5 text-orange-600" />
                    <span>{t('applyCoupon', 'Coupons & Offers')}</span>
                  </div>

                  {appliedCoupon ? (
                    <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5 text-emerald-800 font-bold">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>Code '{appliedCoupon.code}' Applied (-₹{discountAmount})</span>
                      </div>
                      <button
                        type="button"
                        onClick={removeCoupon}
                        className="text-[11px] font-bold text-rose-600 hover:underline cursor-pointer"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={couponCodeInput}
                          onChange={(e) => setCouponCodeInput(e.target.value)}
                          placeholder="e.g. FIRST50 or BHOPAL100"
                          className="flex-1 uppercase px-3 py-2 text-xs rounded-xl bg-white border border-stone-200 focus:border-orange-500 focus:outline-hidden font-medium"
                        />
                        <button
                          type="button"
                          onClick={() => applyCoupon(couponCodeInput)}
                          className="px-3 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs cursor-pointer"
                        >
                          Apply
                        </button>
                      </div>

                      {couponError && (
                        <p className="text-[11px] text-rose-600 font-medium">{couponError}</p>
                      )}

                      {/* Quick Coupon Chips */}
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {AVAILABLE_COUPONS.map((cp) => (
                          <button
                            key={cp.code}
                            type="button"
                            onClick={() => applyCoupon(cp.code)}
                            className="px-2 py-0.5 rounded-lg bg-white border border-orange-200 text-orange-700 hover:bg-orange-100 text-[10px] font-bold cursor-pointer"
                          >
                            🏷️ {cp.code}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Bill Summary */}
                <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-2.5 text-xs text-stone-600">
                  <h5 className="font-bold text-stone-900 text-xs uppercase tracking-wider">
                    {t('billDetails', 'Bill Details')}
                  </h5>

                  <div className="flex justify-between">
                    <span>{t('itemTotal', 'Item Total')}</span>
                    <span className="font-semibold text-stone-900">₹{subtotal}</span>
                  </div>

                  <div className="flex justify-between">
                    <span className="flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                      {t('safetyFee', 'Safety & Hygiene Fee')}
                    </span>
                    <span className="font-semibold text-stone-900">₹{safetyFee}</span>
                  </div>

                  {discountAmount > 0 && (
                    <div className="flex justify-between text-emerald-700 font-semibold">
                      <span>{t('discountApplied', 'Discount')} ({appliedCoupon?.code})</span>
                      <span>-₹{discountAmount}</span>
                    </div>
                  )}

                  <div className="pt-2 border-t border-stone-200 flex justify-between text-sm font-black text-stone-900">
                    <span>{t('toPay', 'Total Payable')}</span>
                    <span className="text-orange-600">₹{totalAmount}</span>
                  </div>
                </div>

                {/* Bhopal Promise Note */}
                <div className="flex items-center gap-2 p-3 rounded-xl bg-stone-100/80 text-[11px] text-stone-600">
                  <Sparkles className="w-4 h-4 text-orange-500 flex-shrink-0" />
                  <span>
                    No advance payment required. Pay safely after service completion via UPI or Cash.
                  </span>
                </div>
              </>
            )}
          </div>

          {/* Footer Checkout Bar */}
          {items.length > 0 && (
            <div className="p-4 bg-white border-t border-stone-200 flex items-center justify-between gap-3">
              <div>
                <span className="text-[10px] text-stone-400 font-semibold block uppercase">
                  {t('toPay', 'Total')}
                </span>
                <span className="text-xl font-black text-stone-900">₹{totalAmount}</span>
              </div>

              <button
                type="button"
                onClick={handleCheckout}
                className="flex-1 max-w-xs px-6 py-3 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-black text-xs sm:text-sm shadow-md hover:shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <span>{t('proceedToBooking', 'Proceed to Book')}</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
