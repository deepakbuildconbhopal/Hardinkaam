import React, { useRef, useState, useEffect } from 'react';
import {
  Download,
  Share2,
  ShieldCheck,
  Check,
  Sparkles,
  Phone,
  Calendar,
  User,
  QrCode,
  Camera,
  Upload,
  Printer,
  RefreshCw,
  Trash2,
  Award,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';
import QRCode from 'qrcode';
import { MemberNotificationResult } from '../../services/memberNotificationService';
import { compressImageForWeb } from '../../utils/imageCompression';
import { useAuth } from '../../context/AuthContext';

interface Props {
  userName: string;
  userPhone: string;
  photoUrl?: string | null;
  notificationResult: MemberNotificationResult;
  onPhotoUpdate?: (newPhoto: string | null) => void;
}

export const DigitalIdCard: React.FC<Props> = ({
  userName,
  userPhone,
  photoUrl,
  notificationResult,
  onPhotoUpdate,
}) => {
  const { updateUserProfileData, userProfile } = useAuth();
  const [downloading, setDownloading] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [currentPhoto, setCurrentPhoto] = useState<string | null>(() => {
    return photoUrl || userProfile?.avatar || localStorage.getItem('hardinkaam_admin_avatar') || null;
  });
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoSuccessMsg, setPhotoSuccessMsg] = useState<string | null>(null);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [showPhotoOptions, setShowPhotoOptions] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);

  // Sync current photo when prop or profile changes
  useEffect(() => {
    if (photoUrl) {
      setCurrentPhoto(photoUrl);
    } else if (userProfile?.avatar) {
      setCurrentPhoto(userProfile.avatar);
    }
  }, [photoUrl, userProfile?.avatar]);

  // Generate crisp QR code data URL
  useEffect(() => {
    const verifyUrl = `https://hardinkaam.in/verify?member=${encodeURIComponent(notificationResult.memberCode)}&name=${encodeURIComponent(userName)}`;
    QRCode.toDataURL(verifyUrl, {
      width: 280,
      margin: 1,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
      errorCorrectionLevel: 'H',
    })
      .then((url) => setQrCodeDataUrl(url))
      .catch((err) => console.warn('QR Code generation notice:', err));
  }, [notificationResult.memberCode, userName]);

  const issueDate = new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  const validTill = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  // Handle file or camera photo selection with automatic web compression
  const handlePhotoSelect = async (file: File) => {
    if (!file) return;
    setUploadingPhoto(true);
    setPhotoSuccessMsg(null);

    try {
      const compressed = await compressImageForWeb(file, {
        maxDimension: 800,
        quality: 0.86,
        maxSizeKB: 250,
      });

      const dataUrl = compressed.dataUrl;
      setCurrentPhoto(dataUrl);

      // Save in parent state
      if (onPhotoUpdate) {
        onPhotoUpdate(dataUrl);
      }

      // Persist in local storage
      try {
        localStorage.setItem('hardinkaam_admin_avatar', dataUrl);
      } catch (_) {}

      // Persist in Firestore user profile
      try {
        if (updateUserProfileData) {
          await updateUserProfileData({ avatar: dataUrl });
        }
      } catch (err) {
        console.warn('Update user profile avatar notice:', err);
      }

      setPhotoSuccessMsg('फोटो सफलतापूर्वक ID कार्ड में अपडेट हो गई!');
      setShowPhotoOptions(false);
      setTimeout(() => setPhotoSuccessMsg(null), 3500);
    } catch (err) {
      console.warn('Compression notice, using direct reader:', err);
      const reader = new FileReader();
      reader.onload = (e) => {
        const raw = e.target?.result as string;
        if (raw) {
          setCurrentPhoto(raw);
          if (onPhotoUpdate) onPhotoUpdate(raw);
          localStorage.setItem('hardinkaam_admin_avatar', raw);
          if (updateUserProfileData) updateUserProfileData({ avatar: raw });
          setPhotoSuccessMsg('फोटो सफलतापूर्वक ID कार्ड में अपडेट हो गई!');
          setShowPhotoOptions(false);
          setTimeout(() => setPhotoSuccessMsg(null), 3500);
        }
      };
      reader.readAsDataURL(file);
    } finally {
      setUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (cameraInputRef.current) cameraInputRef.current.value = '';
    }
  };

  const handleRemovePhoto = async () => {
    setCurrentPhoto(null);
    if (onPhotoUpdate) onPhotoUpdate(null);
    localStorage.removeItem('hardinkaam_admin_avatar');
    try {
      if (updateUserProfileData) {
        await updateUserProfileData({ avatar: '' });
      }
    } catch (_) {}
    setShowPhotoOptions(false);
  };

  // Generate Ultra High-Res Stylish Professional ID Card Canvas
  const generateCanvas = async (): Promise<HTMLCanvasElement | null> => {
    // Canvas dimensions: 1080 x 680 (Ultra HD crisp CR80 ratio)
    const canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 680;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // 1. Base Card Outline & Deep Metallic Gradient Background
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(0, 0, 1080, 680, 32);
    ctx.clip();

    const bgGrad = ctx.createLinearGradient(0, 0, 1080, 680);
    bgGrad.addColorStop(0, '#070b13');
    bgGrad.addColorStop(0.35, '#0f172a');
    bgGrad.addColorStop(0.7, '#162033');
    bgGrad.addColorStop(1, '#090d16');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 1080, 680);

    // Subtle guilloche / security micro-watermark rings
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.035)';
    ctx.lineWidth = 1;
    for (let r = 80; r < 900; r += 55) {
      ctx.beginPath();
      ctx.arc(880, 340, r, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Top Header Banner with Deep Royal Orange to Amber Gradient
    const headerGrad = ctx.createLinearGradient(0, 0, 1080, 0);
    headerGrad.addColorStop(0, '#9a3412');
    headerGrad.addColorStop(0.3, '#c2410c');
    headerGrad.addColorStop(0.7, '#ea580c');
    headerGrad.addColorStop(1, '#d97706');
    ctx.fillStyle = headerGrad;
    ctx.fillRect(0, 0, 1080, 130);

    // Lanyard slot cutout simulation at top center
    ctx.fillStyle = '#05080f';
    ctx.beginPath();
    ctx.roundRect(485, 14, 110, 16, 8);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Metallic Gold Accent Ribbon
    const goldRibbon = ctx.createLinearGradient(0, 130, 1080, 130);
    goldRibbon.addColorStop(0, '#f59e0b');
    goldRibbon.addColorStop(0.5, '#fef3c7');
    goldRibbon.addColorStop(1, '#d97706');
    ctx.fillStyle = goldRibbon;
    ctx.fillRect(0, 130, 1080, 4);

    // Header Branding - Left side
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 36px system-ui, -apple-system, sans-serif';
    ctx.fillText('HARDINKAAM', 45, 68);

    ctx.fillStyle = '#ffedd5';
    ctx.font = '700 13px system-ui, -apple-system, sans-serif';
    ctx.letterSpacing = '1px';
    ctx.fillText('OFFICIAL DIGITAL IDENTITY CARD • हर दिन काम', 46, 92);

    ctx.fillStyle = '#fde68a';
    ctx.font = '600 11px system-ui, -apple-system, sans-serif';
    ctx.fillText('GOVT. MSME REGISTERED • ISO 9001:2015 CERTIFIED PARTNER', 46, 112);

    // Header Right - Deepak Buildcon Stamp & Hologram Chip
    ctx.fillStyle = '#ffffff';
    ctx.font = '800 15px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('DEEPAK BUILDCON BHOPAL', 960, 64);

    ctx.fillStyle = '#fed7aa';
    ctx.font = '600 12px system-ui, -apple-system, sans-serif';
    ctx.fillText('STATE & CENTRAL AUTHORIZED ENTITY', 960, 86);

    ctx.fillStyle = '#4ade80';
    ctx.font = '800 11px system-ui, -apple-system, sans-serif';
    ctx.fillText('VERIFIED CREDENTIAL • भोपाल, मध्य प्रदेश', 960, 108);
    ctx.textAlign = 'start';

    // Gold Security Chip Simulation (Smart Card Microchip at top right)
    const chipGrad = ctx.createLinearGradient(980, 45, 1030, 95);
    chipGrad.addColorStop(0, '#fef08a');
    chipGrad.addColorStop(0.5, '#eab308');
    chipGrad.addColorStop(1, '#a16207');
    ctx.fillStyle = chipGrad;
    ctx.beginPath();
    ctx.roundRect(985, 45, 52, 48, 8);
    ctx.fill();
    ctx.strokeStyle = '#ca8a04';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Chip internal circuit lines
    ctx.strokeStyle = '#713f12';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(985, 69);
    ctx.lineTo(1037, 69);
    ctx.moveTo(1011, 45);
    ctx.lineTo(1011, 93);
    ctx.stroke();

    // 2. Member Photo Frame (x=45, y=165, w=220, h=270, radius=20)
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.roundRect(45, 165, 220, 270, 20);
    ctx.fill();
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Draw uploaded photo or fallback avatar
    if (currentPhoto) {
      try {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        await new Promise((resolve) => {
          img.onload = resolve;
          img.onerror = resolve;
          img.src = currentPhoto;
        });

        ctx.save();
        ctx.beginPath();
        ctx.roundRect(49, 169, 212, 262, 17);
        ctx.clip();

        // Aspect-fit center crop photo into the frame
        const imgAspect = img.width / img.height;
        const targetAspect = 212 / 262;
        let sx = 0,
          sy = 0,
          sw = img.width,
          sh = img.height;
        if (imgAspect > targetAspect) {
          sw = img.height * targetAspect;
          sx = (img.width - sw) / 2;
        } else {
          sh = img.width / targetAspect;
          sy = (img.height - sh) / 2;
        }

        ctx.drawImage(img, sx, sy, sw, sh, 49, 169, 212, 262);
        ctx.restore();
      } catch (_) {}
    } else {
      // High-grade avatar placeholder
      ctx.fillStyle = '#334155';
      ctx.beginPath();
      ctx.arc(155, 275, 55, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#f8fafc';
      ctx.font = '900 60px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText((userName.charAt(0) || 'H').toUpperCase(), 155, 296);
      ctx.textAlign = 'start';
    }

    // Verified Ribbon Pill under Photo
    const ribbonGrad = ctx.createLinearGradient(55, 400, 255, 400);
    ribbonGrad.addColorStop(0, '#059669');
    ribbonGrad.addColorStop(1, '#10b981');
    ctx.fillStyle = ribbonGrad;
    ctx.beginPath();
    ctx.roundRect(55, 402, 200, 26, 8);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = '800 11px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('★ 100% VERIFIED MEMBER ★', 155, 419);
    ctx.textAlign = 'start';

    // 3. User Details Column (x=295 to x=770)
    // Member Name
    ctx.fillStyle = '#94a3b8';
    ctx.font = '700 12px system-ui, -apple-system, sans-serif';
    ctx.fillText('MEMBER FULL NAME / सदस्य का नाम', 295, 185);

    ctx.fillStyle = '#ffffff';
    ctx.font = '900 32px system-ui, -apple-system, sans-serif';
    ctx.fillText(userName, 295, 222);

    // Designation Badge Container
    const desigGrad = ctx.createLinearGradient(295, 240, 740, 240);
    desigGrad.addColorStop(0, 'rgba(217, 119, 6, 0.25)');
    desigGrad.addColorStop(1, 'rgba(234, 88, 12, 0.15)');
    ctx.fillStyle = desigGrad;
    ctx.beginPath();
    ctx.roundRect(295, 242, 450, 42, 10);
    ctx.fill();
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = '#fbbf24';
    ctx.font = '800 17px system-ui, -apple-system, sans-serif';
    ctx.fillText(`⚡ ${notificationResult.roleHindiTitle} (${notificationResult.roleEnglishTitle})`, 310, 269);

    // Contact Details Grid
    ctx.fillStyle = '#94a3b8';
    ctx.font = '700 11px system-ui, -apple-system, sans-serif';
    ctx.fillText('MOBILE NUMBER / मोबाइल', 295, 316);

    ctx.fillStyle = '#f8fafc';
    ctx.font = '800 18px monospace';
    ctx.fillText(`📱 ${userPhone || '+91 6267546945'}`, 295, 340);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '700 11px system-ui, -apple-system, sans-serif';
    ctx.fillText('SERVICE DISTRICT / कार्य क्षेत्र', 540, 316);

    ctx.fillStyle = '#f8fafc';
    ctx.font = '800 16px system-ui, -apple-system, sans-serif';
    ctx.fillText('📍 भोपाल एवं मध्य प्रदेश (BHOPAL)', 540, 340);

    // Issue Date and Valid Thru
    ctx.fillStyle = '#94a3b8';
    ctx.font = '700 11px system-ui, -apple-system, sans-serif';
    ctx.fillText('ISSUED DATE / जारी दिनांक', 295, 385);
    ctx.fillStyle = '#cbd5e1';
    ctx.font = '700 14px system-ui';
    ctx.fillText(issueDate, 295, 407);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '700 11px system-ui, -apple-system, sans-serif';
    ctx.fillText('VALID THRU / वैधता दिनांक', 540, 385);
    ctx.fillStyle = '#38bdf8';
    ctx.font = '800 14px system-ui';
    ctx.fillText(validTill, 540, 407);

    // 4. Security QR Code Box (x=775, y=165, w=260, h=270)
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.roundRect(775, 165, 260, 270, 20);
    ctx.fill();
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = '#0f172a';
    ctx.font = '800 12px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('OFFICIAL SECURITY QR', 905, 190);

    // Draw real QR Code image if ready
    if (qrCodeDataUrl) {
      try {
        const qrImg = new Image();
        await new Promise((resolve) => {
          qrImg.onload = resolve;
          qrImg.onerror = resolve;
          qrImg.src = qrCodeDataUrl;
        });
        ctx.drawImage(qrImg, 815, 205, 180, 180);
      } catch (_) {}
    }

    ctx.fillStyle = '#16a34a';
    ctx.font = '800 11px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('SCAN TO VERIFY IDENTITY', 905, 405);
    ctx.fillStyle = '#64748b';
    ctx.font = '600 10px system-ui';
    ctx.fillText('www.hardinkaam.in/verify', 905, 422);
    ctx.textAlign = 'start';

    // 5. Unique Member Code & Barcode Security Bar (x=45, y=460, w=990, h=135)
    ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
    ctx.beginPath();
    ctx.roundRect(45, 460, 990, 135, 20);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Member Code Block
    ctx.fillStyle = '#38bdf8';
    ctx.font = '800 12px system-ui, -apple-system, sans-serif';
    ctx.fillText('UNIQUE IDENTITY CODE / यूनिक मेम्बर कोड', 75, 492);

    ctx.fillStyle = '#ffffff';
    ctx.font = '900 34px monospace';
    ctx.fillText(notificationResult.memberCode, 75, 534);

    // Simulated crisp barcode pattern
    ctx.fillStyle = '#94a3b8';
    const barcodeStartX = 75;
    const barcodeY = 548;
    const barcodeH = 30;
    const barPattern = [3, 1, 2, 4, 1, 3, 2, 1, 4, 2, 1, 3, 1, 4, 2, 3, 1, 2, 4, 1, 3, 2, 1, 4, 2, 1, 3, 2, 4, 1, 3, 1, 4, 2, 3, 1, 2, 4, 1, 3, 2, 1, 4, 2, 1, 3, 2, 4, 1, 3, 1, 4, 2, 3];
    let curX = barcodeStartX;
    for (let i = 0; i < barPattern.length; i++) {
      ctx.fillRect(curX, barcodeY, barPattern[i], barcodeH);
      curX += barPattern[i] + 2;
    }

    // Official Gold Circular Seal Stamp
    ctx.save();
    ctx.translate(620, 528);
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, 48, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, 42, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = '#f59e0b';
    ctx.font = '800 8px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('★ DEEPAK BUILDCON ★', 0, -22);
    ctx.font = '900 13px system-ui';
    ctx.fillText('VERIFIED', 0, 5);
    ctx.font = '800 7.5px system-ui';
    ctx.fillText('HARDINKAAM BHOPAL', 0, 24);
    ctx.restore();

    // Authorized Signature
    ctx.fillStyle = '#94a3b8';
    ctx.font = '700 11px system-ui, -apple-system, sans-serif';
    ctx.fillText('AUTHORIZED SIGNATORY / अधिकृत हस्ताक्षर', 740, 492);

    // Stylized signature stroke
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(740, 532);
    ctx.bezierCurveTo(770, 515, 790, 545, 830, 520);
    ctx.bezierCurveTo(860, 500, 880, 540, 920, 525);
    ctx.stroke();

    ctx.fillStyle = '#cbd5e1';
    ctx.font = '700 11px system-ui';
    ctx.fillText('Deepak Buildcon Administration', 740, 555);
    ctx.fillStyle = '#64748b';
    ctx.font = '600 10px system-ui';
    ctx.fillText('Central Operations Head, MP', 740, 570);

    // 6. Bottom Safety & Helpline Strip
    ctx.fillStyle = '#64748b';
    ctx.font = '600 11px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(
      'HELPLINE: +91 6267546945 | SUPPORT@HARDINKAAM.IN | OFFICIAL PORTAL: WWW.HARDINKAAM.IN',
      540,
      625
    );
    ctx.font = '500 10px system-ui';
    ctx.fillText(
      `SEC-ID: ${notificationResult.memberCode} • MSME REG • GOVT RECOGNIZED PLATFORM`,
      540,
      645
    );
    ctx.textAlign = 'start';

    // 7. Outer Card Border
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(0, 0, 1080, 680, 32);
    ctx.stroke();

    ctx.restore();
    return canvas;
  };

  // Download High-Res PNG Card
  const handleDownloadIdCard = async () => {
    setDownloading(true);
    try {
      const canvas = await generateCanvas();
      if (!canvas) return;

      const dataUrl = canvas.toDataURL('image/png', 1.0);
      const link = document.createElement('a');
      link.download = `HARDINKAAM_ID_${notificationResult.memberCode}_OFFICIAL.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('ID Card generation error:', err);
    } finally {
      setDownloading(false);
    }
  };

  // Print ID Card as standard credit card / badge size
  const handlePrintIdCard = async () => {
    setPrinting(true);
    try {
      const canvas = await generateCanvas();
      if (!canvas) return;

      const dataUrl = canvas.toDataURL('image/png', 1.0);
      const printWin = window.open('', '_blank');
      if (printWin) {
        printWin.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>Print ID Card - ${userName} (${notificationResult.memberCode})</title>
              <style>
                @page {
                  size: auto;
                  margin: 10mm;
                }
                body {
                  margin: 0;
                  padding: 20px;
                  display: flex;
                  flex-direction: column;
                  align-items: center;
                  justify-content: center;
                  font-family: system-ui, sans-serif;
                  background: #f8fafc;
                }
                .print-container {
                  text-align: center;
                }
                img.id-card {
                  width: 85.6mm;
                  height: 53.98mm;
                  max-width: 100%;
                  border-radius: 4mm;
                  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                  border: 1px solid #cbd5e1;
                }
                .cut-guides {
                  margin-top: 15px;
                  font-size: 11px;
                  color: #64748b;
                }
                @media print {
                  body { background: white; padding: 0; }
                  .no-print { display: none; }
                  img.id-card { box-shadow: none; border: 1px solid #94a3b8; }
                }
              </style>
            </head>
            <body>
              <div class="print-container">
                <div class="no-print" style="margin-bottom: 16px;">
                  <button onclick="window.print()" style="padding: 10px 20px; font-weight: bold; background: #ea580c; color: white; border: none; border-radius: 8px; cursor: pointer;">
                    🖨️ अभी प्रिंट करें (Print Now)
                  </button>
                </div>
                <img class="id-card" src="${dataUrl}" alt="HARDINKAAM ID Card" />
                <div class="cut-guides">
                  <p><strong>HARDINKAAM Official Identity Badge</strong> • Deepak Buildcon Bhopal</p>
                  <p>Standard CR-80 PVC Size (85.6mm × 53.98mm)</p>
                </div>
              </div>
              <script>
                window.onload = function() {
                  setTimeout(function() {
                    window.print();
                  }, 400);
                }
              </script>
            </body>
          </html>
        `);
        printWin.document.close();
      }
    } catch (err) {
      console.error('Print card error:', err);
    } finally {
      setPrinting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Hidden File Inputs for Photo Upload */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={(e) => e.target.files?.[0] && handlePhotoSelect(e.target.files[0])}
        accept="image/*"
        disabled={uploadingPhoto}
        className="hidden"
      />
      <input
        type="file"
        ref={cameraInputRef}
        capture="user"
        onChange={(e) => e.target.files?.[0] && handlePhotoSelect(e.target.files[0])}
        accept="image/*"
        disabled={uploadingPhoto}
        className="hidden"
      />

      {/* Success Notification Alert */}
      {photoSuccessMsg && (
        <div className="p-3 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center justify-between gap-2 animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{photoSuccessMsg}</span>
          </div>
        </div>
      )}

      {/* ================= HIGH-END DIGITAL ID CARD PREVIEW ================= */}
      <div
        ref={cardRef}
        className="relative bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 rounded-3xl overflow-hidden border-2 border-amber-500/50 shadow-2xl text-white p-5 sm:p-6 space-y-4"
      >
        {/* Lanyard Hole Simulation at Top Center */}
        <div className="flex justify-center -mt-2 mb-1">
          <div className="w-16 h-2 rounded-full bg-slate-800/90 border border-white/20 shadow-inner" />
        </div>

        {/* Ambient Holographic Glow */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Card Header */}
        <div className="flex items-center justify-between border-b border-slate-700/80 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-orange-600 to-amber-500 flex items-center justify-center font-black text-white text-base shadow-md">
              H
            </div>
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-extrabold text-base tracking-tight text-white">HARDINKAAM</span>
                <span className="text-[10px] font-black uppercase tracking-wider bg-orange-500/30 text-orange-300 px-2 py-0.5 rounded-full border border-orange-500/30">
                  SMART ID CARD
                </span>
              </div>
              <p className="text-[10px] text-slate-400">DEEPAK BUILDCON • MSME & ISO VERIFIED</p>
            </div>
          </div>

          <div className="text-right">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-[11px] font-bold border border-emerald-500/30">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>ACTIVE ✅</span>
            </span>
          </div>
        </div>

        {/* Middle Body: Photo Frame + Member Info + Security QR Code */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
          {/* Member Photo Frame with Direct Upload Trigger (4 Cols on desktop) */}
          <div className="sm:col-span-4 flex flex-col items-center">
            <div
              onClick={() => setShowPhotoOptions(!showPhotoOptions)}
              className="relative w-28 h-36 sm:w-32 sm:h-40 rounded-2xl bg-slate-800 border-2 border-amber-400/80 overflow-hidden shadow-xl flex items-center justify-center group cursor-pointer"
              title="फोटो अपलोड या बदलने के लिए क्लिक करें"
            >
              {currentPhoto ? (
                <img
                  src={currentPhoto}
                  alt={userName}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              ) : (
                <div className="text-center p-2">
                  <div className="w-12 h-12 rounded-full bg-slate-700 mx-auto flex items-center justify-center text-xl font-bold text-slate-300 mb-1">
                    {userName.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <span className="text-[10px] text-amber-300 font-bold block">
                    फोटो जोड़ें
                  </span>
                </div>
              )}

              {/* Camera Hover Overlay */}
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white transition-opacity gap-1">
                {uploadingPhoto ? (
                  <RefreshCw className="w-6 h-6 animate-spin text-amber-400" />
                ) : (
                  <>
                    <Camera className="w-6 h-6 text-amber-300" />
                    <span className="text-[10px] font-bold text-amber-200">
                      फोटो बदलें
                    </span>
                  </>
                )}
              </div>

              {/* Bottom verified watermark */}
              <div className="absolute bottom-0 inset-x-0 bg-emerald-600/90 py-0.5 text-center text-[9px] font-bold text-white tracking-wide">
                100% VERIFIED
              </div>
            </div>

            {/* Direct Upload Options Under Photo */}
            <div className="mt-2 flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingPhoto}
                className="px-2.5 py-1 rounded-lg bg-orange-600/30 hover:bg-orange-600/50 text-orange-200 border border-orange-500/40 text-[10px] font-bold flex items-center gap-1 transition cursor-pointer"
                title="गैलरी से फोटो चुनें"
              >
                <Upload className="w-3 h-3" />
                <span>गैलरी</span>
              </button>
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                disabled={uploadingPhoto}
                className="px-2.5 py-1 rounded-lg bg-amber-600/30 hover:bg-amber-600/50 text-amber-200 border border-amber-500/40 text-[10px] font-bold flex items-center gap-1 transition cursor-pointer"
                title="कैमरा से फोटो लें"
              >
                <Camera className="w-3 h-3" />
                <span>कैमरा</span>
              </button>
              {currentPhoto && (
                <button
                  type="button"
                  onClick={handleRemovePhoto}
                  className="p-1 rounded-lg bg-red-600/20 hover:bg-red-600/40 text-red-300 border border-red-500/30 transition cursor-pointer"
                  title="फोटो हटाएं"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* Member Info (5 Cols on desktop) */}
          <div className="sm:col-span-5 space-y-2 text-left">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                सदस्य का नाम (Member Name)
              </p>
              <p className="text-base sm:text-lg font-black text-white leading-tight">
                {userName}
              </p>
            </div>

            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                पद / श्रेणी (Designation)
              </p>
              <span className="inline-block px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-black mt-0.5">
                ⚡ {notificationResult.roleHindiTitle} ({notificationResult.roleEnglishTitle})
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
              <div>
                <p className="text-[9px] font-bold text-slate-400 uppercase">मोबाइल (Mobile)</p>
                <p className="font-mono font-bold text-slate-200">{userPhone}</p>
              </div>
              <div>
                <p className="text-[9px] font-bold text-slate-400 uppercase">क्षेत्र (City/State)</p>
                <p className="font-bold text-slate-200 truncate">भोपाल (Bhopal)</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs pt-0.5">
              <div>
                <p className="text-[9px] font-bold text-slate-400 uppercase">जारी दिनांक (Issued)</p>
                <p className="font-semibold text-slate-300">{issueDate}</p>
              </div>
              <div>
                <p className="text-[9px] font-bold text-slate-400 uppercase">वैधता (Valid Till)</p>
                <p className="font-bold text-sky-400">{validTill}</p>
              </div>
            </div>
          </div>

          {/* Security QR Code (3 Cols on desktop) */}
          <div className="sm:col-span-3 flex flex-col items-center sm:items-end justify-center">
            <div className="p-2 bg-white rounded-2xl shadow-lg border border-slate-200 text-center">
              {qrCodeDataUrl ? (
                <img
                  src={qrCodeDataUrl}
                  alt="Security QR Code"
                  className="w-24 h-24 object-contain mx-auto"
                />
              ) : (
                <div className="w-24 h-24 bg-slate-100 flex items-center justify-center">
                  <QrCode className="w-10 h-10 text-slate-400" />
                </div>
              )}
              <span className="text-[8px] font-black text-slate-800 uppercase block tracking-wider mt-1">
                SCAN TO VERIFY
              </span>
            </div>
          </div>
        </div>

        {/* Unique Member Code & Authentic Barcode Footer Bar */}
        <div className="p-3 bg-white/5 rounded-2xl border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <p className="text-[10px] font-bold text-sky-400 uppercase tracking-wide">
              यूनिक मेम्बर कोड (Official Member ID)
            </p>
            <p className="text-lg sm:text-xl font-mono font-black text-white tracking-wider">
              {notificationResult.memberCode}
            </p>
          </div>

          <div className="text-right text-[10px] text-slate-400">
            <p className="text-emerald-400 font-bold flex items-center gap-1 sm:justify-end">
              <Check className="w-3.5 h-3.5" /> DEEPAK BUILDCON BHOPAL
            </p>
            <p className="text-[9px] text-slate-500">Helpline: +91 6267546945 • www.hardinkaam.in</p>
          </div>
        </div>
      </div>

      {/* ================= ACTION BUTTONS ================= */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
        {/* 1. Download High-Res PNG Card */}
        <button
          type="button"
          onClick={handleDownloadIdCard}
          disabled={downloading}
          className="py-3 px-3 rounded-2xl bg-gradient-to-r from-orange-600 via-amber-600 to-orange-600 hover:from-orange-500 hover:to-amber-500 text-white font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-orange-900/30 transition transform active:scale-98 cursor-pointer disabled:opacity-50"
        >
          {downloading ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin text-white" />
              <span>HD कार्ड बन रहा है...</span>
            </>
          ) : (
            <>
              <Download className="w-4 h-4 text-amber-200" />
              <span>📥 HD ID कार्ड डाउनलोड करें</span>
            </>
          )}
        </button>

        {/* 2. Print ID Card */}
        <button
          type="button"
          onClick={handlePrintIdCard}
          disabled={printing}
          className="py-3 px-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center justify-center gap-2 border border-slate-700 shadow-md transition active:scale-98 cursor-pointer disabled:opacity-50"
        >
          <Printer className="w-4 h-4 text-sky-400" />
          <span>{printing ? 'तैयार हो रहा है...' : '🖨️ ID कार्ड प्रिंट करें (Print)'}</span>
        </button>

        {/* 3. WhatsApp Share */}
        {notificationResult.whatsappDirectUrl && (
          <a
            href={notificationResult.whatsappDirectUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="py-3 px-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition active:scale-98 text-center"
          >
            <Share2 className="w-4 h-4 text-emerald-200" />
            <span>📱 WhatsApp पर भेजें</span>
          </a>
        )}
      </div>

      {/* Photo Upload Notice and Guidance */}
      <div className="p-3 rounded-2xl bg-slate-900/60 border border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
        <span className="flex items-center gap-1.5">
          <Camera className="w-3.5 h-3.5 text-amber-400" />
          <span>ID कार्ड पर अपनी ताज़ा फोटो लगाने हेतु ऊपर फोटो फ्रेम पर टैप करें या गैलरी/कैमरा बटन दबाएं।</span>
        </span>
      </div>
    </div>
  );
};
