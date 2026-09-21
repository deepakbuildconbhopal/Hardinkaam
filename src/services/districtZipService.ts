import JSZip from 'jszip';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../firebase/config';
import { logAuditEvent } from './auditService';

export interface ExtractedDistrictAsset {
  filename: string;
  relativePath: string;
  fileSize: number;
  mimeType: string;
  assetType: 'banner' | 'category_image' | 'service_image' | 'branding' | 'configuration' | 'other_asset';
  previewUrl?: string;
  dataBase64?: string;
  jsonData?: Record<string, any>;
}

export interface DistrictConfigPayload {
  districtName?: string;
  stateName?: string;
  supportPhone?: string;
  emergencyPhone?: string;
  operatingHours?: string;
  announcementNotice?: string;
  customDiscountPercent?: number;
  pricingMultiplier?: number;
  coveredLocalities?: string[];
  coveredPincodes?: string[];
  disabledCategories?: string[];
  disabledServices?: string[];
  customServiceNames?: Record<string, string>;
  customCategoryNames?: Record<string, string>;
}

export interface DistrictZipValidationResult {
  isValid: boolean;
  securityStatus: 'CLEAN_APPROVED' | 'REJECTED_UNSAFE' | 'WARNING';
  issues: string[];
  warnings: string[];
  totalFiles: number;
  totalSizeBytes: number;
  targetDistrictId: string;
  targetDistrictName?: string;
  assets: ExtractedDistrictAsset[];
  parsedConfig: DistrictConfigPayload | null;
  scannedAt: string;
}

// Strictly forbidden executable & code extensions
const BLOCKED_EXTENSIONS = new Set([
  'js', 'mjs', 'cjs', 'ts', 'tsx', 'jsx', 'php', 'phtml', 'py', 'sh', 'bash',
  'bat', 'cmd', 'exe', 'bin', 'vbs', 'ps1', 'html', 'htm', 'xhtml', 'jsp',
  'asp', 'aspx', 'cgi', 'pl', 'wasm', 'node', 'dll', 'so', 'dylib', 'jar',
  'war', 'ear', 'class', 'htaccess', 'env', 'config', 'rules'
]);

// Allowed safe image & asset extensions
const ALLOWED_IMAGE_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'webp', 'avif', 'svg']);
const ALLOWED_DATA_EXTENSIONS = new Set(['json', 'txt', 'csv', 'md']);

/**
 * Fast and lightweight validation of a District ZIP archive.
 * Step 1: Quick checks (readability, size, path traversal, executable/source files check).
 * Does NOT deeply extract or parse every asset before user confirmation.
 */
export async function validateDistrictZip(
  file: File,
  targetDistrictId: string,
  targetDistrictName: string = targetDistrictId
): Promise<DistrictZipValidationResult> {
  const issues: string[] = [];
  const warnings: string[] = [];
  let totalFiles = 0;
  let totalSizeBytes = file.size;

  if (!file) {
    return {
      isValid: false,
      securityStatus: 'REJECTED_UNSAFE',
      issues: ['कोई ZIP फ़ाइल प्राप्त नहीं हुई (No file provided).'],
      warnings: [],
      totalFiles: 0,
      totalSizeBytes: 0,
      targetDistrictId,
      targetDistrictName,
      assets: [],
      parsedConfig: null,
      scannedAt: new Date().toISOString(),
    };
  }

  // Max 50MB archive check
  const MAX_ARCHIVE_BYTES = 50 * 1024 * 1024;
  if (file.size > MAX_ARCHIVE_BYTES) {
    issues.push(`ZIP फ़ाइल का आकार ${Math.round(file.size / (1024 * 1024))}MB है, जो अधिकतम 50MB सीमा से अधिक है।`);
  }

  const BLOCKED_EXTENSIONS = new Set([
    'js', 'mjs', 'cjs', 'ts', 'tsx', 'jsx', 'php', 'phtml', 'py', 'sh', 'bash',
    'bat', 'cmd', 'exe', 'bin', 'vbs', 'ps1', 'wasm', 'node', 'dll', 'so', 'dylib', 'jar',
    'war', 'ear', 'class', 'htaccess', 'env', 'config', 'rules', 'map'
  ]);

  const BLOCKED_FILENAMES = new Set([
    'firestore.rules', 'firebase.json', 'firestore.indexes.json', 'server.ts', 'package.json', 'vite.config.ts'
  ]);

  try {
    const zip = new JSZip();
    const contents = await zip.loadAsync(file);

    const fileEntries = Object.keys(contents.files);
    totalFiles = fileEntries.length;

    if (totalFiles === 0) {
      issues.push('ZIP संग्रह रिक्त है (Empty ZIP archive).');
    }

    if (totalFiles > 1000) {
      issues.push(`ZIP संग्रह में ${totalFiles} फ़ाइलें हैं (अधिकतम सीमा: 1000 फ़ाइलें).`);
    }

    let hasDistrictConfig = false;

    for (const filename of fileEntries) {
      const entry = contents.files[filename];

      // Ignore standard folder directory entries
      if (entry.dir) continue;

      // Ignore unnecessary files / dev folders
      if (
        filename.includes('__MACOSX') ||
        filename.includes('.DS_Store') ||
        filename.startsWith('.') ||
        filename.includes('node_modules/') ||
        filename.includes('.git/') ||
        filename.includes('dist/') ||
        filename.includes('build/')
      ) {
        continue;
      }

      // 1. Path Traversal & Relative Directory Escape Checks
      if (
        filename.includes('..') ||
        filename.startsWith('/') ||
        filename.startsWith('\\') ||
        /^[a-zA-Z]:/.test(filename)
      ) {
        issues.push(`असुरक्षित पाथ ट्रैवर्सल ब्लॉक किया गया: "${filename}"`);
        continue;
      }

      const lowerName = filename.toLowerCase();
      const baseName = filename.split('/').pop()?.toLowerCase() || '';

      if (BLOCKED_FILENAMES.has(baseName) || lowerName.includes('firestore.rules') || lowerName.includes('firebase.json')) {
        issues.push(`अधिकारहीन फ़ाइल या कॉन्फ़िगरेशन अवरुद्ध: "${filename}"`);
        continue;
      }

      // 2. Extension check
      const parts = filename.split('.');
      const ext = parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';

      if (BLOCKED_EXTENSIONS.has(ext)) {
        issues.push(`अस्वीकृत निष्पादन योग्य / कोड फ़ाइल अवरुद्ध: "${filename}" (.${ext} प्रतिबंधित है)`);
        continue;
      }

      if ((baseName.includes('district') || baseName.includes('config')) && ext === 'json') {
        hasDistrictConfig = true;
      }
    }

    if (!hasDistrictConfig) {
      warnings.push('चेतावनी: "district.json" जिला कॉन्फ़िगरेशन फ़ाइल नहीं मिली, डिफ़ॉल्ट सेटिंग्स उपयोग की जाएंगी।');
    }
  } catch (err: any) {
    issues.push(`ZIP फ़ाइल पढ़ने में विफल: ${err.message || 'अमान्य प्रारूप'}`);
  }

  const isValid = issues.length === 0;
  const securityStatus: DistrictZipValidationResult['securityStatus'] =
    issues.length > 0 ? 'REJECTED_UNSAFE' : warnings.length > 0 ? 'WARNING' : 'CLEAN_APPROVED';

  return {
    isValid,
    securityStatus,
    issues,
    warnings,
    totalFiles,
    totalSizeBytes,
    targetDistrictId,
    targetDistrictName,
    assets: [], // Step 1 fast validation leaves assets empty until confirmation
    parsedConfig: null,
    scannedAt: new Date().toISOString(),
  };
}

/**
 * Step 2: Commits approved ZIP assets & configuration safely after user confirmation.
 * Processes only approved files (district.json, branding assets, category images, service config, content, district settings),
 * ignoring node_modules, .git, cache folders, source maps, etc.
 */
export async function commitApprovedDistrictZip(
  validation: DistrictZipValidationResult,
  file?: File,
  actorEmail?: string
): Promise<{ success: boolean; error?: string; updatedRecordCount?: number }> {
  if (!validation.isValid) {
    return { success: false, error: 'अवैध या अस्वीकृत ZIP पैकेज आयात नहीं किया जा सकता।' };
  }

  const districtId = validation.targetDistrictId;
  const districtName = validation.targetDistrictName || districtId;
  const currentUser = auth.currentUser;
  const adminEmail = actorEmail || currentUser?.email || 'deepakbuildconbhopal@gmail.com';

  const assets: ExtractedDistrictAsset[] = [];
  let parsedConfig: DistrictConfigPayload | null = null;
  let totalSizeBytes = 0;

  if (file) {
    try {
      const zip = new JSZip();
      const contents = await zip.loadAsync(file);
      const fileEntries = Object.keys(contents.files);

      for (const filename of fileEntries) {
        const entry = contents.files[filename];
        if (entry.dir) continue;

        if (
          filename.includes('__MACOSX') ||
          filename.includes('.DS_Store') ||
          filename.startsWith('.') ||
          filename.includes('node_modules/') ||
          filename.includes('.git/') ||
          filename.includes('dist/') ||
          filename.includes('build/') ||
          filename.endsWith('.map')
        ) {
          continue;
        }

        const parts = filename.split('.');
        const ext = parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
        const ALLOWED_IMAGE_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'webp', 'avif', 'svg']);
        const ALLOWED_DATA_EXTENSIONS = new Set(['json', 'txt', 'csv', 'md']);

        if (!ALLOWED_IMAGE_EXTENSIONS.has(ext) && !ALLOWED_DATA_EXTENSIONS.has(ext)) {
          continue;
        }

        const uint8 = await entry.async('uint8array');
        const size = uint8.byteLength;
        totalSizeBytes += size;

        let mimeType = 'application/octet-stream';
        if (ext === 'jpg' || ext === 'jpeg') mimeType = 'image/jpeg';
        else if (ext === 'png') mimeType = 'image/png';
        else if (ext === 'webp') mimeType = 'image/webp';
        else if (ext === 'avif') mimeType = 'image/avif';
        else if (ext === 'svg') mimeType = 'image/svg+xml';
        else if (ext === 'json') mimeType = 'application/json';
        else if (ext === 'txt' || ext === 'csv' || ext === 'md') mimeType = 'text/plain';

        let assetType: ExtractedDistrictAsset['assetType'] = 'other_asset';
        const lower = filename.toLowerCase();
        if (lower.includes('banner') || lower.includes('hero') || lower.includes('header')) {
          assetType = 'banner';
        } else if (lower.includes('category') || lower.includes('cat_')) {
          assetType = 'category_image';
        } else if (lower.includes('service') || lower.includes('srv_') || lower.includes('electrician') || lower.includes('plumber')) {
          assetType = 'service_image';
        } else if (lower.includes('logo') || lower.includes('seal') || lower.includes('branding') || lower.includes('icon')) {
          assetType = 'branding';
        } else if (ext === 'json') {
          assetType = 'configuration';
        }

        let itemJson: Record<string, any> | undefined;
        let dataBase64: string | undefined;

        if (ALLOWED_IMAGE_EXTENSIONS.has(ext)) {
          if (size <= 2 * 1024 * 1024) {
            const binary = Array.from(uint8)
              .map((b) => String.fromCharCode(b))
              .join('');
            dataBase64 = `data:${mimeType};base64,${btoa(binary)}`;
          }
        } else if (ext === 'json') {
          try {
            const text = new TextDecoder().decode(uint8);
            itemJson = JSON.parse(text);
            if (
              lower.includes('district') ||
              lower.includes('config') ||
              lower.includes('settings') ||
              !parsedConfig
            ) {
              parsedConfig = {
                districtName: itemJson.districtName || districtName,
                stateName: itemJson.stateName,
                supportPhone: itemJson.supportPhone || itemJson.phone,
                emergencyPhone: itemJson.emergencyPhone,
                operatingHours: itemJson.operatingHours,
                announcementNotice: itemJson.announcementNotice || itemJson.notice,
                customDiscountPercent: itemJson.customDiscountPercent,
                pricingMultiplier: itemJson.pricingMultiplier,
                coveredLocalities: Array.isArray(itemJson.coveredLocalities) ? itemJson.coveredLocalities : undefined,
                coveredPincodes: Array.isArray(itemJson.coveredPincodes) ? itemJson.coveredPincodes : undefined,
                disabledCategories: Array.isArray(itemJson.disabledCategories) ? itemJson.disabledCategories : undefined,
                disabledServices: Array.isArray(itemJson.disabledServices) ? itemJson.disabledServices : undefined,
                customServiceNames: itemJson.customServiceNames,
                customCategoryNames: itemJson.customCategoryNames,
              };
            }
          } catch (e) {
            // ignore non-config json parse error
          }
        }

        assets.push({
          filename: filename.split('/').pop() || filename,
          relativePath: filename,
          fileSize: size,
          mimeType,
          assetType,
          dataBase64,
          jsonData: itemJson,
        });
      }
    } catch (e) {
      console.error('Error processing zip assets during commit:', e);
    }
  }

  const finalAssets = assets.length > 0 ? assets : (validation.assets || []);
  const finalConfig = parsedConfig || validation.parsedConfig;
  const finalSizeBytes = totalSizeBytes > 0 ? totalSizeBytes : validation.totalSizeBytes;

  try {
    const banners: string[] = [];
    const categoryImageMap: Record<string, string> = {};
    const serviceImageMap: Record<string, string> = {};
    let customLogoUrl = '';

    for (const asset of finalAssets) {
      if (asset.dataBase64) {
        if (asset.assetType === 'banner') {
          banners.push(asset.dataBase64);
        } else if (asset.assetType === 'category_image') {
          categoryImageMap[asset.filename.replace(/\.[^/.]+$/, '')] = asset.dataBase64;
        } else if (asset.assetType === 'service_image') {
          serviceImageMap[asset.filename.replace(/\.[^/.]+$/, '')] = asset.dataBase64;
        } else if (asset.assetType === 'branding' && !customLogoUrl) {
          customLogoUrl = asset.dataBase64;
        }
      }
    }

    const now = new Date().toISOString();

    const assetManifestRef = doc(db, 'district_zip_assets', districtId);
    await setDoc(
      assetManifestRef,
      {
        districtId,
        districtName,
        uploadedBy: adminEmail,
        uploadedAt: now,
        totalAssets: finalAssets.length,
        totalSizeBytes: finalSizeBytes,
        banners,
        categoryImageMap,
        serviceImageMap,
        customLogoUrl: customLogoUrl || null,
        parsedConfig: finalConfig || {},
        assetSummary: finalAssets.map((a) => ({
          filename: a.filename,
          relativePath: a.relativePath,
          assetType: a.assetType,
          fileSize: a.fileSize,
          mimeType: a.mimeType,
        })),
      },
      { merge: true }
    );

    const partnerSnap = await getDoc(doc(db, 'franchise_partners', districtId));
    if (partnerSnap.exists()) {
      const existingData = partnerSnap.data();
      const updatedDistrictSettings = {
        ...(existingData.districtSettings || {}),
        supportPhone: finalConfig?.supportPhone || existingData.districtSettings?.supportPhone || existingData.phone,
        emergencyPhone: finalConfig?.emergencyPhone || existingData.districtSettings?.emergencyPhone,
        operatingHours: finalConfig?.operatingHours || existingData.districtSettings?.operatingHours || '08:00 AM - 08:00 PM',
        announcementNotice: finalConfig?.announcementNotice || existingData.districtSettings?.announcementNotice,
        customDiscountPercent: finalConfig?.customDiscountPercent ?? existingData.districtSettings?.customDiscountPercent,
        customBanners: banners.length > 0 ? banners : existingData.districtSettings?.customBanners,
        customLogoUrl: customLogoUrl || existingData.districtSettings?.customLogoUrl,
        lastZipImportAt: now,
      };

      await updateDoc(doc(db, 'franchise_partners', districtId), {
        districtSettings: updatedDistrictSettings,
        updatedAt: now,
      });
    }

    try {
      const cityRef = doc(db, 'franchise_cities', districtId);
      await setDoc(
        cityRef,
        {
          district: districtName,
          lastAssetImport: now,
          assetCount: finalAssets.length,
          hasCustomBranding: !!customLogoUrl || banners.length > 0,
        },
        { merge: true }
      );
    } catch (e) {
      console.warn('City update note:', e);
    }

    await logAuditEvent({
      action: 'DISTRICT_ZIP_IMPORT',
      actorId: currentUser?.uid || 'SUPER_ADMIN',
      actorEmail: adminEmail,
      targetDistrictId: districtId,
      targetDistrictName: districtName,
      details: `Imported and activated ${finalAssets.length} approved assets (${Math.round(
        finalSizeBytes / 1024
      )} KB) from ZIP for district ${districtName}`,
      metadata: {
        totalFiles: finalAssets.length,
        totalSizeBytes: finalSizeBytes,
        hasConfig: !!finalConfig,
        hasBanners: banners.length > 0,
      },
    });

    return { success: true, updatedRecordCount: finalAssets.length };
  } catch (err: any) {
    console.error('Failed to commit district ZIP:', err);
    return { success: false, error: err.message || 'ZIP डेटाबेस में सहेजने में विफल।' };
  }
}
