import React, { useEffect, useState, useMemo } from 'react';
import { Sparkles, Award, Gift, Star, Trophy, CheckCircle2, X } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

export type RewardAnimationType =
  | 'BOOKING'
  | 'REFERRAL'
  | 'PROMOTION'
  | 'ADMIN_ADJUSTMENT'
  | 'WELCOME'
  | 'EARNED'
  | 'BOOKING_BONUS'
  | 'REFERRAL_BONUS'
  | 'ADMIN_BONUS'
  | 'PROMOTIONAL_BONUS';

interface Props {
  isOpen: boolean;
  points: number;
  type: RewardAnimationType;
  message?: string;
  transactionId?: string;
  prevBalance?: number;
  newBalance?: number;
  onComplete?: () => void;
}

const ANIMATED_REWARD_STORAGE_KEY = 'hardinkaam_animated_reward_ids_v1';

export function isRewardAlreadyAnimated(transactionId?: string): boolean {
  if (!transactionId) return false;
  try {
    const raw = sessionStorage.getItem(ANIMATED_REWARD_STORAGE_KEY) || localStorage.getItem(ANIMATED_REWARD_STORAGE_KEY);
    if (!raw) return false;
    const list: string[] = JSON.parse(raw);
    return Array.isArray(list) && list.includes(transactionId);
  } catch (_) {
    return false;
  }
}

export function markRewardAsAnimated(transactionId?: string): void {
  if (!transactionId) return;
  try {
    const raw = sessionStorage.getItem(ANIMATED_REWARD_STORAGE_KEY) || localStorage.getItem(ANIMATED_REWARD_STORAGE_KEY);
    const list: string[] = raw ? JSON.parse(raw) : [];
    if (!list.includes(transactionId)) {
      list.push(transactionId);
      // Keep last 100 entries to prevent memory bloat
      const trimmed = list.slice(-100);
      sessionStorage.setItem(ANIMATED_REWARD_STORAGE_KEY, JSON.stringify(trimmed));
      localStorage.setItem(ANIMATED_REWARD_STORAGE_KEY, JSON.stringify(trimmed));
    }
  } catch (_) {}
}

export const RewardEarnAnimation: React.FC<Props> = ({
  isOpen,
  points,
  type,
  message,
  transactionId,
  prevBalance,
  newBalance,
  onComplete,
}) => {
  const { t, language } = useLanguage();
  const [visible, setVisible] = useState(false);
  const [animatedBalance, setAnimatedBalance] = useState<number | null>(null);
  const [coinFlying, setCoinFlying] = useState(false);

  // Check reduced-motion preference
  const prefersReducedMotion = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  useEffect(() => {
    if (isOpen && points > 0) {
      // Check duplicate animation prevention using reward transaction ID
      if (transactionId && isRewardAlreadyAnimated(transactionId)) {
        if (onComplete) onComplete();
        return;
      }

      setVisible(true);
      if (transactionId) {
        markRewardAsAnimated(transactionId);
      }

      // Trigger coin flight after 400ms
      if (!prefersReducedMotion) {
        const flyTimer = setTimeout(() => {
          setCoinFlying(true);
        }, 400);
        return () => clearTimeout(flyTimer);
      }

      // Smooth numeric ticker from prevBalance to newBalance (e.g. 1,200 → 1,700 Points)
      if (prevBalance !== undefined && newBalance !== undefined && prevBalance !== newBalance) {
        setAnimatedBalance(prevBalance);
        const startTime = Date.now();
        const duration = prefersReducedMotion ? 100 : 1200;

        const interval = setInterval(() => {
          const elapsed = Date.now() - startTime;
          const progress = Math.min(1, elapsed / duration);
          const current = Math.round(prevBalance + (newBalance - prevBalance) * progress);
          setAnimatedBalance(current);

          if (progress >= 1) {
            clearInterval(interval);
            setAnimatedBalance(newBalance);
          }
        }, 30);

        const timer = setTimeout(() => {
          clearInterval(interval);
          setVisible(false);
          if (onComplete) onComplete();
        }, 3000);

        return () => {
          clearInterval(interval);
          clearTimeout(timer);
        };
      } else {
        const timer = setTimeout(() => {
          setVisible(false);
          if (onComplete) onComplete();
        }, 2800);
        return () => clearTimeout(timer);
      }
    } else {
      setVisible(false);
    }
  }, [isOpen, points, transactionId, prevBalance, newBalance, prefersReducedMotion]);

  if (!isOpen || !visible || points <= 0) return null;

  // Configure translated title, icon, and contextual reward message
  let title = t('congratulations');
  let badgeLabel = t('rewardEarned');
  let icon = <Award className="w-8 h-8 text-amber-500" />;

  const isHindi = language === 'hi';

  switch (type) {
    case 'BOOKING':
    case 'BOOKING_BONUS':
      title = isHindi ? '🎉 बुकिंग पूर्ण हुई!' : '🎉 Booking Complete!';
      badgeLabel = isHindi ? 'बुकिंग रिवॉर्ड' : 'Booking Reward';
      icon = <Sparkles className={`w-8 h-8 text-amber-400 ${prefersReducedMotion ? '' : 'animate-spin'}`} />;
      break;
    case 'REFERRAL':
    case 'REFERRAL_BONUS':
      title = isHindi ? '🎁 रेफरल सफल रहा!' : '🎁 Referral Successful!';
      badgeLabel = isHindi ? 'रेफरल रिवॉर्ड' : 'Referral Reward';
      icon = <Gift className={`w-8 h-8 text-orange-400 ${prefersReducedMotion ? '' : 'animate-bounce'}`} />;
      break;
    case 'WELCOME':
      title = isHindi ? '⭐ स्वागत रिवॉर्ड!' : '⭐ Welcome Reward!';
      badgeLabel = isHindi ? 'वेलकम बोनस' : 'Welcome Bonus';
      icon = <Star className={`w-8 h-8 text-yellow-400 ${prefersReducedMotion ? '' : 'animate-pulse'}`} />;
      break;
    case 'ADMIN_ADJUSTMENT':
    case 'ADMIN_BONUS':
      title = isHindi ? '🏆 बोनस रिवॉर्ड जोड़ा गया!' : '🏆 Special Bonus Added!';
      badgeLabel = isHindi ? 'एडमिन बोनस' : 'Admin Bonus';
      icon = <Trophy className={`w-8 h-8 text-purple-400 ${prefersReducedMotion ? '' : 'animate-bounce'}`} />;
      break;
    case 'PROMOTION':
    case 'PROMOTIONAL_BONUS':
      title = isHindi ? '🎊 स्पेशल बोनस!' : '🎊 Special Bonus!';
      badgeLabel = isHindi ? 'प्रमोशनल रिवॉर्ड' : 'Promotional Reward';
      icon = <Gift className={`w-8 h-8 text-rose-400 ${prefersReducedMotion ? '' : 'animate-pulse'}`} />;
      break;
    default:
      title = isHindi ? '🎉 बधाई हो!' : '🎉 Congratulations!';
      badgeLabel = isHindi ? 'रिवॉर्ड प्राप्त हुआ' : 'Reward Earned';
      icon = <Award className="w-8 h-8 text-amber-400" />;
  }

  const handleDismiss = () => {
    setVisible(false);
    if (onComplete) onComplete();
  };

  return (
    <div
      role="dialog"
      aria-label="Reward Earned Notification"
      className="fixed inset-0 z-50 pointer-events-auto flex items-center justify-center p-4 bg-black/40 backdrop-blur-[2px] transition-opacity"
      onClick={handleDismiss}
    >
      {/* Pop-up Card */}
      <div
        onClick={(e) => e.stopPropagation()}
        className={`relative bg-gradient-to-br from-stone-900 via-stone-850 to-orange-950 text-white rounded-3xl p-6 shadow-2xl border-2 border-amber-400/60 max-w-sm w-full text-center space-y-4 ${
          prefersReducedMotion
            ? ''
            : 'animate-in zoom-in-95 duration-300 slide-in-from-bottom-6'
        }`}
      >
        {/* Dismiss Close Button */}
        <button
          type="button"
          onClick={handleDismiss}
          className="absolute top-3.5 right-3.5 p-1 rounded-full text-stone-400 hover:text-white bg-white/10 hover:bg-white/20 transition cursor-pointer"
          title={isHindi ? 'बंद करें' : 'Close'}
        >
          <X className="w-4 h-4" />
        </button>

        {/* Floating Sparkles & Confetti Effect (CSS only, lightweight) */}
        {!prefersReducedMotion && (
          <>
            <div className="absolute -top-3 -right-1 w-8 h-8 rounded-full bg-amber-400 text-stone-950 flex items-center justify-center font-black text-xs animate-ping">
              ✨
            </div>
            <div className="absolute -bottom-2 -left-2 w-7 h-7 rounded-full bg-orange-400 text-stone-950 flex items-center justify-center font-black text-xs animate-pulse">
              🎉
            </div>
            <div className="absolute top-2 left-4 text-amber-300 text-xs animate-bounce opacity-80">
              ✦
            </div>
            <div className="absolute bottom-4 right-4 text-orange-300 text-xs animate-ping opacity-75">
              ✧
            </div>
          </>
        )}

        {/* Coin / Reward Glowing Icon Visual with Motion trajectory */}
        <div className="relative mx-auto w-20 h-20 rounded-3xl bg-gradient-to-tr from-amber-500/30 via-orange-500/20 to-amber-300/30 border-2 border-amber-400/50 flex items-center justify-center shadow-xl shadow-amber-500/20">
          <div
            className={`w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-inner text-stone-950 transition-transform duration-700 ${
              coinFlying && !prefersReducedMotion ? 'scale-110 -translate-y-1 rotate-6' : ''
            }`}
          >
            {icon}
          </div>
        </div>

        {/* Title & Points Pop-up (🎉 +500 Reward Points) */}
        <div className="space-y-1">
          <span className="inline-block px-3 py-0.5 rounded-full bg-amber-400/20 border border-amber-400/40 text-[10px] font-black uppercase tracking-widest text-amber-300">
            {badgeLabel}
          </span>
          <h2 className="text-lg font-black text-white tracking-tight">{title}</h2>

          <div
            className={`text-4xl sm:text-5xl font-black text-amber-400 tracking-tight drop-shadow-md py-1 ${
              prefersReducedMotion ? '' : 'animate-in zoom-in-110 duration-200'
            }`}
          >
            +{points.toLocaleString('en-IN')} Pts
          </div>
        </div>

        {/* Smooth Wallet Balance Update Ticker (e.g. 1,200 → 1,700 Points) */}
        {prevBalance !== undefined && newBalance !== undefined && (
          <div className="py-2 px-3 rounded-2xl bg-black/40 border border-amber-400/30 flex items-center justify-between text-xs">
            <span className="text-[11px] font-bold text-stone-300">{t('availableRewards')}:</span>
            <div className="flex items-center gap-1.5 font-mono font-black">
              <span className="text-stone-400 line-through text-[11px]">
                {prevBalance.toLocaleString('en-IN')}
              </span>
              <span className="text-amber-400">→</span>
              <span className="text-amber-300 text-sm font-extrabold animate-pulse">
                {(animatedBalance ?? newBalance).toLocaleString('en-IN')} Points
              </span>
            </div>
          </div>
        )}

        {/* Dynamic Contextual Message */}
        <p className="text-xs text-stone-300 font-medium px-2 leading-relaxed">
          {message ||
            (type === 'REFERRAL' || type === 'REFERRAL_BONUS'
              ? isHindi
                ? 'रेफरल रिवॉर्ड पॉइंट्स आपके कस्टमर वॉलेट में क्रेडिट कर दिए गए हैं।'
                : 'Referral reward points credited to your Customer Reward Wallet.'
              : isHindi
              ? 'रिवॉर्ड पॉइंट्स आपके कस्टमर वॉलेट में सफलतापूर्वक जुड़ गए हैं।'
              : 'Reward points successfully credited to your Customer Reward Wallet.')}
        </p>

        {/* Bottom Success Verification Indicator */}
        <div className="pt-2 border-t border-stone-800/80 flex items-center justify-center gap-1.5 text-[11px] text-emerald-400 font-bold">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{t('walletBalanceUpdated')}</span>
        </div>
      </div>
    </div>
  );
};
