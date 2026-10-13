import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  LayoutGrid,
  Plus,
  Edit2,
  Trash2,
  Star,
  Clock,
  CheckCircle2,
  AlertCircle,
  X,
  Wrench,
  Search,
  Download,
  FileSpreadsheet,
  FileDown,
  Users,
  Layers,
  Sparkles,
  RefreshCw,
  FolderOpen,
  Upload,
  ShieldCheck,
  Check,
  Copy,
  FileText,
  Filter,
  Info,
  ArrowRight,
  GitMerge,
  Image as ImageIcon,
  Camera,
  UploadCloud,
  Link2,
  Eye,
} from 'lucide-react';
import { doc, setDoc, deleteDoc, getDocs, collection, writeBatch, query, limit } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { checkAndHandleQuotaError } from '../../utils/sparkQuotaGuard';
import { Category, Service, ServiceMan } from '../../types';
import type { WorkBook } from 'xlsx';
import { CategoryFirebaseImageUpload } from './CategoryFirebaseImageUpload';
import { compressImageForWeb, formatBytes } from '../../utils/imageCompression';
import { ensureAdminAuthToken } from '../../utils/apiHandler';

interface Props {
  categories: Category[];
  services: Service[];
  serviceMen?: ServiceMan[];
  onRefresh: () => void;
  onSelectTab?: (tab: string) => void;
}

interface ParsedServiceRow {
  _id: string;
  _status: 'valid' | 'invalid';
  _duplicateStatus: 'new_unique' | 'exists_in_db' | 'duplicate_in_file';
  _uniqueKey: string;
  _reason?: string;
  _matchedExistingId?: string;
  name: string;
  categoryName: string;
  basePrice: number;
  priceUnit: string;
  durationMinutes: number;
  description: string;
  imageUrl?: string;
  [key: string]: any;
}

export const AdminCatalogManager: React.FC<Props> = ({
  categories,
  services,
  serviceMen = [],
  onRefresh,
  onSelectTab,
}) => {
  const [search, setSearch] = useState('');
  const [selectedCatFilter, setSelectedCatFilter] = useState<string>('all');
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showBulkUploadModal, setShowBulkUploadModal] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [exportFeedback, setExportFeedback] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  // Bulk Upload state
  const bulkFileInputRef = useRef<HTMLInputElement | null>(null);
  const [bulkInputText, setBulkInputText] = useState<string>('');
  const [bulkFileName, setBulkFileName] = useState<string>('');
  const [bulkSheetNames, setBulkSheetNames] = useState<string[]>([]);
  const [bulkSelectedSheet, setBulkSelectedSheet] = useState<string>('');
  const [bulkWorkbook, setBulkWorkbook] = useState<WorkBook | null>(null);
  const [isBulkDragOver, setIsBulkDragOver] = useState<boolean>(false);
  const [bulkDuplicatePolicy, setBulkDuplicatePolicy] = useState<'skip_duplicates' | 'update_existing'>('skip_duplicates');
  const [bulkFilterDuplicatesInFile, setBulkFilterDuplicatesInFile] = useState<boolean>(true);
  const [bulkDropJustDial, setBulkDropJustDial] = useState<boolean>(true);
  const [isBulkProcessing, setIsBulkProcessing] = useState<boolean>(false);
  const [bulkProgress, setBulkProgress] = useState<{ current: number; total: number } | null>(null);
  const [bulkSuccessMsg, setBulkSuccessMsg] = useState<string | null>(null);
  const [bulkErrorMsg, setBulkErrorMsg] = useState<string | null>(null);
  const [copiedTemplate, setCopiedTemplate] = useState<boolean>(false);

  // Live servicemen cache if not provided through props
  const [loadedServiceMen, setLoadedServiceMen] = useState<ServiceMan[]>(serviceMen);

  useEffect(() => {
    if (serviceMen && serviceMen.length > 0) {
      setLoadedServiceMen(serviceMen);
    } else {
      // Fetch servicemen from Firestore if empty (capped at 100)
      getDocs(query(collection(db, 'serviceMen'), limit(100)))
        .then((snapshot) => {
          const list: ServiceMan[] = [];
          snapshot.forEach((docSnap) => {
            list.push({ id: docSnap.id, ...(docSnap.data() as Omit<ServiceMan, 'id'>) });
          });
          if (list.length > 0) {
            setLoadedServiceMen(list);
          }
        })
        .catch((err) => {
          console.warn('Could not fetch serviceMen for export:', err);
          checkAndHandleQuotaError(err);
        });
    }
  }, [serviceMen]);

  // Service form state
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState(categories[0]?.id || 'cat_electrical');
  const [basePrice, setBasePrice] = useState('299');
  const [durationMinutes, setDurationMinutes] = useState('45');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [priceUnit, setPriceUnit] = useState('service');
  const [ratingVal, setRatingVal] = useState('4.8');
  const [ratingCountVal, setRatingCountVal] = useState('12');
  const [saving, setSaving] = useState(false);
  const [serviceSaveError, setServiceSaveError] = useState<string | null>(null);

  // Category form state
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [catName, setCatName] = useState('');
  const [catIcon, setCatIcon] = useState('Wrench');
  const [catDesc, setCatDesc] = useState('');
  const [catImageUrl, setCatImageUrl] = useState('');
  const [savingCat, setSavingCat] = useState(false);
  const [catSaveError, setCatSaveError] = useState<string | null>(null);

  // Service picture upload state
  const [serviceImageTab, setServiceImageTab] = useState<'upload' | 'preset' | 'url'>('upload');
  const [imageUploading, setImageUploading] = useState(false);
  const [imageUploadError, setImageUploadError] = useState<string | null>(null);
  const [serviceCompressionInfo, setServiceCompressionInfo] = useState<{
    original: string;
    compressed: string;
    ratio: number;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageFileChange = async (file?: File) => {
    if (!file) return;
    setImageUploading(true);
    setImageUploadError(null);
    setServiceCompressionInfo(null);
    try {
      // Auto-compress to optimal responsive size for website (max 900px, WebP/JPEG, ~150-250KB)
      const compressed = await compressImageForWeb(file, {
        maxDimension: 900,
        quality: 0.84,
        maxSizeKB: 250,
      });

      setImageUrl(compressed.dataUrl);
      setServiceCompressionInfo({
        original: formatBytes(compressed.originalSize),
        compressed: formatBytes(compressed.compressedSize),
        ratio: compressed.compressionRatio,
      });
    } catch (err: any) {
      setImageUploadError(err?.message || 'इमेज अपलोड करने में विफल।');
    } finally {
      setImageUploading(false);
    }
  };

  // Curated Preset Stock Images for Home Services
  const SERVICE_PRESET_IMAGES = [
    { label: 'AC Service & Jet Foam', url: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=600&auto=format&fit=crop&q=80', cat: 'AC' },
    { label: 'Appliance Repair Pro', url: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=600&auto=format&fit=crop&q=80', cat: 'Appliances' },
    { label: 'Electrician & Wiring', url: 'https://images.unsplash.com/photo-1621905252507-b35492cc74b4?w=600&auto=format&fit=crop&q=80', cat: 'Electrical' },
    { label: 'Switchboard & Fuse', url: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=600&auto=format&fit=crop&q=80', cat: 'Electrical' },
    { label: 'Plumber & Tap Repair', url: 'https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=600&auto=format&fit=crop&q=80', cat: 'Plumbing' },
    { label: 'Pipe Fitting & Basin', url: 'https://images.unsplash.com/photo-1504148455328-c376907d081c?w=600&auto=format&fit=crop&q=80', cat: 'Plumbing' },
    { label: 'Deep Home Cleaning', url: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=600&auto=format&fit=crop&q=80', cat: 'Cleaning' },
    { label: 'Sofa & Floor Scrub', url: 'https://images.unsplash.com/photo-1527515637462-cff94eecc1ac?w=600&auto=format&fit=crop&q=80', cat: 'Cleaning' },
    { label: 'RO Water Purifier', url: 'https://images.unsplash.com/photo-1584771145729-0bd9fda6529b?w=600&auto=format&fit=crop&q=80', cat: 'RO Purifier' },
    { label: 'Carpentry & Furniture', url: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=600&auto=format&fit=crop&q=80', cat: 'Carpentry' },
    { label: 'Wall Painting & Putty', url: 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=600&auto=format&fit=crop&q=80', cat: 'Painting' },
    { label: 'Pest Control Treatment', url: 'https://images.unsplash.com/photo-1632733711679-529326f6db37?w=600&auto=format&fit=crop&q=80', cat: 'Pest Control' },
    { label: 'Deepak Buildcon Civil', url: 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=600&auto=format&fit=crop&q=80', cat: 'Construction' },
  ];

  // Slug generator helper
  const slugify = useCallback((text: string) =>
    text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '_')
      .replace(/^-+|-+$/g, ''), []);

  // Standard Template CSV for bulk services
  const SAMPLE_SERVICES_CSV = `name,categoryName,basePrice,priceUnit,durationMinutes,description,imageUrl
RO Membrane & Filter Replacement,RO Water Purifier,499,per visit,45,Complete RO membrane carbon and sediment filter change with raw TDS check,https://images.unsplash.com/photo-1584771145729-0bd9fda6529b?w=600&auto=format&fit=crop&q=80
RO Full Installation & Piping,RO Water Purifier,699,per unit,60,Wall mounting water inlet valve and reject drain line complete setup,https://images.unsplash.com/photo-1584771145729-0bd9fda6529b?w=600&auto=format&fit=crop&q=80
RO Booster Pump & SMPS Repair,RO Water Purifier,349,per visit,45,Low water pressure diagnosis adapter power supply and motor repair,https://images.unsplash.com/photo-1584771145729-0bd9fda6529b?w=600&auto=format&fit=crop&q=80
Switch & Socket Replacement,Electrician,149,per point,30,Diagnosis and replacement of burnt or broken modular switches and sockets,https://images.unsplash.com/photo-1621905252507-b35492cc74b4?w=600&auto=format&fit=crop&q=80
Ceiling Fan Installation & Repair,Electrician,249,per fan,45,Assembly regulator speed check and ceiling mounting with safety clamps,https://images.unsplash.com/photo-1621905252507-b35492cc74b4?w=600&auto=format&fit=crop&q=80
Tap & Mixer Leakage Repair,Plumber,199,per tap,30,Spindle washer change valve servicing and faucet tightening with zero drip guarantee,https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=600&auto=format&fit=crop&q=80
Split AC Jet Foam Wash,AC & Appliance Repair,599,per AC,60,High pressure deep cleaning of cooling coils blower wheel and outdoor unit,https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=600&auto=format&fit=crop&q=80
Bathroom Deep Sanitization,Cleaning & Disinfection,1299,per bathroom,90,Hard water stain removal floor tile scrubbing and mirror sanitization,https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=600&auto=format&fit=crop&q=80`;

  // Download Sample Excel (.xlsx) file
  const handleDownloadServicesExcelTemplate = async () => {
    const XLSX = await import('xlsx');
    const workbook = XLSX.read(SAMPLE_SERVICES_CSV, { type: 'string' });
    XLSX.writeFile(workbook, `hardinkaam_bulk_services_template.xlsx`);
  };

  // Download Sample CSV (.csv) file
  const handleDownloadServicesCsvTemplate = () => {
    const blob = new Blob(['\uFEFF' + SAMPLE_SERVICES_CSV], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `hardinkaam_bulk_services_template.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Pre-index existing services for fast deduplication lookup
  const existingServicesIndex = useMemo(() => {
    const map = new Map<string, { id: string; name: string; categoryName: string }>();
    services.forEach((s) => {
      const cat = (s.categoryName || '').toLowerCase().trim();
      const srv = (s.name || '').toLowerCase().trim();
      map.set(`${cat}:::${srv}`, { id: s.id, name: s.name, categoryName: s.categoryName });
      map.set(s.id.toLowerCase().trim(), { id: s.id, name: s.name, categoryName: s.categoryName });
      map.set(srv, { id: s.id, name: s.name, categoryName: s.categoryName });
    });
    return map;
  }, [services]);

  // Clean & Parse Bulk Data from Text / File with Deduplication
  const parsedBulkData = useMemo(() => {
    if (!bulkInputText.trim()) {
      return {
        headers: [],
        rows: [] as ParsedServiceRow[],
        validCount: 0,
        uniqueNewCount: 0,
        duplicateDbCount: 0,
        duplicateFileCount: 0,
      };
    }

    const text = bulkInputText.trim();
    let rawRows: Record<string, any>[] = [];
    let headers: string[] = [];

    // 1. Check if JSON
    if (text.startsWith('[') || text.startsWith('{')) {
      try {
        const parsed = JSON.parse(text);
        const arrayData = Array.isArray(parsed) ? parsed : [parsed];
        if (arrayData.length > 0) {
          const rawHeaders = Array.from(new Set(arrayData.flatMap((item) => Object.keys(item))));
          headers = bulkDropJustDial
            ? rawHeaders.filter((h) => !/^(justdial|justdail|just_dial|jd_|justdial_)/i.test(h))
            : rawHeaders;

          rawRows = arrayData.map((item) => {
            const cleanedItem: Record<string, any> = {};
            headers.forEach((h) => {
              cleanedItem[h] = item[h] !== undefined ? item[h] : '';
            });
            return { id: item.id || '', ...cleanedItem };
          });
        }
      } catch (err) {
        // Fall back to CSV parsing
      }
    }

    // 2. CSV / TSV Parsing
    if (rawRows.length === 0) {
      const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
      if (lines.length > 0) {
        const delimiter = lines[0].includes('\t') ? '\t' : ',';

        const parseLine = (line: string): string[] => {
          const values: string[] = [];
          let current = '';
          let inQuotes = false;
          for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
              inQuotes = !inQuotes;
            } else if (char === delimiter && !inQuotes) {
              values.push(current.trim().replace(/^["']|["']$/g, ''));
              current = '';
            } else {
              current += char;
            }
          }
          values.push(current.trim().replace(/^["']|["']$/g, ''));
          return values;
        };

        const rawHeaders = parseLine(lines[0]);
        const validHeaderIndices: number[] = [];
        headers = [];

        rawHeaders.forEach((h, idx) => {
          const isJD = /^(justdial|justdail|just_dial|jd_|justdial_)/i.test(h.trim());
          if (!bulkDropJustDial || !isJD) {
            headers.push(h.trim());
            validHeaderIndices.push(idx);
          }
        });

        for (let i = 1; i < lines.length; i++) {
          const rawValues = parseLine(lines[i]);
          if (rawValues.length === 0 || (rawValues.length === 1 && !rawValues[0])) continue;

          const rowData: Record<string, any> = {};
          validHeaderIndices.forEach((origIdx, cleanIdx) => {
            const headerName = headers[cleanIdx] || `col_${cleanIdx + 1}`;
            rowData[headerName] = rawValues[origIdx] !== undefined ? rawValues[origIdx] : '';
          });
          rawRows.push(rowData);
        }
      }
    }

    const seenInFileKeys = new Set<string>();
    let validCount = 0;
    let uniqueNewCount = 0;
    let duplicateDbCount = 0;
    let duplicateFileCount = 0;

    const rows: ParsedServiceRow[] = rawRows.map((item, idx) => {
      const srvName = String(item.name || item.serviceName || item.title || item.ServiceName || item.Service_Name || '').trim();
      const catName = String(item.categoryName || item.category || item.trade || item.Category || item.Trade || 'General Services').trim();
      const rawPrice = item.basePrice || item.price || item.rate || item.BasePrice || item.Rate || 199;
      const basePrice = Number(rawPrice) || 199;
      const unit = String(item.priceUnit || item.unit || item.Unit || 'per visit').trim();
      const rawDuration = item.durationMinutes || item.duration || item.Duration || 45;
      const durationMinutes = Number(rawDuration) || 45;
      const desc = String(item.description || item.desc || item.Description || `${srvName} professional verified service in Bhopal`).trim();
      const img = String(item.imageUrl || item.image || item.Image || 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=500&auto=format&fit=crop&q=80').trim();

      const uniqueKey = `${catName.toLowerCase()}:::${srvName.toLowerCase()}`;
      let status: 'valid' | 'invalid' = 'valid';
      let reason: string | undefined;

      if (!srvName) {
        status = 'invalid';
        reason = 'सर्विस का नाम (Service Name) अनुपस्थित है।';
      }

      let duplicateStatus: 'new_unique' | 'exists_in_db' | 'duplicate_in_file' = 'new_unique';
      let matchedExistingId: string | undefined;

      if (status === 'valid') {
        // Check if seen earlier in this file
        if (bulkFilterDuplicatesInFile && seenInFileKeys.has(uniqueKey)) {
          duplicateStatus = 'duplicate_in_file';
          duplicateFileCount++;
        } else {
          seenInFileKeys.add(uniqueKey);

          // Check if exists in DB
          if (existingServicesIndex.has(uniqueKey)) {
            duplicateStatus = 'exists_in_db';
            matchedExistingId = existingServicesIndex.get(uniqueKey)?.id;
            duplicateDbCount++;
          } else {
            duplicateStatus = 'new_unique';
            uniqueNewCount++;
          }
        }
        validCount++;
      }

      return {
        _id: `bulk_srv_${idx + 1}`,
        _status: status,
        _duplicateStatus: duplicateStatus,
        _uniqueKey: uniqueKey,
        _reason: reason,
        _matchedExistingId: matchedExistingId,
        name: srvName,
        categoryName: catName,
        basePrice,
        priceUnit: unit,
        durationMinutes,
        description: desc,
        imageUrl: img,
        ...item,
      };
    });

    return {
      headers,
      rows,
      validCount,
      uniqueNewCount,
      duplicateDbCount,
      duplicateFileCount,
    };
  }, [bulkInputText, bulkDropJustDial, bulkFilterDuplicatesInFile, existingServicesIndex]);

  // Process uploaded Excel / CSV file
  const processBulkFile = (file: File) => {
    setBulkFileName(file.name);
    setBulkErrorMsg(null);
    setBulkSuccessMsg(null);

    const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');

    if (isExcel) {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const XLSX = await import('xlsx');
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          setBulkWorkbook(workbook);
          setBulkSheetNames(workbook.SheetNames);

          if (workbook.SheetNames.length > 0) {
            const firstSheet = workbook.SheetNames[0];
            setBulkSelectedSheet(firstSheet);
            const worksheet = workbook.Sheets[firstSheet];
            const csvText = XLSX.utils.sheet_to_csv(worksheet);
            setBulkInputText(csvText);
            setBulkSuccessMsg(`📊 एक्सेल फाइल "${file.name}" (शीट: ${firstSheet}) सफलतापूर्वक लोड हो गई!`);
          }
        } catch (err: any) {
          console.error('Error reading Excel file:', err);
          setBulkErrorMsg(`एक्सेल फाइल पढ़ने में समस्या: ${err.message || 'Unknown error'}`);
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        setBulkWorkbook(null);
        setBulkSheetNames([]);
        setBulkSelectedSheet('');
        setBulkInputText(text);
        setBulkSuccessMsg(`📄 फ़ाइल "${file.name}" सफलतापूर्वक लोड हो गई!`);
      };
      reader.readAsText(file);
    }
  };

  const handleBulkFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processBulkFile(e.target.files[0]);
    }
  };

  const handleBulkSheetChange = async (sheetName: string) => {
    setBulkSelectedSheet(sheetName);
    if (bulkWorkbook && bulkWorkbook.Sheets[sheetName]) {
      const XLSX = await import('xlsx');
      const worksheet = bulkWorkbook.Sheets[sheetName];
      const csvText = XLSX.utils.sheet_to_csv(worksheet);
      setBulkInputText(csvText);
      setBulkSuccessMsg(`शीट "${sheetName}" लोड हो गई।`);
    }
  };

  const handleLoadSampleServices = () => {
    setBulkWorkbook(null);
    setBulkSheetNames([]);
    setBulkSelectedSheet('');
    setBulkFileName('hardinkaam_sample_services.csv');
    setBulkInputText(SAMPLE_SERVICES_CSV);
    setBulkSuccessMsg('✨ भोपाल होम सर्विसेज का सैंपल डेटा लोड हो गया! नीचे विश्लेषण देखें।');
  };

  const handleCopySampleServices = () => {
    navigator.clipboard.writeText(SAMPLE_SERVICES_CSV);
    setCopiedTemplate(true);
    setTimeout(() => setCopiedTemplate(false), 2000);
  };

  // Filter rows that will actually be uploaded
  const bulkRowsToUpload = useMemo(() => {
    return parsedBulkData.rows.filter((row) => {
      if (row._status !== 'valid') return false;
      if (row._duplicateStatus === 'duplicate_in_file') return false;
      if (bulkDuplicatePolicy === 'skip_duplicates') {
        return row._duplicateStatus === 'new_unique';
      }
      return true;
    });
  }, [parsedBulkData.rows, bulkDuplicatePolicy]);

  // Execute Firestore Batch Commit for Bulk Services
  const handleCommitBulkServices = async () => {
    if (bulkRowsToUpload.length === 0) {
      if (parsedBulkData.duplicateDbCount > 0 && bulkDuplicatePolicy === 'skip_duplicates') {
        setBulkErrorMsg('सभी सेवाएं पहले से डेटाबेस में मौजूद हैं। यदि आप उनके रेट या जानकारी अपडेट करना चाहते हैं तो "मौजूदा रिकॉर्ड्स अपडेट करें" विकल्प चुनें।');
      } else {
        setBulkErrorMsg('अपलोड करने के लिए कोई मान्य सर्विस डेटा नहीं मिला।');
      }
      return;
    }

    setIsBulkProcessing(true);
    setBulkErrorMsg(null);
    setBulkSuccessMsg(null);
    setBulkProgress({ current: 0, total: bulkRowsToUpload.length });

    try {
      // Build dynamic category map from existing categories
      const catMap: Record<string, { id: string; name: string }> = {};
      categories.forEach((c) => {
        catMap[c.name.toLowerCase().trim()] = { id: c.id, name: c.name };
        catMap[c.slug.toLowerCase().trim()] = { id: c.id, name: c.name };
      });

      const CHUNK_SIZE = 400;
      let committedCount = 0;
      let newlyAddedCount = 0;
      let updatedExistingCount = 0;

      for (let i = 0; i < bulkRowsToUpload.length; i += CHUNK_SIZE) {
        const chunk = bulkRowsToUpload.slice(i, i + CHUNK_SIZE);
        const batch = writeBatch(db);

        for (const row of chunk) {
          const isExisting = row._duplicateStatus === 'exists_in_db';
          if (isExisting) {
            updatedExistingCount++;
          } else {
            newlyAddedCount++;
          }

          const rawCat = row.categoryName || 'General Services';
          const catSlug = slugify(rawCat);
          let matchedCatId = `cat_${catSlug}`.slice(0, 30);
          let matchedCatName = rawCat;

          if (catMap[rawCat.toLowerCase().trim()]) {
            matchedCatId = catMap[rawCat.toLowerCase().trim()].id;
            matchedCatName = catMap[rawCat.toLowerCase().trim()].name;
          } else {
            // Auto-create missing Category doc
            const catDoc: Category = {
              id: matchedCatId,
              name: matchedCatName,
              slug: catSlug,
              description: `${matchedCatName} on-demand verified services in Bhopal`,
              icon: 'Wrench',
              order: 15,
              isActive: true,
            };
            const catDocRef = doc(db, 'categories', matchedCatId);
            batch.set(catDocRef, catDoc, { merge: true });
            catMap[rawCat.toLowerCase().trim()] = { id: matchedCatId, name: matchedCatName };
          }

          const srvSlug = slugify(row.name);
          const serviceId = row._matchedExistingId || `srv_${catSlug}_${srvSlug}`.slice(0, 50);

          const serviceDoc: Service = {
            id: serviceId,
            categoryId: matchedCatId,
            categoryName: matchedCatName,
            name: row.name,
            description: row.description || `${row.name} professional service in Bhopal with warranty.`,
            basePrice: row.basePrice || 199,
            priceUnit: row.priceUnit || 'per visit',
            durationMinutes: row.durationMinutes || 45,
            imageUrl: row.imageUrl || 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=500&auto=format&fit=crop&q=80',
            rating: 4.9,
            ratingCount: 24,
            isActive: true,
          };

          const srvDocRef = doc(db, 'services', serviceId);
          batch.set(srvDocRef, serviceDoc, { merge: true });
        }

        await batch.commit();
        committedCount += chunk.length;
        setBulkProgress({ current: committedCount, total: bulkRowsToUpload.length });
      }

      onRefresh();
      setBulkSuccessMsg(
        `🎉 शानदार! सफलतापूर्वक ${newlyAddedCount} नई सेवाएं मास्टर डेटाबेस में जोड़ी गईं ${
          updatedExistingCount > 0 ? `तथा ${updatedExistingCount} मौजूदा सेवाएं अपडेट की गईं!` : '!'
        }`
      );
      setExportFeedback(
        `बल्क सर्विस अपलोड सफल: ${newlyAddedCount} नई सेवाएं जोड़ी गईं, कैटलॉग रिफ्रेश हो गया है!`
      );
      setTimeout(() => setExportFeedback(null), 5000);
    } catch (err: any) {
      console.error('Error committing bulk services:', err);
      setBulkErrorMsg(`अपलोड प्रक्रिया में त्रुटि: ${err.message || 'Unknown error'}`);
    } finally {
      setIsBulkProcessing(false);
    }
  };
  const triggerCsvDownload = (
    filename: string,
    headers: string[],
    rows: (string | number | boolean | null | undefined)[][]
  ) => {
    const csvContent = [
      headers.map((h) => `"${String(h).replace(/"/g, '""')}"`).join(','),
      ...rows.map((row) =>
        row
          .map((cell) => {
            if (cell === null || cell === undefined) return '""';
            return `"${String(cell).replace(/"/g, '""')}"`;
          })
          .join(',')
      ),
    ].join('\r\n');

    // Prepend UTF-8 BOM (\uFEFF) for perfect Hindi/English encoding in MS Excel & Google Sheets
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const getFormattedDate = () => {
    return new Date().toISOString().split('T')[0];
  };

  // 1. Export Services CSV
  const handleExportServicesCsv = () => {
    setIsExporting(true);
    try {
      const dateStr = getFormattedDate();
      const headers = [
        'Service ID',
        'Service Name',
        'Category Name',
        'Category ID',
        'Base Price (INR)',
        'Price Unit',
        'Duration (Minutes)',
        'Rating',
        'Review Count',
        'Active Status',
        'Description',
        'Image URL',
      ];

      const rows = services.map((s) => [
        s.id,
        s.name,
        s.categoryName || '',
        s.categoryId || '',
        s.basePrice || 0,
        s.priceUnit || 'service',
        s.durationMinutes || 45,
        s.rating || 4.8,
        s.ratingCount || 0,
        s.isActive ? 'Active' : 'Inactive',
        s.description || '',
        s.imageUrl || '',
      ]);

      triggerCsvDownload(`hardinkaam_services_catalog_${dateStr}.csv`, headers, rows);
      setExportFeedback(`सफलतापूर्वक ${services.length} सर्विसेज की CSV फाइल डाउनलोड हो गई!`);
      setTimeout(() => setExportFeedback(null), 4500);
    } catch (err) {
      console.error('Export services CSV failed:', err);
    } finally {
      setIsExporting(false);
    }
  };

  // 2. Export Categories CSV
  const handleExportCategoriesCsv = () => {
    setIsExporting(true);
    try {
      const dateStr = getFormattedDate();
      const headers = [
        'Category ID',
        'Category Name',
        'Slug',
        'Icon',
        'Display Order',
        'Active Status',
        'Description',
        'Image URL',
      ];

      const rows = categories.map((c) => [
        c.id,
        c.name,
        c.slug || '',
        c.icon || '',
        c.order || 1,
        c.isActive ? 'Active' : 'Inactive',
        c.description || '',
        c.imageUrl || '',
      ]);

      triggerCsvDownload(`hardinkaam_categories_${dateStr}.csv`, headers, rows);
      setExportFeedback(`सफलतापूर्वक ${categories.length} कैटेगरीज की CSV फाइल डाउनलोड हो गई!`);
      setTimeout(() => setExportFeedback(null), 4500);
    } catch (err) {
      console.error('Export categories CSV failed:', err);
    } finally {
      setIsExporting(false);
    }
  };

  // 3. Export Service Men / Pros CSV
  const handleExportServiceMenCsv = () => {
    setIsExporting(true);
    try {
      const dateStr = getFormattedDate();
      const headers = [
        'Service Man ID',
        'Full Name',
        'Phone Number',
        'Email',
        'Assigned Categories',
        'Service Area / Bhopal Locality',
        'Experience (Years)',
        'Hourly Rate (INR)',
        'Total Jobs Completed',
        'Customer Rating',
        'KYC Status',
        'Verified Partner',
        'Availability',
      ];

      const rows = loadedServiceMen.map((m) => [
        m.id,
        m.name,
        m.phone || '',
        m.email || '',
        (m.categoryNames || []).join('; ') || '',
        m.serviceArea || 'Bhopal Central',
        m.experienceYears || 0,
        m.hourlyRate || 299,
        m.totalJobs || 0,
        m.rating || 4.8,
        m.kycStatus || (m.isVerified ? 'verified' : 'pending'),
        m.isVerified ? 'Yes' : 'No',
        m.isAvailable ? 'Available' : 'Busy',
      ]);

      triggerCsvDownload(`hardinkaam_servicemen_${dateStr}.csv`, headers, rows);
      setExportFeedback(`सफलतापूर्वक ${loadedServiceMen.length} कारीगरों (Pros) की CSV फाइल डाउनलोड हो गई!`);
      setTimeout(() => setExportFeedback(null), 4500);
    } catch (err) {
      console.error('Export servicemen CSV failed:', err);
    } finally {
      setIsExporting(false);
    }
  };

  // 4. Export Complete Master Excel (.xlsx) with 3 Worksheets
  const handleExportAllExcel = async () => {
    setIsExporting(true);
    try {
      const XLSX = await import('xlsx');
      const dateStr = getFormattedDate();
      const wb = XLSX.utils.book_new();

      // Sheet 1: Services
      const servicesSheetData = services.map((s) => ({
        'Service ID': s.id,
        'Service Name': s.name,
        'Category Name': s.categoryName || '',
        'Category ID': s.categoryId || '',
        'Base Price (INR)': s.basePrice || 0,
        'Price Unit': s.priceUnit || 'service',
        'Duration (Mins)': s.durationMinutes || 45,
        'Rating': s.rating || 4.8,
        'Reviews': s.ratingCount || 0,
        'Status': s.isActive ? 'Active' : 'Inactive',
        'Description': s.description || '',
        'Image URL': s.imageUrl || '',
      }));
      const wsServices = XLSX.utils.json_to_sheet(servicesSheetData);
      XLSX.utils.book_append_sheet(wb, wsServices, 'Services');

      // Sheet 2: Categories
      const categoriesSheetData = categories.map((c) => ({
        'Category ID': c.id,
        'Category Name': c.name,
        'Slug': c.slug || '',
        'Icon': c.icon || '',
        'Order': c.order || 1,
        'Status': c.isActive ? 'Active' : 'Inactive',
        'Description': c.description || '',
      }));
      const wsCategories = XLSX.utils.json_to_sheet(categoriesSheetData);
      XLSX.utils.book_append_sheet(wb, wsCategories, 'Categories');

      // Sheet 3: Service Men
      const serviceMenSheetData = loadedServiceMen.map((m) => ({
        'Pro ID': m.id,
        'Full Name': m.name,
        'Phone': m.phone || '',
        'Email': m.email || '',
        'Categories': (m.categoryNames || []).join(', '),
        'Service Area': m.serviceArea || 'Bhopal',
        'Experience (Yrs)': m.experienceYears || 0,
        'Hourly Rate (INR)': m.hourlyRate || 299,
        'Jobs Done': m.totalJobs || 0,
        'Rating': m.rating || 4.8,
        'KYC Status': m.kycStatus || (m.isVerified ? 'verified' : 'pending'),
        'Verified': m.isVerified ? 'Yes' : 'No',
        'Availability': m.isAvailable ? 'Available' : 'Busy',
      }));
      const wsServiceMen = XLSX.utils.json_to_sheet(serviceMenSheetData);
      XLSX.utils.book_append_sheet(wb, wsServiceMen, 'ServiceMen');

      XLSX.writeFile(wb, `hardinkaam_master_catalog_${dateStr}.xlsx`);
      setExportFeedback(`सफलतापूर्वक पूरा मास्टर कैटलॉग (.xlsx 3 शीट्स) डाउनलोड हो गया!`);
      setTimeout(() => setExportFeedback(null), 4500);
    } catch (err) {
      console.error('Export Excel failed:', err);
    } finally {
      setIsExporting(false);
    }
  };

  // 5. Export Unified Master Catalog (CSV)
  const handleExportMasterCombinedCsv = () => {
    setIsExporting(true);
    try {
      const dateStr = getFormattedDate();
      const headers = [
        'Record Type',
        'Record ID',
        'Title / Name',
        'Category / Group',
        'Price or Rate (INR)',
        'Duration or Experience',
        'Rating',
        'Status / KYC',
        'Contact / Details',
        'Description / Notes',
      ];

      const rows: (string | number | boolean | null | undefined)[][] = [];

      // Add Services
      services.forEach((s) => {
        rows.push([
          'SERVICE',
          s.id,
          s.name,
          s.categoryName,
          s.basePrice,
          `${s.durationMinutes} mins`,
          s.rating,
          s.isActive ? 'Active' : 'Inactive',
          s.priceUnit,
          s.description,
        ]);
      });

      // Add Categories
      categories.forEach((c) => {
        rows.push([
          'CATEGORY',
          c.id,
          c.name,
          c.slug,
          '',
          `Order: ${c.order}`,
          '',
          c.isActive ? 'Active' : 'Inactive',
          c.icon,
          c.description,
        ]);
      });

      // Add Service Men
      loadedServiceMen.forEach((m) => {
        rows.push([
          'SERVICEMAN',
          m.id,
          m.name,
          (m.categoryNames || []).join('; '),
          m.hourlyRate,
          `${m.experienceYears} yrs exp`,
          m.rating,
          m.kycStatus || (m.isVerified ? 'verified' : 'pending'),
          `${m.phone} | ${m.serviceArea}`,
          `Total Jobs: ${m.totalJobs}`,
        ]);
      });

      triggerCsvDownload(`hardinkaam_all_master_records_${dateStr}.csv`, headers, rows);
      setExportFeedback(`सफलतापूर्वक ${rows.length} सभी मास्टर रिकॉर्ड्स की संयुक्त CSV फाइल डाउनलोड हो गई!`);
      setTimeout(() => setExportFeedback(null), 4500);
    } catch (err) {
      console.error('Export combined CSV failed:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const openAddService = () => {
    setEditingService(null);
    setName('');
    setCategoryId(categories[0]?.id || 'cat_electrical');
    setBasePrice('299');
    setDurationMinutes('45');
    setDescription('');
    setImageUrl('');
    setServiceImageTab('upload');
    setImageUploadError(null);
    setPriceUnit('service');
    setRatingVal('4.8');
    setRatingCountVal('12');
    setServiceSaveError(null);
    setShowServiceModal(true);
  };

  const openEditService = (srv: Service) => {
    setEditingService(srv);
    setName(srv.name || '');
    setCategoryId(srv.categoryId || categories[0]?.id || '');
    setBasePrice(srv.basePrice != null ? srv.basePrice.toString() : '299');
    setDurationMinutes(srv.durationMinutes != null ? srv.durationMinutes.toString() : '45');
    setDescription(srv.description || '');
    setImageUrl(srv.imageUrl || '');
    setServiceImageTab(srv.imageUrl?.startsWith('data:') ? 'upload' : srv.imageUrl ? 'preset' : 'upload');
    setImageUploadError(null);
    setPriceUnit(srv.priceUnit || 'service');
    
    // Safely parse rating and ratingCount with fallbacks
    const r = typeof srv.rating === 'number' && !isNaN(srv.rating) ? srv.rating : 4.8;
    const rc =
      typeof srv.ratingCount === 'number' && !isNaN(srv.ratingCount)
        ? srv.ratingCount
        : typeof (srv as any).reviewCount === 'number' && !isNaN((srv as any).reviewCount)
        ? (srv as any).reviewCount
        : 12;
    setRatingVal(r.toString());
    setRatingCountVal(rc.toString());
    setServiceSaveError(null);
    setShowServiceModal(true);
  };

  const handleSaveService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSaving(true);
    setServiceSaveError(null);
    const serviceId = editingService ? editingService.id : 'srv_' + Math.random().toString(36).substring(2, 8);
    const cat = categories.find((c) => c.id === categoryId);

    // Compute safe numeric rating and review count
    const parsedRating = parseFloat(ratingVal);
    const finalRating = !isNaN(parsedRating)
      ? parsedRating
      : typeof editingService?.rating === 'number' && !isNaN(editingService.rating)
      ? editingService.rating
      : 4.8;

    const parsedRatingCount = parseInt(ratingCountVal, 10);
    const finalRatingCount = !isNaN(parsedRatingCount)
      ? parsedRatingCount
      : typeof editingService?.ratingCount === 'number' && !isNaN(editingService.ratingCount)
      ? editingService.ratingCount
      : typeof (editingService as any)?.reviewCount === 'number' && !isNaN((editingService as any).reviewCount)
      ? (editingService as any).reviewCount
      : 12;

    const srvData: Record<string, any> = {
      id: serviceId,
      categoryId: categoryId || cat?.id || 'cat_electrical',
      categoryName: cat?.name || 'Home Services',
      name: name.trim(),
      description: description.trim() || `${name.trim()} professional service in Bhopal`,
      basePrice: parseFloat(basePrice) || 299,
      durationMinutes: parseInt(durationMinutes, 10) || 45,
      rating: finalRating,
      ratingCount: finalRatingCount,
      imageUrl:
        imageUrl.trim() ||
        'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=500&auto=format&fit=crop&q=80',
      isActive: editingService?.isActive !== undefined ? Boolean(editingService.isActive) : true,
      priceUnit: priceUnit?.trim() || 'service',
    };

    // Strict sanitization: ensure no field in the payload has an undefined value
    const cleanPayload = Object.fromEntries(
      Object.entries(srvData).filter(([_, val]) => val !== undefined)
    );

    try {
      await setDoc(doc(db, 'services', serviceId), cleanPayload, { merge: true });
      setShowServiceModal(false);
      onRefresh();
    } catch (err: any) {
      console.warn('Direct Firestore save service failed, attempting server endpoint fallback:', err);
      try {
        const token = await ensureAdminAuthToken();
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        };
        const res = await fetch('/api/admin/services', {
          method: 'POST',
          headers,
          body: JSON.stringify({ serviceId, data: cleanPayload }),
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || err?.message || 'Failed to save service');
        }
        setShowServiceModal(false);
        onRefresh();
      } catch (serverErr: any) {
        console.error('Save service failed:', serverErr);
        setServiceSaveError(serverErr?.message || 'Failed to save service to database.');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteService = async (srvId: string) => {
    if (!confirm('Are you sure you want to delete this service?')) return;
    try {
      await deleteDoc(doc(db, 'services', srvId));
      onRefresh();
    } catch (err: any) {
      console.warn('Direct Firestore delete service failed, attempting server endpoint fallback:', err);
      try {
        const token = await ensureAdminAuthToken();
        const headers: Record<string, string> = {
          'Authorization': `Bearer ${token}`,
        };
        const res = await fetch(`/api/admin/services/${encodeURIComponent(srvId)}`, {
          method: 'DELETE',
          headers,
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || err?.message || 'Failed to delete service');
        }
        onRefresh();
      } catch (serverErr) {
        console.error('Delete service failed:', serverErr);
      }
    }
  };

  const openAddCategory = () => {
    setEditingCategory(null);
    setCatName('');
    setCatIcon('Wrench');
    setCatDesc('');
    setCatImageUrl('');
    setCatSaveError(null);
    setShowCategoryModal(true);
  };

  const openEditCategory = (cat: Category) => {
    setEditingCategory(cat);
    setCatName(cat.name || '');
    setCatIcon(cat.icon || 'Wrench');
    setCatDesc(cat.description || '');
    setCatImageUrl(cat.imageUrl || '');
    setCatSaveError(null);
    setShowCategoryModal(true);
  };

  const handleDeleteCategory = async (catId: string, catNameStr: string) => {
    if (!confirm(`क्या आप श्रेणी "${catNameStr}" को वाकई हटाना चाहते हैं?`)) return;
    try {
      await deleteDoc(doc(db, 'categories', catId));
      onRefresh();
    } catch (err: any) {
      console.warn('Direct Firestore delete category failed, attempting server endpoint fallback:', err);
      try {
        const token = await ensureAdminAuthToken();
        const headers: Record<string, string> = {
          'Authorization': `Bearer ${token}`,
        };
        const res = await fetch(`/api/admin/categories/${encodeURIComponent(catId)}`, {
          method: 'DELETE',
          headers,
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || err?.message || 'Failed to delete category');
        }
        onRefresh();
      } catch (serverErr) {
        console.error('Delete category failed:', serverErr);
      }
    }
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim()) return;

    setSavingCat(true);
    setCatSaveError(null);
    const catId = editingCategory ? editingCategory.id : 'cat_' + slugify(catName);
    
    const catData: Record<string, any> = {
      id: catId,
      slug: slugify(catName).replace(/_/g, '-'),
      name: catName.trim(),
      icon: catIcon,
      description: catDesc.trim(),
      imageUrl: catImageUrl.trim() || undefined,
      order: editingCategory?.order || categories.length + 1,
      isActive: editingCategory?.isActive !== undefined ? editingCategory.isActive : true,
    };

    const cleanPayload = Object.fromEntries(
      Object.entries(catData).filter(([_, val]) => val !== undefined)
    );

    try {
      await setDoc(doc(db, 'categories', catId), cleanPayload, { merge: true });
      setShowCategoryModal(false);
      setCatName('');
      setCatDesc('');
      setCatImageUrl('');
      setEditingCategory(null);
      onRefresh();
    } catch (err: any) {
      console.warn('Direct Firestore save category failed, attempting server endpoint fallback:', err);
      try {
        const token = await ensureAdminAuthToken();
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        };
        const res = await fetch('/api/admin/categories', {
          method: 'POST',
          headers,
          body: JSON.stringify({ categoryId: catId, data: cleanPayload }),
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || err?.message || 'Failed to save category');
        }
        setShowCategoryModal(false);
        setCatName('');
        setCatDesc('');
        setCatImageUrl('');
        setEditingCategory(null);
        onRefresh();
      } catch (serverErr: any) {
        console.error('Save category failed:', serverErr);
        setCatSaveError(serverErr?.message || 'Failed to save category to database.');
      }
    } finally {
      setSavingCat(false);
    }
  };

  const filtered = services.filter((s) => {
    const matchesCat = selectedCatFilter === 'all' || s.categoryId === selectedCatFilter;
    const matchesSearch =
      !search ||
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.categoryName.toLowerCase().includes(search.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <div className="space-y-6 pb-20">
      {/* Export Confirmation Feedback Alert */}
      {exportFeedback && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center justify-between gap-3 shadow-sm animate-in fade-in">
          <div className="flex items-center gap-2 font-bold">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{exportFeedback}</span>
          </div>
          <button
            type="button"
            onClick={() => setExportFeedback(null)}
            className="text-emerald-700 hover:text-emerald-950 font-black cursor-pointer text-sm"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight">
            Service Catalog &amp; Rate Card
          </h1>
          <p className="text-xs text-stone-500 mt-0.5">
            Configure pricing, service durations, descriptions, and download catalog files
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* 1. DATABASE MERGE BUTTON */}
          <button
            type="button"
            id="catalog-bulk-merge-btn"
            onClick={() => setShowBulkUploadModal(true)}
            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black transition-all shadow-md shadow-emerald-900/10 cursor-pointer flex items-center gap-2 border border-emerald-500"
            title="Merge Excel (.xlsx/.xls) or CSV into Master Database"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-200" />
            <span>🔄 डेटाबेस मर्ज (Excel / CSV)</span>
          </button>

          {/* 2. MASTER DUPLICATE REMOVER BUTTON */}
          {onSelectTab && (
            <button
              type="button"
              id="catalog-clean-duplicates-btn"
              onClick={() => onSelectTab('admin_import')}
              className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black transition-all shadow-sm cursor-pointer flex items-center gap-2 border border-rose-500"
              title="Remove duplicate services and categories from Master Database"
            >
              <Trash2 className="w-4 h-4 text-rose-200" />
              <span>🧹 डुप्लीकेट हटाएं</span>
            </button>
          )}

          {/* 3. EXPORT CATALOG BUTTON */}
          <button
            type="button"
            id="catalog-export-btn"
            onClick={() => setShowExportModal(true)}
            className="px-4 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-black transition-all shadow-sm cursor-pointer flex items-center gap-2 border border-stone-800"
            title="Export Services, Categories, and Pros as CSV or Excel"
          >
            <Download className="w-4 h-4 text-amber-400" />
            <span>📥 Export</span>
          </button>

          <button
            type="button"
            id="catalog-add-category-main-btn"
            onClick={openAddCategory}
            className="px-4 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-sm shadow-orange-600/20"
            title="Add a new service category with Firebase Storage photo upload"
          >
            <Plus className="w-4 h-4" /> 
            <span>+ नई कैटेगरी जोड़ें</span>
          </button>

          <button
            type="button"
            id="catalog-add-service-main-btn"
            onClick={openAddService}
            className="px-4 py-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border border-stone-300"
            title="Add a single service manually"
          >
            <Plus className="w-4 h-4" /> 
            <span>+ सर्विस जोड़ें</span>
          </button>
        </div>
      </div>

      {/* Database Merge & Duplicate Cleaner Quick Banner */}
      <div className="bg-stone-900 text-white rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-md border border-stone-800">
        <div className="flex items-center gap-3">
          <span className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center font-black shrink-0 text-base border border-emerald-500/30">
            🔄
          </span>
          <div>
            <span className="font-black block text-white text-xs">
              डेटाबेस प्रबंधन: डेटाबेस मर्ज व मास्टर डुप्लीकेट क्लिनर
            </span>
            <span className="text-stone-400 text-[11px]">
              Excel (.xlsx) या CSV फाइल सीधे <strong>डेटाबेस में मर्ज</strong> करें, या मास्टर डेटाबेस से <strong>डुप्लीकेट रिकॉर्ड्स 1-क्लिक में हटाएं</strong>।
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setShowBulkUploadModal(true)}
            className="px-3.5 py-1.5 rounded-xl bg-emerald-600 text-white font-black text-xs hover:bg-emerald-500 cursor-pointer flex items-center gap-1.5 shadow-xs"
          >
            <Upload className="w-3.5 h-3.5 text-emerald-200" />
            <span>डेटाबेस मर्ज</span>
          </button>
          {onSelectTab && (
            <button
              type="button"
              onClick={() => onSelectTab('admin_import')}
              className="px-3 py-1.5 rounded-xl bg-rose-600 text-white font-bold text-xs hover:bg-rose-500 cursor-pointer flex items-center gap-1"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>डुप्लीकेट क्लिनर</span>
            </button>
          )}
        </div>
      </div>

      {/* Category Showcase & Firebase Storage Photo Manager Section */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-stone-200 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center font-bold">
              <FolderOpen className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-black text-stone-900">
                सर्विस श्रेणियां व फोटो प्रबंधन ({categories.length} Categories)
              </h2>
              <p className="text-[11px] text-stone-500">
                Firebase Storage से प्रत्येक कैटेगरी में हाई-क्वालिटी फोटो अपलोड और अपडेट करें
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={openAddCategory}
            className="px-3 py-1.5 rounded-xl bg-orange-50 hover:bg-orange-100 text-orange-700 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 border border-orange-200"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ नई श्रेणी</span>
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5 pt-1">
          {categories.map((cat) => {
            const count = services.filter((s) => s.categoryId === cat.id).length;
            return (
              <div
                key={cat.id}
                className="relative group bg-stone-50/80 hover:bg-white rounded-2xl p-2.5 border border-stone-200 hover:border-orange-300 hover:shadow-md transition-all flex flex-col items-center text-center"
              >
                <div className="relative w-14 h-14 rounded-xl overflow-hidden mb-2 bg-white border border-stone-200 shadow-xs flex items-center justify-center shrink-0">
                  {cat.imageUrl ? (
                    <img
                      src={cat.imageUrl}
                      alt={cat.name}
                      loading="lazy"
                      decoding="async"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-orange-50/50 text-orange-600">
                      <Wrench className="w-6 h-6" />
                    </div>
                  )}
                  {cat.imageUrl && (
                    <span className="absolute bottom-0 right-0 bg-emerald-600 text-white p-0.5 rounded-tl-md">
                      <Check className="w-2.5 h-2.5" />
                    </span>
                  )}
                </div>

                <div className="w-full">
                  <h4 className="font-extrabold text-xs text-stone-900 truncate leading-tight">
                    {cat.name}
                  </h4>
                  <span className="text-[10px] font-semibold text-stone-400 block mt-0.5">
                    {count} सेवाएं
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => openEditCategory(cat)}
                  className="mt-2 w-full py-1 px-2 rounded-lg bg-white group-hover:bg-orange-600 text-stone-700 group-hover:text-white border border-stone-200 group-hover:border-orange-600 text-[10px] font-black transition-all flex items-center justify-center gap-1 cursor-pointer shadow-2xs"
                  title="Edit category and upload Firebase Storage image"
                >
                  <Camera className="w-3 h-3" />
                  <span>फोटो बदलें</span>
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search service name or trade..."
            className="w-full pl-10 pr-4 py-2 text-xs rounded-xl bg-white border border-stone-200 focus:outline-hidden focus:ring-2 focus:ring-orange-500"
          />
        </div>

        <select
          value={selectedCatFilter}
          onChange={(e) => setSelectedCatFilter(e.target.value)}
          className="p-2 text-xs rounded-xl bg-white border border-stone-200 font-medium"
        >
          <option value="all">All Categories ({services.length})</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={() => setShowExportModal(true)}
          className="px-3.5 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold transition-all border border-stone-200 cursor-pointer flex items-center gap-1.5"
          title="Quick Export Current View"
        >
          <FileDown className="w-4 h-4 text-stone-600" />
          <span>Export ({filtered.length})</span>
        </button>
      </div>

      {/* Services Table */}
      <div className="bg-white rounded-3xl border border-stone-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-50 border-b border-stone-200 text-stone-500 font-bold uppercase text-[10px]">
              <tr>
                <th className="py-3.5 px-4">Service</th>
                <th className="py-3.5 px-4">Category</th>
                <th className="py-3.5 px-4">Base Rate</th>
                <th className="py-3.5 px-4">Duration</th>
                <th className="py-3.5 px-4">Rating</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filtered.map((srv) => (
                <tr key={srv.id} className="hover:bg-stone-50/50">
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-3">
                      <img
                        src={srv.imageUrl || 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=100&auto=format&fit=crop&q=80'}
                        alt={srv.name}
                        loading="lazy"
                        decoding="async"
                        referrerPolicy="no-referrer"
                        className="w-10 h-10 rounded-xl object-cover"
                      />
                      <div>
                        <div className="font-bold text-stone-900">{srv.name}</div>
                        <div className="text-[11px] text-stone-400 line-clamp-1 max-w-xs">
                          {srv.description}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 font-semibold text-stone-700">{srv.categoryName}</td>
                  <td className="py-3.5 px-4 font-black text-stone-900">
                    ₹{srv.basePrice} <span className="text-[10px] text-stone-400 font-normal">/{srv.priceUnit}</span>
                  </td>
                  <td className="py-3.5 px-4 text-stone-600">{srv.durationMinutes} mins</td>
                  <td className="py-3.5 px-4">
                    <span className="flex items-center gap-1 font-bold text-amber-600">
                      <Star className="w-3.5 h-3.5 fill-amber-400" /> {srv.rating} ({srv.ratingCount})
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => openEditService(srv)}
                        className="p-1.5 rounded-lg text-stone-600 hover:bg-stone-100 cursor-pointer"
                        title="Edit Service"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteService(srv.id)}
                        className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 cursor-pointer"
                        title="Delete Service"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ===================== EXPORT CATALOG MODAL ===================== */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-xl w-full p-6 sm:p-8 border border-stone-200 max-h-[92vh] overflow-y-auto space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-stone-900 text-amber-400 flex items-center justify-center shadow-xs">
                  <Download className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-lg text-stone-900">
                    Export Catalog &amp; Master Data
                  </h3>
                  <p className="text-xs text-stone-500">
                    डाउनलोड करें: सेवाएं, श्रेणियां और कारीगरों की सूची (CSV / Excel)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowExportModal(false)}
                className="text-stone-400 hover:text-stone-600 cursor-pointer p-1 rounded-lg hover:bg-stone-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Live Count Summary Pills */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-2xl bg-orange-50 border border-orange-200 text-center">
                <span className="text-[10px] font-bold text-orange-600 uppercase tracking-wider block">सेवाएं (Services)</span>
                <span className="text-xl font-black text-orange-950">{services.length}</span>
              </div>
              <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-center">
                <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block">कैटेगरी (Categories)</span>
                <span className="text-xl font-black text-emerald-950">{categories.length}</span>
              </div>
              <div className="p-3 rounded-2xl bg-blue-50 border border-blue-200 text-center">
                <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider block">कारीगर (Pros)</span>
                <span className="text-xl font-black text-blue-950">{loadedServiceMen.length}</span>
              </div>
            </div>

            {/* Export Options Cards */}
            <div className="space-y-3">
              <h4 className="text-xs font-black text-stone-900 uppercase tracking-wider">
                डाउनलोड विकल्प चुनें (Choose Export Format):
              </h4>

              {/* Option 1: Services CSV */}
              <div className="p-4 rounded-2xl border border-stone-200 bg-stone-50 hover:bg-orange-50/50 hover:border-orange-200 transition-all flex items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-md bg-orange-100 text-orange-800 text-[10px] font-bold">CSV</span>
                    <span className="font-bold text-xs text-stone-900">Services Catalog (सेवा सूची)</span>
                  </div>
                  <p className="text-[11px] text-stone-500">
                    सर्विस ID, नाम, कैटेगरी, बेस रेट (₹), अवधि, रेटिंग और डिस्क्रिप्शन।
                  </p>
                </div>
                <button
                  type="button"
                  id="export-services-csv-btn"
                  disabled={isExporting}
                  onClick={handleExportServicesCsv}
                  className="px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-black transition-all shadow-xs cursor-pointer flex items-center gap-1.5 shrink-0"
                >
                  <FileDown className="w-4 h-4" />
                  <span>Download CSV</span>
                </button>
              </div>

              {/* Option 2: Categories CSV */}
              <div className="p-4 rounded-2xl border border-stone-200 bg-stone-50 hover:bg-emerald-50/50 hover:border-emerald-200 transition-all flex items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-bold">CSV</span>
                    <span className="font-bold text-xs text-stone-900">Categories List (कैटेगरी सूची)</span>
                  </div>
                  <p className="text-[11px] text-stone-500">
                    कैटेगरी ID, नाम, स्लग, आइकन, क्रम और स्टेटस।
                  </p>
                </div>
                <button
                  type="button"
                  id="export-categories-csv-btn"
                  disabled={isExporting}
                  onClick={handleExportCategoriesCsv}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black transition-all shadow-xs cursor-pointer flex items-center gap-1.5 shrink-0"
                >
                  <FileDown className="w-4 h-4" />
                  <span>Download CSV</span>
                </button>
              </div>

              {/* Option 3: Service Men / Pros CSV */}
              <div className="p-4 rounded-2xl border border-stone-200 bg-stone-50 hover:bg-blue-50/50 hover:border-blue-200 transition-all flex items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 text-[10px] font-bold">CSV</span>
                    <span className="font-bold text-xs text-stone-900">Service Men &amp; Pros (कारीगर व संपर्क)</span>
                  </div>
                  <p className="text-[11px] text-stone-500">
                    कारीगर का नाम, फोन, ईमेल, ट्रेड्स, भोपाल क्षेत्र, अनुभव, रेटिंग व KYC स्थिति।
                  </p>
                </div>
                <button
                  type="button"
                  id="export-servicemen-csv-btn"
                  disabled={isExporting}
                  onClick={handleExportServiceMenCsv}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black transition-all shadow-xs cursor-pointer flex items-center gap-1.5 shrink-0"
                >
                  <FileDown className="w-4 h-4" />
                  <span>Download CSV</span>
                </button>
              </div>

              {/* Option 4: Complete Master Excel (.xlsx) with 3 Worksheets */}
              <div className="p-4 rounded-2xl border-2 border-emerald-500/40 bg-emerald-50/40 hover:bg-emerald-50 transition-all flex items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-md bg-emerald-600 text-white text-[10px] font-black">XLSX</span>
                    <span className="font-black text-xs text-stone-900">Master Catalog Workbook (.xlsx)</span>
                    <span className="text-[10px] font-bold bg-amber-200 text-amber-900 px-1.5 py-0.5 rounded">All-In-One</span>
                  </div>
                  <p className="text-[11px] text-stone-600">
                    1 ही एक्सेल फाइल में 3 अलग शीट्स (Services, Categories, ServiceMen) शामिल हैं।
                  </p>
                </div>
                <button
                  type="button"
                  id="export-master-excel-btn"
                  disabled={isExporting}
                  onClick={handleExportAllExcel}
                  className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black transition-all shadow-md cursor-pointer flex items-center gap-1.5 shrink-0"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Download Excel</span>
                </button>
              </div>

              {/* Option 5: Unified Combined CSV */}
              <div className="p-3.5 rounded-2xl border border-stone-200 bg-stone-50 hover:bg-stone-100/80 transition-all flex items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <span className="font-bold text-xs text-stone-800">Unified Master CSV (संयुक्त CSV)</span>
                  <p className="text-[11px] text-stone-500">
                    सभी सेवाएं, श्रेणियां और कारीगर एक ही संयुक्त CSV फाइल में।
                  </p>
                </div>
                <button
                  type="button"
                  id="export-unified-csv-btn"
                  disabled={isExporting}
                  onClick={handleExportMasterCombinedCsv}
                  className="px-3.5 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-900 text-stone-200 text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shrink-0"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Combined CSV</span>
                </button>
              </div>
            </div>

            <div className="pt-3 border-t border-stone-100 flex items-center justify-between text-xs text-stone-500">
              <span>* सभी CSV फाइल्स UTF-8 BOM के साथ एन्कोडेड हैं ताकि हिंदी टेक्स्ट सही दिखे।</span>
              <button
                type="button"
                onClick={() => setShowExportModal(false)}
                className="px-4 py-2 rounded-xl border border-stone-200 text-stone-700 font-bold hover:bg-stone-50 cursor-pointer"
              >
                बंद करें (Close)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Service Modal */}
      {showServiceModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 border border-stone-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100 mb-4">
              <h3 className="font-bold text-base text-stone-900">
                {editingService ? 'Edit Service' : 'Add New Service'}
              </h3>
              <button onClick={() => setShowServiceModal(false)} className="text-stone-400 hover:text-stone-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveService} className="space-y-3">
              {serviceSaveError && (
                <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold">
                  {serviceSaveError}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">Service Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Split AC Deep Jet Service"
                  className="w-full p-2.5 text-xs rounded-xl border border-stone-200 focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">Category</label>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full p-2.5 text-xs rounded-xl border border-stone-200"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">Base Price (₹) *</label>
                  <input
                    type="number"
                    required
                    value={basePrice}
                    onChange={(e) => setBasePrice(e.target.value)}
                    className="w-full p-2.5 text-xs rounded-xl border border-stone-200 font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">Duration (Minutes)</label>
                  <input
                    type="number"
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(e.target.value)}
                    className="w-full p-2.5 text-xs rounded-xl border border-stone-200"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">Price Unit</label>
                  <input
                    type="text"
                    value={priceUnit}
                    onChange={(e) => setPriceUnit(e.target.value)}
                    placeholder="service / appliance / hour"
                    className="w-full p-2.5 text-xs rounded-xl border border-stone-200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">Rating (⭐ 1.0 - 5.0)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="1"
                    max="5"
                    value={ratingVal}
                    onChange={(e) => setRatingVal(e.target.value)}
                    placeholder="4.8"
                    className="w-full p-2.5 text-xs rounded-xl border border-stone-200"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">Reviews / Ratings Count</label>
                  <input
                    type="number"
                    min="0"
                    value={ratingCountVal}
                    onChange={(e) => setRatingCountVal(e.target.value)}
                    placeholder="12"
                    className="w-full p-2.5 text-xs rounded-xl border border-stone-200"
                  />
                </div>
              </div>

              {/* Picture Upload / Image Selection for Service */}
              <div className="space-y-2 border border-stone-200 rounded-2xl p-3 bg-stone-50/70">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <label className="text-xs font-bold text-stone-800 flex items-center gap-1.5">
                    <ImageIcon className="w-4 h-4 text-orange-600" />
                    <span>सर्विस फोटो (Service Picture)</span>
                  </label>
                  
                  {/* Tab switches: Upload / Presets / URL */}
                  <div className="flex items-center bg-stone-200/80 p-0.5 rounded-lg text-[11px] font-bold">
                    <button
                      type="button"
                      onClick={() => setServiceImageTab('upload')}
                      className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                        serviceImageTab === 'upload'
                          ? 'bg-white text-stone-900 shadow-xs'
                          : 'text-stone-600 hover:text-stone-900'
                      }`}
                    >
                      <span className="flex items-center gap-1">
                        <UploadCloud className="w-3 h-3 text-orange-600" />
                        फोटो अपलोड
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setServiceImageTab('preset')}
                      className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                        serviceImageTab === 'preset'
                          ? 'bg-white text-stone-900 shadow-xs'
                          : 'text-stone-600 hover:text-stone-900'
                      }`}
                    >
                      <span className="flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-amber-500" />
                        लाइब्रेरी
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setServiceImageTab('url')}
                      className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                        serviceImageTab === 'url'
                          ? 'bg-white text-stone-900 shadow-xs'
                          : 'text-stone-600 hover:text-stone-900'
                      }`}
                    >
                      <span className="flex items-center gap-1">
                        <Link2 className="w-3 h-3 text-blue-500" />
                        URL
                      </span>
                    </button>
                  </div>
                </div>

                {/* Preview of current image if any */}
                {imageUrl ? (
                  <div className="relative group rounded-xl overflow-hidden border border-stone-200 bg-white h-36 flex items-center justify-center shadow-xs">
                    <img
                      src={imageUrl}
                      alt="Service Preview"
                      loading="lazy"
                      decoding="async"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-stone-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-3 py-1.5 bg-white hover:bg-stone-100 text-stone-800 text-xs font-bold rounded-lg shadow-sm flex items-center gap-1 cursor-pointer"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        फोटो बदलें (Change)
                      </button>
                      <button
                        type="button"
                        onClick={() => setImageUrl('')}
                        className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg shadow-sm flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        हटाएं (Remove)
                      </button>
                    </div>
                    <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md bg-stone-900/80 backdrop-blur-xs text-[10px] font-bold text-white flex items-center gap-1">
                      <Check className="w-3 h-3 text-emerald-400" /> फोटो लोड हो चुकी है
                    </span>
                  </div>
                ) : null}

                {/* TAB 1: UPLOAD FROM DEVICE / CAMERA */}
                {serviceImageTab === 'upload' && (
                  <div className="space-y-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      id="service-image-file-input"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          handleImageFileChange(e.target.files[0]);
                        }
                      }}
                      className="hidden"
                    />

                    <div
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                          handleImageFileChange(e.dataTransfer.files[0]);
                        }
                      }}
                      onClick={() => fileInputRef.current?.click()}
                      className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all ${
                        imageUploading
                          ? 'border-orange-400 bg-orange-50/50'
                          : 'border-stone-300 hover:border-orange-500 hover:bg-white'
                      }`}
                    >
                      {imageUploading ? (
                        <div className="flex flex-col items-center justify-center py-2">
                          <RefreshCw className="w-6 h-6 text-orange-600 animate-spin mb-1" />
                          <span className="text-xs font-bold text-orange-700">फोटो कंप्रेस और लोड हो रही है...</span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center py-1">
                          <div className="w-10 h-10 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center mb-1.5">
                            <UploadCloud className="w-5 h-5" />
                          </div>
                          <p className="text-xs font-bold text-stone-800">
                            डिवाइस या मोबाइल से फोटो अपलोड करें (Click or Drag Photo)
                          </p>
                          <p className="text-[11px] text-stone-500 mt-0.5">
                            कैमरा फोटो, गैलरी, JPG, PNG, WebP (ऑटो कंप्रेस्ड &amp; ऑप्टिमाइज्ड)
                          </p>
                        </div>
                      )}
                    </div>

                    {serviceCompressionInfo && (
                      <div className="flex items-center justify-between text-[10px] bg-emerald-50 border border-emerald-200/80 px-2.5 py-1.5 rounded-xl text-emerald-900 font-medium">
                        <span className="flex items-center gap-1">
                          <Sparkles className="w-3 h-3 text-emerald-600" />
                          <span>ऑटो-कंप्रेस्ड: {serviceCompressionInfo.original} ➔ <strong>{serviceCompressionInfo.compressed}</strong></span>
                        </span>
                        <span className="font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded-md">
                          {serviceCompressionInfo.ratio}% हल्का
                        </span>
                      </div>
                    )}

                    {imageUploadError && (
                      <p className="text-[11px] font-bold text-red-600 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" />
                        {imageUploadError}
                      </p>
                    )}
                  </div>
                )}

                {/* TAB 2: PRESETS GALLERY */}
                {serviceImageTab === 'preset' && (
                  <div className="space-y-1.5">
                    <p className="text-[11px] text-stone-500">लोकप्रिय होम सर्विस फोटो में से 1-क्लिक से चुनें:</p>
                    <div className="grid grid-cols-3 gap-2 max-h-44 overflow-y-auto p-1.5 border border-stone-200 rounded-xl bg-white">
                      {SERVICE_PRESET_IMAGES.map((preset, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setImageUrl(preset.url)}
                          className={`relative rounded-lg overflow-hidden border text-left transition-all p-0.5 cursor-pointer ${
                            imageUrl === preset.url
                              ? 'border-orange-600 ring-2 ring-orange-500 bg-orange-50/30'
                              : 'border-stone-200 hover:border-stone-400'
                          }`}
                        >
                          <img
                            src={preset.url}
                            alt={preset.label}
                            loading="lazy"
                            decoding="async"
                            referrerPolicy="no-referrer"
                            className="w-full h-14 object-cover rounded"
                          />
                          <div className="p-1">
                            <p className="text-[10px] font-bold text-stone-800 truncate">{preset.label}</p>
                            <span className="text-[9px] text-stone-400 block">{preset.cat}</span>
                          </div>
                          {imageUrl === preset.url && (
                            <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-orange-600 text-white flex items-center justify-center shadow-xs">
                              <Check className="w-2.5 h-2.5" />
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* TAB 3: DIRECT IMAGE URL */}
                {serviceImageTab === 'url' && (
                  <div className="space-y-1">
                    <input
                      type="text"
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                      placeholder="https://images.unsplash.com/... या वेब लिंक"
                      className="w-full p-2.5 text-xs rounded-xl border border-stone-200 bg-white focus:ring-2 focus:ring-orange-500"
                    />
                    <p className="text-[10px] text-stone-400">बाहरी इमेज URL या अनस्प्लैश लिंक पेस्ट करें</p>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">Description</label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Detailed scope of service, warranty inclusions..."
                  className="w-full p-2.5 text-xs rounded-xl border border-stone-200"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowServiceModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-stone-600 hover:bg-stone-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  id="admin-save-service-btn"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold transition-colors cursor-pointer shadow-xs disabled:opacity-60"
                >
                  {saving ? 'Saving...' : 'Save Service'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Category Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 border border-stone-200 my-8 space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center shadow-xs">
                  <FolderOpen className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-stone-900">
                    {editingCategory ? 'श्रेणी व फ़ोटो संपादित करें (Edit Category)' : 'नई सर्विस श्रेणी जोड़ें (Add Category)'}
                  </h3>
                  <p className="text-xs text-stone-500">
                    {editingCategory ? `ID: ${editingCategory.id}` : 'Firebase Storage फ़ोटो अपलोड के साथ'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCategoryModal(false)}
                className="text-stone-400 hover:text-stone-600 p-1 rounded-lg hover:bg-stone-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCategory} className="space-y-4">
              {catSaveError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{catSaveError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Category Name (श्रेणी का नाम) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={catName}
                  onChange={(e) => setCatName(e.target.value)}
                  placeholder="उदा. RO Water Purifier, Deep Cleaning, Electrical..."
                  className="w-full p-2.5 text-xs rounded-xl border border-stone-200 focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">Default Icon Type (डिफ़ॉल्ट आइकन)</label>
                <select
                  value={catIcon}
                  onChange={(e) => setCatIcon(e.target.value)}
                  className="w-full p-2.5 text-xs rounded-xl border border-stone-200 focus:ring-2 focus:ring-orange-500"
                >
                  <option value="Wrench">Wrench (Plumbing / General Services)</option>
                  <option value="Zap">Zap (Electrical &amp; Wiring)</option>
                  <option value="AirVent">AirVent (AC &amp; Appliance Repair)</option>
                  <option value="Sparkles">Sparkles (Deep Home Cleaning)</option>
                  <option value="Hammer">Hammer (Carpentry &amp; Woodwork)</option>
                  <option value="Paintbrush">Paintbrush (Wall Painting &amp; Putty)</option>
                  <option value="ShieldAlert">ShieldAlert (Pest Control Treatment)</option>
                  <option value="LayoutGrid">LayoutGrid (General Construction)</option>
                </select>
              </div>

              {/* Integrated Firebase Storage Category Image Uploader Component */}
              <div className="p-3.5 bg-stone-50/80 rounded-2xl border border-stone-200/80">
                <CategoryFirebaseImageUpload
                  categoryId={editingCategory?.id || (catName ? 'cat_' + slugify(catName) : 'cat_new')}
                  categoryName={catName}
                  currentImageUrl={catImageUrl}
                  onImageUrlChange={(url) => setCatImageUrl(url)}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">Description (संक्षिप्त विवरण)</label>
                <input
                  type="text"
                  value={catDesc}
                  onChange={(e) => setCatDesc(e.target.value)}
                  placeholder="Short tagline, e.g. Expert technician in Bhopal at your doorstep"
                  className="w-full p-2.5 text-xs rounded-xl border border-stone-200 focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-stone-100">
                {editingCategory ? (
                  <button
                    type="button"
                    onClick={() => handleDeleteCategory(editingCategory.id, editingCategory.name)}
                    className="px-3 py-2 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>हटाएं</span>
                  </button>
                ) : <div />}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowCategoryModal(false)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-stone-600 hover:bg-stone-100 cursor-pointer"
                  >
                    रद्द करें
                  </button>
                  <button
                    type="submit"
                    id="admin-save-category-btn"
                    disabled={savingCat}
                    className="px-5 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold transition-colors cursor-pointer shadow-xs disabled:opacity-60 flex items-center gap-1.5"
                  >
                    {savingCat ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>सुरक्षित हो रहा है...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>{editingCategory ? 'श्रेणी अपडेट करें' : 'नई श्रेणी सेव करें'}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================== BULK SERVICE UPLOAD (EXCEL / CSV) MODAL ===================== */}
      {showBulkUploadModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full p-5 sm:p-8 border border-stone-200 max-h-[94vh] overflow-y-auto space-y-6">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-stone-100">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/20">
                  <FileSpreadsheet className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-black text-lg text-stone-900 flex items-center gap-2">
                    <span>बल्क सर्विस अपलोड (Excel / CSV Service Importer)</span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase">
                      Bulk Engine
                    </span>
                  </h3>
                  <p className="text-xs text-stone-500">
                    बिना एक-एक करके फॉर्म भरे, पूरी Excel (.xlsx/.xls) या CSV शीट से दर्जनों सेवाएं एक साथ जोड़ें
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowBulkUploadModal(false);
                  setBulkSuccessMsg(null);
                  setBulkErrorMsg(null);
                }}
                className="text-stone-400 hover:text-stone-600 cursor-pointer p-1.5 rounded-xl hover:bg-stone-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Template Download & Sample Tools Banner */}
            <div className="p-4 rounded-2xl bg-stone-900 text-white flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <h4 className="font-black text-xs text-amber-300">
                    रेडी-टू-यूज़ टेम्पलेट डाउनलोड करें (Download Ready Templates)
                  </h4>
                </div>
                <p className="text-[11px] text-stone-300">
                  इन कॉलम के साथ फाइल तैयार करें: <code className="text-emerald-300 bg-stone-800 px-1 py-0.5 rounded">name, categoryName, basePrice, priceUnit, durationMinutes, description, imageUrl</code>
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  id="bulk-modal-download-excel-template-btn"
                  onClick={handleDownloadServicesExcelTemplate}
                  className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-black text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                  title="Download .xlsx format template"
                >
                  <Download className="w-3.5 h-3.5 text-stone-950" />
                  <span>📥 Excel टेम्पलेट (.xlsx)</span>
                </button>

                <button
                  type="button"
                  id="bulk-modal-download-csv-template-btn"
                  onClick={handleDownloadServicesCsvTemplate}
                  className="px-3.5 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 hover:text-white font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer border border-stone-700"
                  title="Download .csv format template"
                >
                  <Download className="w-3.5 h-3.5 text-stone-400" />
                  <span>📄 CSV टेम्पलेट (.csv)</span>
                </button>

                <button
                  type="button"
                  onClick={handleLoadSampleServices}
                  className="px-3 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-black text-xs transition-all flex items-center gap-1.5 cursor-pointer"
                  title="Load 8 sample Bhopal home services instantly"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>सैंपल डेटा लोड करें</span>
                </button>
              </div>
            </div>

            {/* Drag & Drop File Upload Area */}
            <div className="space-y-2">
              <label className="block text-xs font-black text-stone-700">
                1. Excel (.xlsx, .xls) या CSV फ़ाइल यहाँ अपलोड करें:
              </label>
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsBulkDragOver(true);
                }}
                onDragLeave={() => setIsBulkDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsBulkDragOver(false);
                  if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                    processBulkFile(e.dataTransfer.files[0]);
                  }
                }}
                onClick={() => bulkFileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
                  isBulkDragOver
                    ? 'border-emerald-500 bg-emerald-50 scale-[0.99]'
                    : 'border-stone-300 hover:border-emerald-500 bg-stone-50/70 hover:bg-emerald-50/30'
                }`}
              >
                <input
                  ref={bulkFileInputRef}
                  type="file"
                  accept=".xlsx, .xls, .csv, .txt, .tsv"
                  className="hidden"
                  onChange={handleBulkFileInputChange}
                />
                <div className="flex flex-col items-center justify-center gap-2">
                  <div className="w-12 h-12 rounded-2xl bg-white border border-stone-200 text-emerald-600 flex items-center justify-center shadow-xs">
                    <Upload className="w-6 h-6" />
                  </div>
                  <div className="text-xs font-bold text-stone-800">
                    {bulkFileName ? (
                      <span className="text-emerald-700 font-black">
                        फ़ाइल चुनी गई: {bulkFileName}
                      </span>
                    ) : (
                      <>
                        <span className="text-emerald-600 font-black underline">यहाँ क्लिक करके Excel/CSV चुनें</span> या फाइल ड्रैग करके छोड़ें
                      </>
                    )}
                  </div>
                  <p className="text-[11px] text-stone-400">
                    सपोर्टेड फॉर्मेट्स: .xlsx, .xls, .csv, .txt (Microsoft Excel, LibreOffice, Google Sheets)
                  </p>
                </div>
              </div>

              {/* Multi-sheet selector if Excel workbook has multiple tabs */}
              {bulkSheetNames.length > 1 && (
                <div className="flex items-center gap-2 text-xs bg-stone-100 p-2.5 rounded-xl">
                  <span className="font-bold text-stone-700">Excel शीट चुनें:</span>
                  <div className="flex gap-1.5 flex-wrap">
                    {bulkSheetNames.map((sheet) => (
                      <button
                        key={sheet}
                        type="button"
                        onClick={() => handleBulkSheetChange(sheet)}
                        className={`px-3 py-1 rounded-lg font-bold text-xs transition-colors ${
                          bulkSelectedSheet === sheet
                            ? 'bg-emerald-600 text-white'
                            : 'bg-white text-stone-700 border border-stone-200 hover:bg-stone-50'
                        }`}
                      >
                        {sheet}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Direct Paste or Edit Area */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black text-stone-700">
                  2. या सीधे CSV / Excel टेबल डेटा यहाँ पेस्ट करें:
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopySampleServices}
                    className="text-[11px] font-bold text-stone-600 hover:text-stone-900 flex items-center gap-1 cursor-pointer"
                  >
                    {copiedTemplate ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-600" />
                        <span className="text-emerald-600">कॉपी हो गया!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>कॉपी फॉर्मेट</span>
                      </>
                    )}
                  </button>
                  {bulkInputText && (
                    <button
                      type="button"
                      onClick={() => {
                        setBulkInputText('');
                        setBulkFileName('');
                        setBulkWorkbook(null);
                        setBulkSuccessMsg(null);
                      }}
                      className="text-[11px] font-bold text-rose-600 hover:text-rose-800 cursor-pointer"
                    >
                      साफ़ करें (Clear)
                    </button>
                  )}
                </div>
              </div>
              <textarea
                rows={4}
                value={bulkInputText}
                onChange={(e) => {
                  setBulkInputText(e.target.value);
                  setBulkWorkbook(null);
                }}
                placeholder="name,categoryName,basePrice,priceUnit,durationMinutes,description,imageUrl&#10;RO Water Purifier Servicing,RO Water Purifier,399,per visit,45,Full water purifier membrane check,https://...&#10;AC Foam Cleaning,AC & Appliances,599,per AC,60,Deep chemical foam cleaning,https://..."
                className="w-full p-3 font-mono text-xs rounded-2xl border border-stone-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-stone-50/50"
              />
            </div>

            {/* Analysis & Deduplication Policies */}
            {parsedBulkData.rows.length > 0 && (
              <div className="space-y-4 pt-2 border-t border-stone-100">
                {/* Stats Summary Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  <div className="p-3 rounded-2xl bg-stone-100 border border-stone-200">
                    <span className="text-[10px] uppercase font-bold text-stone-500 block">कुल पंक्तियाँ (Total Rows)</span>
                    <span className="text-lg font-black text-stone-900">{parsedBulkData.rows.length}</span>
                  </div>
                  <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200">
                    <span className="text-[10px] uppercase font-bold text-emerald-700 block">✨ नए रिकॉर्ड्स (New)</span>
                    <span className="text-lg font-black text-emerald-700">{parsedBulkData.uniqueNewCount}</span>
                  </div>
                  <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200">
                    <span className="text-[10px] uppercase font-bold text-amber-700 block">🔄 अपडेट / मर्ज होंगे (Merge Existing)</span>
                    <span className="text-lg font-black text-amber-700">{parsedBulkData.duplicateDbCount}</span>
                  </div>
                </div>

                {/* Auto-Merge Notice & Duplicate Cleaner Link */}
                <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2 text-emerald-950 font-bold">
                    <GitMerge className="w-4 h-4 text-emerald-700 shrink-0" />
                    <span>
                      डेटाबेस ऑटो-मर्ज: नई सेवाएं जुड़ेंगी और मौजूदा सेवाएं बिना डुप्लीकेट बनाए सुरक्षित अपडेट होंगी।
                    </span>
                  </div>

                  {onSelectTab && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowBulkUploadModal(false);
                        onSelectTab('admin_import');
                      }}
                      className="px-3 py-1 rounded-xl bg-rose-600 text-white font-black text-[11px] hover:bg-rose-500 transition-colors shrink-0 flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>मास्टर से डुप्लीकेट हटाएं</span>
                    </button>
                  )}
                </div>

                {/* Parsed Preview Table */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-stone-800">
                      मर्ज होने वाली सेवाओं का लाइव प्रीव्यू ({bulkRowsToUpload.length} सेवाएं तैयार):
                    </span>
                    <span className="text-stone-400 text-[11px]">
                      दिखाई जा रही हैं: पहली 15 पंक्तियाँ
                    </span>
                  </div>

                  <div className="border border-stone-200 rounded-2xl overflow-hidden max-h-56 overflow-y-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-stone-100 border-b border-stone-200 text-stone-600 font-bold text-[10px] uppercase sticky top-0">
                        <tr>
                          <th className="py-2.5 px-3">Merge Status</th>
                          <th className="py-2.5 px-3">Service Name</th>
                          <th className="py-2.5 px-3">Category</th>
                          <th className="py-2.5 px-3">Base Price</th>
                          <th className="py-2.5 px-3">Duration</th>
                          <th className="py-2.5 px-3">Description</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-100 font-medium">
                        {parsedBulkData.rows.slice(0, 15).map((row) => (
                          <tr
                            key={row._id}
                            className={
                              row._duplicateStatus === 'exists_in_db'
                                ? 'bg-amber-50/40 text-stone-800'
                                : 'hover:bg-stone-50 text-stone-800'
                            }
                          >
                            <td className="py-2 px-3">
                              {row._duplicateStatus === 'new_unique' ? (
                                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                                  ✨ New Item
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">
                                  🔄 Merge / Update
                                </span>
                              )}
                            </td>
                            <td className="py-2 px-3 font-bold">{row.name}</td>
                            <td className="py-2 px-3 text-stone-600">{row.categoryName}</td>
                            <td className="py-2 px-3 font-black text-stone-900">
                              ₹{row.basePrice} <span className="text-[10px] font-normal text-stone-400">/{row.priceUnit}</span>
                            </td>
                            <td className="py-2 px-3 text-stone-600">{row.durationMinutes}m</td>
                            <td className="py-2 px-3 text-stone-500 text-[11px] truncate max-w-xs">{row.description}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Success & Error Feedback Banners */}
            {bulkSuccessMsg && (
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center gap-2 font-bold shadow-xs">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>{bulkSuccessMsg}</span>
              </div>
            )}

            {bulkErrorMsg && (
              <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-center gap-2 font-bold shadow-xs">
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                <span>{bulkErrorMsg}</span>
              </div>
            )}

            {/* Progress Bar when uploading */}
            {isBulkProcessing && bulkProgress && (
              <div className="space-y-1.5 p-4 rounded-2xl bg-emerald-50 border border-emerald-200">
                <div className="flex justify-between text-xs font-bold text-emerald-800">
                  <span>डेटाबेस में सेवाएं अपलोड हो रही हैं...</span>
                  <span>{bulkProgress.current} / {bulkProgress.total}</span>
                </div>
                <div className="w-full h-2.5 bg-emerald-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-600 transition-all duration-200 rounded-full"
                    style={{
                      width: `${Math.round((bulkProgress.current / bulkProgress.total) * 100)}%`,
                    }}
                  />
                </div>
              </div>
            )}

            {/* Modal Actions Footer */}
            <div className="flex items-center justify-between pt-4 border-t border-stone-100 flex-wrap gap-3">
              <div className="text-xs text-stone-500">
                {bulkRowsToUpload.length > 0 ? (
                  <span>
                    कुल <strong>{bulkRowsToUpload.length}</strong> सेवाएं Firestore डेटाबेस में अपलोड के लिए तैयार हैं।
                  </span>
                ) : (
                  <span>कृपया ऊपर Excel/CSV फाइल अपलोड करें या डेटा पेस्ट करें।</span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowBulkUploadModal(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-stone-600 hover:bg-stone-100 cursor-pointer"
                >
                  रद्द करें (Cancel)
                </button>

                <button
                  type="button"
                  id="bulk-modal-commit-upload-btn"
                  onClick={handleCommitBulkServices}
                  disabled={isBulkProcessing || bulkRowsToUpload.length === 0}
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-stone-300 disabled:cursor-not-allowed text-white text-xs font-black transition-all shadow-md shadow-emerald-900/10 cursor-pointer flex items-center gap-2"
                >
                  {isBulkProcessing ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>अपलोड जारी है ({bulkProgress?.current || 0}/{bulkProgress?.total || 0})...</span>
                    </>
                  ) : (
                    <>
                      <GitMerge className="w-4 h-4" />
                      <span>🔄 डेटाबेस में मर्ज करें ({bulkRowsToUpload.length} सेवाएं)</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminCatalogManager;
