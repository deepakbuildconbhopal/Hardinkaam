import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import {
  GitMerge,
  Trash2,
  Sparkles,
  Upload,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Layers,
  Search,
  ShieldCheck,
  AlertTriangle,
  Check,
  Copy,
  X,
  Database,
  ArrowRight,
  Info,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { collection, doc, writeBatch, getDocs, deleteDoc, setDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { Service, Category, ServiceMan } from '../../types';

export interface AdminDataImportManagerProps {
  onRefresh?: () => void;
  onSelectTab?: (tab: string) => void;
}

type MainTab = 'merge' | 'duplicate_cleaner';
type TargetCollection = 'services' | 'categories' | 'service_men';

interface DuplicateGroup {
  idKey: string;
  name: string;
  categoryOrTrade: string;
  primaryDoc: {
    id: string;
    name: string;
    categoryOrTrade: string;
    priceOrPhone: string;
    rating?: number;
    raw: any;
  };
  duplicates: Array<{
    id: string;
    name: string;
    categoryOrTrade: string;
    priceOrPhone: string;
    raw: any;
  }>;
}

export const AdminDataImportManager: React.FC<AdminDataImportManagerProps> = ({
  onRefresh,
  onSelectTab,
}) => {
  const [activeMainTab, setActiveMainTab] = useState<MainTab>('merge');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // ==========================================
  // TAB 1: DATABASE MERGE STATE
  // ==========================================
  const [targetCollection, setTargetCollection] = useState<TargetCollection>('services');
  const [rawMergeText, setRawMergeText] = useState<string>('');
  const [uploadedFileName, setUploadedFileName] = useState<string>('');
  const [sheetList, setSheetList] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string>('');
  const [loadedWorkbook, setLoadedWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const [isMerging, setIsMerging] = useState<boolean>(false);
  const [mergeProgress, setMergeProgress] = useState<{ current: number; total: number } | null>(null);
  const [mergeSuccessMsg, setMergeSuccessMsg] = useState<string | null>(null);
  const [mergeErrorMsg, setMergeErrorMsg] = useState<string | null>(null);
  const [copiedTemplate, setCopiedTemplate] = useState<boolean>(false);

  // ==========================================
  // TAB 2: MASTER DUPLICATE CLEANER STATE
  // ==========================================
  const [cleanerTarget, setCleanerTarget] = useState<TargetCollection>('services');
  const [isScanningDuplicates, setIsScanningDuplicates] = useState<boolean>(false);
  const [isCleaningDuplicates, setIsCleaningDuplicates] = useState<boolean>(false);
  const [cleanerSuccessMsg, setCleanerSuccessMsg] = useState<string | null>(null);
  const [cleanerErrorMsg, setCleanerErrorMsg] = useState<string | null>(null);
  const [duplicateFilterQuery, setDuplicateFilterQuery] = useState<string>('');

  // Live Firestore Master records
  const [liveServices, setLiveServices] = useState<Service[]>([]);
  const [liveCategories, setLiveCategories] = useState<Category[]>([]);
  const [liveServiceMen, setLiveServiceMen] = useState<ServiceMan[]>([]);

  // Slug generator
  const slugify = useCallback((text: string) =>
    text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '_')
      .replace(/^-+|-+$/g, ''), []);

  // Fetch Master Database from Firestore
  const fetchLiveMasterData = useCallback(async () => {
    setIsScanningDuplicates(true);
    setCleanerErrorMsg(null);
    try {
      const [srvSnap, catSnap, proSnap] = await Promise.all([
        getDocs(collection(db, 'services')),
        getDocs(collection(db, 'categories')),
        getDocs(collection(db, 'serviceMen')),
      ]);

      const srvList: Service[] = [];
      srvSnap.forEach((d) => srvList.push({ id: d.id, ...d.data() } as Service));
      setLiveServices(srvList);

      const catList: Category[] = [];
      catSnap.forEach((d) => catList.push({ id: d.id, ...d.data() } as Category));
      setLiveCategories(catList);

      const proList: ServiceMan[] = [];
      proSnap.forEach((d) => proList.push({ id: d.id, ...d.data() } as ServiceMan));
      setLiveServiceMen(proList);
    } catch (err: any) {
      console.error('Error fetching live master records:', err);
      setCleanerErrorMsg(`डेटाबेस लोड करने में समस्या: ${err.message || 'Unknown error'}`);
    } finally {
      setIsScanningDuplicates(false);
    }
  }, []);

  useEffect(() => {
    fetchLiveMasterData();
  }, [fetchLiveMasterData]);

  // Master index maps for fast O(1) merge lookups
  const masterServiceIndex = useMemo(() => {
    const map = new Map<string, Service>();
    liveServices.forEach((s) => {
      const catKey = (s.categoryName || s.categoryId || '').trim().toLowerCase();
      const nameKey = (s.name || '').trim().toLowerCase();
      map.set(`${catKey}:::${nameKey}`, s);
      map.set(s.id.toLowerCase(), s);
    });
    return map;
  }, [liveServices]);

  const masterCategoryIndex = useMemo(() => {
    const map = new Map<string, Category>();
    liveCategories.forEach((c) => {
      map.set((c.name || '').trim().toLowerCase(), c);
      map.set((c.slug || '').trim().toLowerCase(), c);
      map.set(c.id.toLowerCase(), c);
    });
    return map;
  }, [liveCategories]);

  const masterProIndex = useMemo(() => {
    const map = new Map<string, ServiceMan>();
    liveServiceMen.forEach((p) => {
      const phoneDigits = String(p.phone || '').replace(/\D/g, '').slice(-10);
      if (phoneDigits) map.set(`phone:::${phoneDigits}`, p);
      if (p.email) map.set(`email:::${p.email.toLowerCase().trim()}`, p);
      map.set(p.id.toLowerCase(), p);
    });
    return map;
  }, [liveServiceMen]);

  // ==========================================
  // SAMPLE TEMPLATES FOR MERGE
  // ==========================================
  const sampleMergeData: Record<TargetCollection, string> = {
    services: `name,categoryName,basePrice,priceUnit,durationMinutes,description,imageUrl
RO Water Purifier Servicing,RO Water Purifier,399,per visit,45,Full water purifier membrane check and TDS tuning,https://images.unsplash.com/photo-1584771145729-0bd9fda6529b?w=600&auto=format&fit=crop&q=80
RO Membrane & Filter Replacement,RO Water Purifier,899,per visit,60,Authentic RO membrane replacement with 100% genuine filters,https://images.unsplash.com/photo-1584771145729-0bd9fda6529b?w=600&auto=format&fit=crop&q=80
AC Foam Jet Cleaning,AC & Appliance Repair,599,per AC,60,High pressure power wash and chemical foam jet cleaning,https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=600&auto=format&fit=crop&q=80
Switch & Socket Replacement,Electrician,149,per point,30,Diagnosis and replacement of damaged electrical switch sockets,https://images.unsplash.com/photo-1621905252507-b35492cc74b4?w=600&auto=format&fit=crop&q=80
Tap Leakage & Pipeline Fix,Plumber,199,per tap,30,Fast diagnosis and fixing of leaking kitchen and bathroom taps,https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=600&auto=format&fit=crop&q=80
Bathroom Deep Cleaning,Cleaning & Disinfection,1299,per bathroom,90,Deep tile scrubbing disinfection and stain removal,https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=600&auto=format&fit=crop&q=80`,

    categories: `name,slug,description,icon,order
RO Water Purifier,ro-water-purifier,Water purifier servicing RO repair membrane change and TDS tuning,GlassWater,1
AC & Appliance Repair,ac-appliance-repair,Split and window AC jet foam servicing and electronics repair,AirVent,2
Electrician,electrician,Certified wiremen switchboard wiring and inverter installation,Zap,3
Plumber,plumber,Emergency water leakage pipe fitting and bathroom installations,Wrench,4
Cleaning & Disinfection,cleaning,Full home deep scrubbing bathroom and kitchen sanitation,Sparkles,5`,

    service_men: `name,phone,email,trade,serviceArea,experienceYears,hourlyRate
Suresh Kumar RO Tech,9826033445,suresh.ro@hardinkaam.in,RO Water Purifier,Kolar Road & MP Nagar Bhopal,7,299
Ramesh Sharma Electrician,9826011223,ramesh.elec@hardinkaam.in,Electrician,Arera Colony & Shahpura Bhopal,8,299
Mahesh Verma Plumber,9826022334,mahesh.plumb@hardinkaam.in,Plumber,New Market & TT Nagar Bhopal,6,249`,
  };

  // Download sample .xlsx template
  const handleDownloadExcelTemplate = () => {
    const csvContent = sampleMergeData[targetCollection];
    const wb = XLSX.read(csvContent, { type: 'string' });
    XLSX.writeFile(wb, `hardinkaam_merge_template_${targetCollection}.xlsx`);
  };

  // Download sample .csv template
  const handleDownloadCsvTemplate = () => {
    const csvContent = sampleMergeData[targetCollection];
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `hardinkaam_merge_template_${targetCollection}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleCopySampleTemplate = () => {
    navigator.clipboard.writeText(sampleMergeData[targetCollection]);
    setCopiedTemplate(true);
    setTimeout(() => setCopiedTemplate(false), 2000);
  };

  const handleLoadSampleIntoMerge = () => {
    setLoadedWorkbook(null);
    setSheetList([]);
    setSelectedSheet('');
    setRawMergeText(sampleMergeData[targetCollection]);
    setUploadedFileName(`sample_${targetCollection}.csv`);
    setMergeSuccessMsg('सैंपल डेटा लोड हो गया है। नीचे "डेटाबेस में मर्ज करें" पर क्लिक करें।');
  };

  // File Upload & Parser for Excel (.xlsx, .xls) and CSV
  const processUploadedFile = (file: File) => {
    setUploadedFileName(file.name);
    setMergeErrorMsg(null);
    setMergeSuccessMsg(null);

    const reader = new FileReader();
    const isBinaryExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');

    if (isBinaryExcel) {
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          setLoadedWorkbook(workbook);
          setSheetList(workbook.SheetNames);
          const firstSheet = workbook.SheetNames[0] || '';
          setSelectedSheet(firstSheet);

          if (firstSheet) {
            const worksheet = workbook.Sheets[firstSheet];
            const csvText = XLSX.utils.sheet_to_csv(worksheet);
            setRawMergeText(csvText);
            setMergeSuccessMsg(`Excel फ़ाइल "${file.name}" लोड हो गई (${workbook.SheetNames.length} शीट्स मिलीं)`);
          }
        } catch (err: any) {
          setMergeErrorMsg(`Excel पढ़ने में त्रुटि: ${err.message || 'Invalid Excel'}`);
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      // Plain text CSV / TSV / JSON
      reader.onload = (e) => {
        const text = e.target?.result as string;
        setLoadedWorkbook(null);
        setSheetList([]);
        setSelectedSheet('');
        setRawMergeText(text || '');
        setMergeSuccessMsg(`फ़ाइल "${file.name}" सफलतापूर्वक लोड हो गई`);
      };
      reader.readAsText(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processUploadedFile(e.target.files[0]);
    }
  };

  const handleSheetChange = (sheet: string) => {
    setSelectedSheet(sheet);
    if (loadedWorkbook && loadedWorkbook.Sheets[sheet]) {
      const worksheet = loadedWorkbook.Sheets[sheet];
      const csvText = XLSX.utils.sheet_to_csv(worksheet);
      setRawMergeText(csvText);
    }
  };

  // Parse Raw Text into Clean Normalized Rows
  const parsedMergeData = useMemo(() => {
    if (!rawMergeText.trim()) {
      return { rows: [], newCount: 0, updateCount: 0 };
    }

    const text = rawMergeText.trim();
    let records: Record<string, any>[] = [];

    // 1. JSON
    if (text.startsWith('[') || text.startsWith('{')) {
      try {
        const parsed = JSON.parse(text);
        records = Array.isArray(parsed) ? parsed : [parsed];
      } catch (e) {
        // Fallback to CSV
      }
    }

    // 2. CSV / Tab-separated
    if (records.length === 0) {
      const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
      if (lines.length > 0) {
        const delimiter = lines[0].includes('\t') ? '\t' : ',';
        const headers = lines[0]
          .split(delimiter)
          .map((h) => h.replace(/^["']|["']$/g, '').trim())
          .filter((h) => !/^(justdial|justdail|jd_|just_dial|external_link)/i.test(h));

        for (let i = 1; i < lines.length; i++) {
          const rowLine = lines[i];
          // CSV regex splitter supporting quoted fields
          const regex = /(?:,|\t|^)("(?:(?:"")*[^"]*)*"|[^",\t]*)/g;
          const values: string[] = [];
          let match;
          while ((match = regex.exec(rowLine)) !== null) {
            let val = match[1] || '';
            if (val.startsWith('"') && val.endsWith('"')) {
              val = val.slice(1, -1).replace(/""/g, '"');
            }
            values.push(val.trim());
            if (regex.lastIndex === 0) break;
          }

          if (values.some((v) => v.length > 0)) {
            const item: Record<string, any> = {};
            headers.forEach((h, colIdx) => {
              item[h] = values[colIdx] !== undefined ? values[colIdx] : '';
            });
            records.push(item);
          }
        }
      }
    }

    // Determine Merge Status (✨ New Record vs 🔄 Update Existing)
    let newCount = 0;
    let updateCount = 0;

    const normalizedRows = records.map((rec, idx) => {
      const name = String(rec.name || rec.serviceName || rec.title || '').trim();
      const categoryName = String(rec.categoryName || rec.category || rec.trade || '').trim();
      const phone = String(rec.phone || '').replace(/\D/g, '').slice(-10);
      const email = String(rec.email || '').trim().toLowerCase();

      let isExisting = false;
      let matchedId = '';

      if (targetCollection === 'services') {
        const catKey = categoryName.toLowerCase();
        const nameKey = name.toLowerCase();
        const match = masterServiceIndex.get(`${catKey}:::${nameKey}`) || (rec.id ? masterServiceIndex.get(String(rec.id).toLowerCase()) : undefined);
        if (match) {
          isExisting = true;
          matchedId = match.id;
        }
      } else if (targetCollection === 'categories') {
        const match = masterCategoryIndex.get(name.toLowerCase()) || (rec.slug ? masterCategoryIndex.get(String(rec.slug).toLowerCase()) : undefined);
        if (match) {
          isExisting = true;
          matchedId = match.id;
        }
      } else if (targetCollection === 'service_men') {
        const match = (phone ? masterProIndex.get(`phone:::${phone}`) : undefined) || (email ? masterProIndex.get(`email:::${email}`) : undefined);
        if (match) {
          isExisting = true;
          matchedId = match.id;
        }
      }

      if (isExisting) {
        updateCount++;
      } else {
        newCount++;
      }

      return {
        _id: rec.id || matchedId || `rec_${idx + 1}`,
        _isExisting: isExisting,
        _matchedId: matchedId,
        name: name || 'Unnamed Item',
        categoryName: categoryName || 'General',
        basePrice: Number(rec.basePrice || rec.price || rec.rate || 199) || 199,
        priceUnit: String(rec.priceUnit || rec.unit || 'per visit').trim(),
        durationMinutes: Number(rec.durationMinutes || rec.duration || 45) || 45,
        description: String(rec.description || rec.desc || `${name} professional service in Bhopal`).trim(),
        imageUrl: String(rec.imageUrl || rec.image || 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=500&auto=format&fit=crop&q=80').trim(),
        phone: rec.phone || '',
        email: rec.email || '',
        trade: rec.trade || categoryName || '',
        slug: rec.slug || slugify(name),
        raw: rec,
      };
    });

    return {
      rows: normalizedRows,
      newCount,
      updateCount,
    };
  }, [rawMergeText, targetCollection, masterServiceIndex, masterCategoryIndex, masterProIndex, slugify]);

  // Execute Database Merge (Direct Firestore WriteBatch)
  const handleExecuteDatabaseMerge = async () => {
    if (parsedMergeData.rows.length === 0) {
      setMergeErrorMsg('मर्ज करने के लिए कोई डेटा नहीं मिला। कृपया Excel/CSV फाइल चुनें या डेटा पेस्ट करें।');
      return;
    }

    setIsMerging(true);
    setMergeErrorMsg(null);
    setMergeSuccessMsg(null);
    setMergeProgress({ current: 0, total: parsedMergeData.rows.length });

    try {
      const CHUNK_SIZE = 400; // Safe Firestore batch limit
      const rows = parsedMergeData.rows;

      // Ensure missing categories exist if merging services
      if (targetCollection === 'services') {
        const uniqueCategoriesInFile: string[] = Array.from(new Set(rows.map((r) => r.categoryName))).filter(Boolean) as string[];
        const catBatch = writeBatch(db);
        let createdCatCount = 0;

        for (const catName of uniqueCategoriesInFile) {
          const match = masterCategoryIndex.get(catName.toLowerCase());
          if (!match) {
            const catId = `cat_${slugify(catName)}`.slice(0, 30);
            const catRef = doc(db, 'categories', catId);
            catBatch.set(catRef, {
              id: catId,
              name: catName,
              slug: slugify(catName),
              description: `${catName} services in Bhopal`,
              icon: 'Wrench',
              order: 99,
              createdAt: new Date().toISOString(),
            });
            createdCatCount++;
          }
        }
        if (createdCatCount > 0) {
          await catBatch.commit();
        }
      }

      let processedCount = 0;
      for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
        const chunk = rows.slice(i, i + CHUNK_SIZE);
        const batch = writeBatch(db);

        for (const row of chunk) {
          if (targetCollection === 'services') {
            const serviceId = row._matchedId || row._id || `srv_${slugify(row.categoryName)}_${slugify(row.name)}`.slice(0, 50);
            const catId = `cat_${slugify(row.categoryName)}`.slice(0, 30);
            const srvRef = doc(db, 'services', serviceId);

            const srvPayload: Record<string, any> = {
              id: serviceId,
              name: row.name || 'Service',
              categoryName: row.categoryName || 'General',
              categoryId: catId,
              basePrice: Number(row.basePrice) || 199,
              priceUnit: row.priceUnit || 'per visit',
              durationMinutes: Number(row.durationMinutes) || 45,
              description: row.description || '',
              imageUrl: row.imageUrl || '',
              isActive: true,
              updatedAt: new Date().toISOString(),
            };
            if (!row._isExisting) {
              srvPayload.rating = 4.8;
              srvPayload.reviewCount = 24;
              srvPayload.ratingCount = 24;
            }

            const cleanSrv = Object.fromEntries(
              Object.entries(srvPayload).filter(([_, val]) => val !== undefined)
            );
            batch.set(srvRef, cleanSrv, { merge: true });
          } else if (targetCollection === 'categories') {
            const catId = row._matchedId || row._id || `cat_${slugify(row.name)}`.slice(0, 30);
            const catRef = doc(db, 'categories', catId);
            const catPayload: Record<string, any> = {
              id: catId,
              name: row.name,
              slug: row.slug || slugify(row.name),
              description: row.description || '',
              icon: row.raw?.icon || 'Wrench',
              order: Number(row.raw?.order || 99),
              updatedAt: new Date().toISOString(),
            };
            const cleanCat = Object.fromEntries(
              Object.entries(catPayload).filter(([_, val]) => val !== undefined)
            );
            batch.set(catRef, cleanCat, { merge: true });
          } else if (targetCollection === 'service_men') {
            const proId = row._matchedId || row._id || `pro_${slugify(row.name)}_${row.phone.slice(-4)}`.slice(0, 40);
            const proRef = doc(db, 'serviceMen', proId);
            const proPayload: Record<string, any> = {
              id: proId,
              name: row.name,
              phone: row.phone || '',
              email: row.email || '',
              trade: row.trade || 'General',
              serviceArea: row.raw?.serviceArea || 'Bhopal City',
              hourlyRate: Number(row.raw?.hourlyRate || row.basePrice || 299),
              experienceYears: Number(row.raw?.experienceYears || 5),
              isAvailable: true,
              updatedAt: new Date().toISOString(),
            };
            if (!row._isExisting) {
              proPayload.rating = 4.9;
            }
            const cleanPro = Object.fromEntries(
              Object.entries(proPayload).filter(([_, val]) => val !== undefined)
            );
            batch.set(proRef, cleanPro, { merge: true });
          }

          processedCount++;
        }

        await batch.commit();
        setMergeProgress({ current: processedCount, total: rows.length });
      }

      setMergeSuccessMsg(
        `🎉 डेटाबेस मर्ज सफल! कुल ${rows.length} रिकॉर्ड्स (${parsedMergeData.newCount} नए, ${parsedMergeData.updateCount} अपडेटेड) मास्टर डेटाबेस में बिना डुप्लीकेट बनाए सुरक्षित रूप से मर्ज हो गए हैं।`
      );

      // Refresh live master data
      await fetchLiveMasterData();
      if (onRefresh) onRefresh();
    } catch (err: any) {
      console.error('Database merge failed:', err);
      setMergeErrorMsg(`डेटाबेस मर्ज करने में त्रुटि: ${err.message || 'Unknown error'}`);
    } finally {
      setIsMerging(false);
    }
  };

  // =========================================================================
  // TAB 2: MASTER DATABASE DUPLICATE DETECTION & CLEANER ENGINE
  // =========================================================================
  const duplicateGroups = useMemo<DuplicateGroup[]>(() => {
    const groupsMap = new Map<string, Array<{ id: string; name: string; categoryOrTrade: string; priceOrPhone: string; rating?: number; raw: any }>>();

    if (cleanerTarget === 'services') {
      liveServices.forEach((s) => {
        const normCat = (s.categoryName || s.categoryId || 'General').trim().toLowerCase();
        // Normalize name: remove special chars, trim, lower
        const normName = (s.name || '')
          .toLowerCase()
          .replace(/[^\w\s]/g, '')
          .replace(/\s+/g, ' ')
          .trim();
        const groupKey = `${normCat}:::${normName}`;

        const item = {
          id: s.id,
          name: s.name,
          categoryOrTrade: s.categoryName || s.categoryId || 'General',
          priceOrPhone: `₹${s.basePrice} / ${s.priceUnit || 'visit'}`,
          rating: s.rating || 0,
          raw: s,
        };

        if (!groupsMap.has(groupKey)) {
          groupsMap.set(groupKey, []);
        }
        groupsMap.get(groupKey)!.push(item);
      });
    } else if (cleanerTarget === 'categories') {
      liveCategories.forEach((c) => {
        const normName = (c.name || '').toLowerCase().replace(/[^\w\s]/g, '').trim();
        const normSlug = (c.slug || '').toLowerCase().trim();
        const groupKey = normSlug || normName;

        const item = {
          id: c.id,
          name: c.name,
          categoryOrTrade: c.slug || '',
          priceOrPhone: `${c.order || 0} order`,
          raw: c,
        };

        if (!groupsMap.has(groupKey)) {
          groupsMap.set(groupKey, []);
        }
        groupsMap.get(groupKey)!.push(item);
      });
    } else if (cleanerTarget === 'service_men') {
      liveServiceMen.forEach((p) => {
        const phone = String(p.phone || '').replace(/\D/g, '').slice(-10);
        const email = String(p.email || '').toLowerCase().trim();
        const groupKey = phone || email || (p.name || '').toLowerCase().trim();

        const item = {
          id: p.id,
          name: p.name,
          categoryOrTrade: p.trade || '',
          priceOrPhone: phone || email || 'No Contact',
          rating: p.rating || 0,
          raw: p,
        };

        if (!groupsMap.has(groupKey)) {
          groupsMap.set(groupKey, []);
        }
        groupsMap.get(groupKey)!.push(item);
      });
    }

    // Filter only groups that have > 1 record (Duplicates!)
    const result: DuplicateGroup[] = [];
    groupsMap.forEach((items, key) => {
      if (items.length > 1) {
        // Sort items so the "best" record is first (Primary):
        // 1. Highest rating, 2. Has image/description, 3. Oldest ID or cleanest slug
        const sorted = [...items].sort((a, b) => {
          if ((b.rating || 0) !== (a.rating || 0)) {
            return (b.rating || 0) - (a.rating || 0);
          }
          return a.id.length - b.id.length;
        });

        const primaryDoc = sorted[0];
        const duplicates = sorted.slice(1);

        result.push({
          idKey: key,
          name: primaryDoc.name,
          categoryOrTrade: primaryDoc.categoryOrTrade,
          primaryDoc,
          duplicates,
        });
      }
    });

    return result;
  }, [cleanerTarget, liveServices, liveCategories, liveServiceMen]);

  // Filter duplicate groups by search query
  const filteredDuplicateGroups = useMemo(() => {
    if (!duplicateFilterQuery.trim()) return duplicateGroups;
    const q = duplicateFilterQuery.toLowerCase();
    return duplicateGroups.filter(
      (g) =>
        g.name.toLowerCase().includes(q) ||
        g.categoryOrTrade.toLowerCase().includes(q) ||
        g.primaryDoc.id.toLowerCase().includes(q) ||
        g.duplicates.some((d) => d.id.toLowerCase().includes(q))
    );
  }, [duplicateGroups, duplicateFilterQuery]);

  const totalDuplicatesToDeleteCount = useMemo(() => {
    return duplicateGroups.reduce((acc, g) => acc + g.duplicates.length, 0);
  }, [duplicateGroups]);

  // Purge/Delete ALL Duplicates from Firestore Master Database
  const handlePurgeAllDuplicates = async () => {
    if (totalDuplicatesToDeleteCount === 0) {
      setCleanerErrorMsg('कोई डुप्लीकेट रिकॉर्ड नहीं मिला। मास्टर डेटाबेस पूरी तरह से साफ़ व यूनिक है!');
      return;
    }

    const confirmClean = window.confirm(
      `⚠️ क्या आप निश्चित हैं कि आप मास्टर डेटाबेस से सभी ${totalDuplicatesToDeleteCount} डुप्लीकेट रिकॉर्ड्स को हटाना चाहते हैं? प्रत्येक ग्रुप का मुख्य (Primary) रिकॉर्ड सुरक्षित रहेगा।`
    );
    if (!confirmClean) return;

    setIsCleaningDuplicates(true);
    setCleanerErrorMsg(null);
    setCleanerSuccessMsg(null);

    try {
      const collectionName = cleanerTarget === 'services' ? 'services' : cleanerTarget === 'categories' ? 'categories' : 'serviceMen';
      const allIdsToDelete: string[] = [];

      duplicateGroups.forEach((group) => {
        group.duplicates.forEach((dup) => {
          allIdsToDelete.push(dup.id);
        });
      });

      // Batch delete in chunks of 400
      const CHUNK_SIZE = 400;
      for (let i = 0; i < allIdsToDelete.length; i += CHUNK_SIZE) {
        const chunk = allIdsToDelete.slice(i, i + CHUNK_SIZE);
        const batch = writeBatch(db);
        for (const docId of chunk) {
          const docRef = doc(db, collectionName, docId);
          batch.delete(docRef);
        }
        await batch.commit();
      }

      setCleanerSuccessMsg(
        `✨ सफ़ाई पूर्ण! मास्टर डेटाबेस से ${allIdsToDelete.length} डुप्लिकेट रिकॉर्ड्स को सफलतापूर्वक हटा दिया गया है। प्रत्येक आइटम की 1 यूनिक मास्टर कॉपी सुरक्षित रखी गई है।`
      );

      await fetchLiveMasterData();
      if (onRefresh) onRefresh();
    } catch (err: any) {
      console.error('Failed to clean duplicates:', err);
      setCleanerErrorMsg(`डुप्लीकेट हटाने में त्रुटि: ${err.message || 'Unknown error'}`);
    } finally {
      setIsCleaningDuplicates(false);
    }
  };

  // Delete a single duplicate group
  const handleDeleteSingleGroup = async (group: DuplicateGroup) => {
    try {
      const collectionName = cleanerTarget === 'services' ? 'services' : cleanerTarget === 'categories' ? 'categories' : 'serviceMen';
      const batch = writeBatch(db);
      group.duplicates.forEach((d) => {
        batch.delete(doc(db, collectionName, d.id));
      });
      await batch.commit();

      setCleanerSuccessMsg(`ग्रुप "${group.name}" के ${group.duplicates.length} डुप्लिकेट हटा दिए गए!`);
      await fetchLiveMasterData();
      if (onRefresh) onRefresh();
    } catch (err: any) {
      setCleanerErrorMsg(`हटाने में त्रुटि: ${err.message}`);
    }
  };

  return (
    <div id="admin-database-hub" className="space-y-6 pb-20 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="bg-stone-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-stone-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-500/30">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Master Database Control &amp; Optimization Hub</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight flex items-center gap-3">
              <span>डेटाबेस मर्ज &amp; डुप्लीकेट क्लिनर</span>
            </h1>
            <p className="text-xs sm:text-sm text-stone-300 max-w-2xl font-medium leading-relaxed">
              बिना किसी उलझन के <strong>Excel / CSV फ़ाइल से डेटाबेस मर्ज</strong> करें या <strong>मास्टर डेटाबेस से सभी डुप्लीकेट सेवाएं व श्रेणियां 1-क्लिक में साफ़ करें</strong>।
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={fetchLiveMasterData}
              disabled={isScanningDuplicates}
              className="px-3.5 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-bold transition-all border border-stone-700 inline-flex items-center gap-1.5 cursor-pointer shadow-sm"
              title="Refresh Master DB cache"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-blue-400 ${isScanningDuplicates ? 'animate-spin' : ''}`} />
              <span>डेटाबेस री-स्कैन</span>
            </button>

            {onSelectTab && (
              <button
                type="button"
                onClick={() => onSelectTab('admin_data_explorer')}
                className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black transition-all shadow-xs inline-flex items-center gap-1.5 cursor-pointer"
                title="Firestore संग्रह व रिकॉर्ड्स एक्सप्लोरर (तालिका में देखें व चुनिंदा डिलीट करें)"
              >
                <Database className="w-3.5 h-3.5 text-indigo-200" />
                <span>डेटा एक्सप्लोरर (Explorer)</span>
              </button>
            )}

            {onSelectTab && (
              <button
                type="button"
                onClick={() => onSelectTab('admin_catalog')}
                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black transition-all shadow-xs inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Layers className="w-3.5 h-3.5 text-emerald-200" />
                <span>कैटलॉग देखें</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main 2-Tab Navigation Switcher */}
      <div className="bg-stone-200/90 p-1.5 rounded-2xl flex flex-col sm:flex-row gap-2 shadow-inner">
        <button
          type="button"
          id="tab-btn-database-merge"
          onClick={() => setActiveMainTab('merge')}
          className={`flex-1 py-3 px-4 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-2.5 ${
            activeMainTab === 'merge'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'text-stone-700 hover:text-stone-900 hover:bg-stone-100/60'
          }`}
        >
          <GitMerge className="w-4 h-4 text-emerald-200" />
          <span>1. 🔄 डेटाबेस मर्ज (Database Merge from Excel / CSV)</span>
        </button>

        <button
          type="button"
          id="tab-btn-duplicate-cleaner"
          onClick={() => setActiveMainTab('duplicate_cleaner')}
          className={`flex-1 py-3 px-4 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-2.5 ${
            activeMainTab === 'duplicate_cleaner'
              ? 'bg-rose-600 text-white shadow-md'
              : 'text-stone-700 hover:text-stone-900 hover:bg-stone-100/60'
          }`}
        >
          <Trash2 className="w-4 h-4 text-rose-200" />
          <span className="flex items-center gap-2">
            <span>2. 🧹 मास्टर डेटाबेस से डुप्लीकेट हटाएं</span>
            {totalDuplicatesToDeleteCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-white text-rose-700 text-[10px] font-black">
                {totalDuplicatesToDeleteCount} मिले
              </span>
            )}
          </span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* VIEW 1: DATABASE MERGE (EXCEL / CSV TO FIRESTORE MASTER)                   */}
      {/* ========================================================================= */}
      {activeMainTab === 'merge' && (
        <div className="space-y-6">
          {/* Target Collection Selector */}
          <div className="bg-white p-5 rounded-3xl border border-stone-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-xs font-black text-stone-800 uppercase tracking-wider">
                डेटाबेस का लक्ष्य चुनें (Merge Target):
              </span>
              <div className="flex gap-1.5 bg-stone-100 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setTargetCollection('services')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-black transition-colors ${
                    targetCollection === 'services'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  सर्विस कैटलॉग ({liveServices.length})
                </button>
                <button
                  type="button"
                  onClick={() => setTargetCollection('categories')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-black transition-colors ${
                    targetCollection === 'categories'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  श्रेणियां ({liveCategories.length})
                </button>
                <button
                  type="button"
                  onClick={() => setTargetCollection('service_men')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-black transition-colors ${
                    targetCollection === 'service_men'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  कारीगर व प्रोफेशन्ल्स ({liveServiceMen.length})
                </button>
              </div>
            </div>

            {/* Template Download Shortcuts */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={handleDownloadExcelTemplate}
                className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 hover:bg-emerald-100 text-xs font-bold border border-emerald-200 transition-colors flex items-center gap-1.5 cursor-pointer"
                title="Download .xlsx template"
              >
                <Download className="w-3.5 h-3.5 text-emerald-600" />
                <span>📥 Excel टेम्पलेट (.xlsx)</span>
              </button>
              <button
                type="button"
                onClick={handleDownloadCsvTemplate}
                className="px-3 py-1.5 rounded-xl bg-stone-100 text-stone-700 hover:bg-stone-200 text-xs font-bold border border-stone-200 transition-colors flex items-center gap-1.5 cursor-pointer"
                title="Download .csv template"
              >
                <Download className="w-3.5 h-3.5 text-stone-500" />
                <span>📄 CSV टेम्पलेट (.csv)</span>
              </button>
              <button
                type="button"
                onClick={handleLoadSampleIntoMerge}
                className="px-3 py-1.5 rounded-xl bg-stone-900 text-amber-300 hover:bg-stone-800 text-xs font-black transition-colors flex items-center gap-1 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>सैंपल लोड</span>
              </button>
            </div>
          </div>

          {/* Upload File & Paste Card */}
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-stone-200 shadow-sm space-y-5">
            {/* File Drag & Drop Box */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragOver(true);
              }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragOver(false);
                if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                  processUploadedFile(e.dataTransfer.files[0]);
                }
              }}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-3xl p-7 text-center cursor-pointer transition-all ${
                isDragOver
                  ? 'border-emerald-500 bg-emerald-50 scale-[0.99]'
                  : 'border-stone-300 hover:border-emerald-500 bg-stone-50/70 hover:bg-emerald-50/20'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx, .xls, .csv, .txt, .tsv"
                className="hidden"
                onChange={handleFileChange}
              />
              <div className="flex flex-col items-center justify-center gap-2">
                <div className="w-12 h-12 rounded-2xl bg-white border border-stone-200 text-emerald-600 flex items-center justify-center shadow-xs">
                  <Upload className="w-6 h-6" />
                </div>
                <div className="text-xs font-bold text-stone-800">
                  {uploadedFileName ? (
                    <span className="text-emerald-700 font-black text-sm">
                      फ़ाइल चुनी गई: {uploadedFileName}
                    </span>
                  ) : (
                    <>
                      <span className="text-emerald-600 font-black underline text-sm">यहाँ क्लिक करके Excel या CSV चुनें</span> या फाइल ड्रैग करके छोड़ें
                    </>
                  )}
                </div>
                <p className="text-[11px] text-stone-400 font-medium">
                  सपोर्टेड फॉर्मेट्स: <strong>.xlsx, .xls, .csv, .txt</strong> (Microsoft Excel, Google Sheets, LibreOffice)
                </p>
              </div>
            </div>

            {/* Sheet Selector */}
            {sheetList.length > 1 && (
              <div className="flex items-center gap-2 text-xs bg-stone-100 p-3 rounded-2xl">
                <span className="font-bold text-stone-700">Excel शीट चुनें:</span>
                <div className="flex gap-1.5 flex-wrap">
                  {sheetList.map((sheet) => (
                    <button
                      key={sheet}
                      type="button"
                      onClick={() => handleSheetChange(sheet)}
                      className={`px-3 py-1 rounded-lg font-bold text-xs transition-colors ${
                        selectedSheet === sheet
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

            {/* Textarea for direct paste */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <label className="font-bold text-stone-700">
                  या सीधे CSV / Excel टेबल टेक्स्ट पेस्ट करें:
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopySampleTemplate}
                    className="text-[11px] font-bold text-stone-600 hover:text-stone-900 flex items-center gap-1 cursor-pointer"
                  >
                    {copiedTemplate ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedTemplate ? 'कॉपी हो गया!' : 'टेम्पलेट कॉपी'}</span>
                  </button>
                  {rawMergeText && (
                    <button
                      type="button"
                      onClick={() => {
                        setRawMergeText('');
                        setUploadedFileName('');
                        setLoadedWorkbook(null);
                        setMergeSuccessMsg(null);
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
                value={rawMergeText}
                onChange={(e) => {
                  setRawMergeText(e.target.value);
                  setLoadedWorkbook(null);
                }}
                placeholder="name,categoryName,basePrice,priceUnit,durationMinutes,description,imageUrl&#10;RO Water Purifier Servicing,RO Water Purifier,399,per visit,45,Full water purifier membrane check,https://..."
                className="w-full p-3 font-mono text-xs rounded-2xl border border-stone-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-stone-50/50"
              />
            </div>

            {/* Alerts */}
            {mergeSuccessMsg && (
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center gap-2 font-bold shadow-xs">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>{mergeSuccessMsg}</span>
              </div>
            )}
            {mergeErrorMsg && (
              <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-center gap-2 font-bold shadow-xs">
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                <span>{mergeErrorMsg}</span>
              </div>
            )}

            {/* Live Progress Bar */}
            {isMerging && mergeProgress && (
              <div className="space-y-1.5 p-4 rounded-2xl bg-emerald-50 border border-emerald-200">
                <div className="flex justify-between text-xs font-bold text-emerald-800">
                  <span>डेटाबेस में सुरक्षित मर्ज हो रहा है...</span>
                  <span>{mergeProgress.current} / {mergeProgress.total}</span>
                </div>
                <div className="w-full h-2.5 bg-emerald-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-600 transition-all duration-200 rounded-full"
                    style={{
                      width: `${Math.round((mergeProgress.current / mergeProgress.total) * 100)}%`,
                    }}
                  />
                </div>
              </div>
            )}

            {/* Parsed Merge Preview Table & Action Button */}
            {parsedMergeData.rows.length > 0 && (
              <div className="space-y-4 pt-4 border-t border-stone-100">
                {/* Statistics Banner */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3.5 rounded-2xl bg-stone-100 border border-stone-200">
                    <span className="text-[10px] uppercase font-bold text-stone-500 block">कुल पंक्तियाँ (Total Rows)</span>
                    <span className="text-xl font-black text-stone-900">{parsedMergeData.rows.length}</span>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200">
                    <span className="text-[10px] uppercase font-bold text-emerald-700 block">✨ नए रिकॉर्ड्स (New)</span>
                    <span className="text-xl font-black text-emerald-700">{parsedMergeData.newCount}</span>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200">
                    <span className="text-[10px] uppercase font-bold text-amber-700 block">🔄 अपडेट / मर्ज होंगे (Merge Existing)</span>
                    <span className="text-xl font-black text-amber-700">{parsedMergeData.updateCount}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-stone-800">
                    मर्ज होने वाले डेटा का लाइव प्रीव्यू (पहला 15 रिकॉर्ड्स):
                  </span>
                  <span className="text-stone-400 text-[11px]">
                    डुप्लीकेट नहीं बनेंगे, मौजूदा रिकॉर्ड्स नए रेट व विवरण के साथ अपडेट हो जाएंगे।
                  </span>
                </div>

                <div className="border border-stone-200 rounded-2xl overflow-hidden max-h-60 overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-stone-100 border-b border-stone-200 text-stone-600 font-bold text-[10px] uppercase sticky top-0">
                      <tr>
                        <th className="py-2.5 px-3">Merge Status</th>
                        <th className="py-2.5 px-3">Name</th>
                        <th className="py-2.5 px-3">Category / Trade</th>
                        <th className="py-2.5 px-3">Base Price</th>
                        <th className="py-2.5 px-3">Duration</th>
                        <th className="py-2.5 px-3">Description</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100 font-medium">
                      {parsedMergeData.rows.slice(0, 15).map((row, i) => (
                        <tr key={i} className="hover:bg-stone-50">
                          <td className="py-2 px-3">
                            {row._isExisting ? (
                              <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">
                                🔄 Merge / Update
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                                ✨ New Item
                              </span>
                            )}
                          </td>
                          <td className="py-2 px-3 font-bold text-stone-900">{row.name}</td>
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

                {/* Big Primary Merge Button */}
                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    id="execute-database-merge-btn"
                    onClick={handleExecuteDatabaseMerge}
                    disabled={isMerging}
                    className="px-8 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-stone-300 disabled:cursor-not-allowed text-white text-xs font-black transition-all shadow-lg shadow-emerald-900/10 cursor-pointer flex items-center gap-2"
                  >
                    {isMerging ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>डेटाबेस में मर्ज हो रहा है ({mergeProgress?.current || 0}/{mergeProgress?.total || 0})...</span>
                      </>
                    ) : (
                      <>
                        <GitMerge className="w-4 h-4" />
                        <span>🔄 डेटाबेस में मर्ज करें ({parsedMergeData.rows.length} रिकॉर्ड्स)</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 2: MASTER DATABASE DUPLICATE REMOVER (CLEANUP ENGINE)                */}
      {/* ========================================================================= */}
      {activeMainTab === 'duplicate_cleaner' && (
        <div className="space-y-6">
          {/* Target Selector for Duplicate Removal */}
          <div className="bg-white p-5 rounded-3xl border border-stone-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-xs font-black text-stone-800 uppercase tracking-wider">
                डुप्लीकेट जाँच का लक्ष्य:
              </span>
              <div className="flex gap-1.5 bg-stone-100 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setCleanerTarget('services')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-black transition-colors ${
                    cleanerTarget === 'services'
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  सर्विस कैटलॉग ({liveServices.length})
                </button>
                <button
                  type="button"
                  onClick={() => setCleanerTarget('categories')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-black transition-colors ${
                    cleanerTarget === 'categories'
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  श्रेणियां ({liveCategories.length})
                </button>
                <button
                  type="button"
                  onClick={() => setCleanerTarget('service_men')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-black transition-colors ${
                    cleanerTarget === 'service_men'
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  कारीगर व प्रोफेशन्ल्स ({liveServiceMen.length})
                </button>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={fetchLiveMasterData}
                disabled={isScanningDuplicates}
                className="px-3 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isScanningDuplicates ? 'animate-spin' : ''}`} />
                <span>पुनः स्कैन करें</span>
              </button>

              <button
                type="button"
                id="purge-all-duplicates-btn"
                onClick={handlePurgeAllDuplicates}
                disabled={isCleaningDuplicates || totalDuplicatesToDeleteCount === 0}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:bg-stone-300 disabled:cursor-not-allowed text-white text-xs font-black transition-all shadow-md shadow-rose-900/10 cursor-pointer flex items-center gap-1.5"
              >
                {isCleaningDuplicates ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>हटाया जा रहा है...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>🧹 सभी डुप्लीकेट हटाएं ({totalDuplicatesToDeleteCount})</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Cleaner Feedback Alerts */}
          {cleanerSuccessMsg && (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-2 font-bold">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>{cleanerSuccessMsg}</span>
              </div>
              <button
                type="button"
                onClick={() => setCleanerSuccessMsg(null)}
                className="text-emerald-700 hover:text-emerald-950 font-black cursor-pointer text-sm"
              >
                ✕
              </button>
            </div>
          )}

          {cleanerErrorMsg && (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-2 font-bold">
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                <span>{cleanerErrorMsg}</span>
              </div>
              <button
                type="button"
                onClick={() => setCleanerErrorMsg(null)}
                className="text-rose-700 hover:text-rose-950 font-black cursor-pointer text-sm"
              >
                ✕
              </button>
            </div>
          )}

          {/* Duplicate Summary Banner */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-4 rounded-3xl bg-white border border-stone-200 shadow-xs">
              <span className="text-[10px] uppercase font-bold text-stone-500 block">
                डेटाबेस में कुल रिकॉर्ड्स
              </span>
              <span className="text-2xl font-black text-stone-900">
                {cleanerTarget === 'services'
                  ? liveServices.length
                  : cleanerTarget === 'categories'
                  ? liveCategories.length
                  : liveServiceMen.length}
              </span>
            </div>

            <div className="p-4 rounded-3xl bg-amber-50 border border-amber-200 shadow-xs">
              <span className="text-[10px] uppercase font-bold text-amber-800 block">
                डुप्लीकेट ग्रुप्स मिले
              </span>
              <span className="text-2xl font-black text-amber-800">{duplicateGroups.length}</span>
            </div>

            <div className="p-4 rounded-3xl bg-rose-50 border border-rose-200 shadow-xs">
              <span className="text-[10px] uppercase font-bold text-rose-800 block">
                हटाए जाने योग्य अतिरिक्त रिकॉर्ड्स
              </span>
              <span className="text-2xl font-black text-rose-800">{totalDuplicatesToDeleteCount}</span>
            </div>
          </div>

          {/* Search filter for duplicates */}
          {duplicateGroups.length > 0 && (
            <div className="relative">
              <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
              <input
                type="text"
                value={duplicateFilterQuery}
                onChange={(e) => setDuplicateFilterQuery(e.target.value)}
                placeholder="डुप्लीकेट सेवा, श्रेणी या आईडी खोजें..."
                className="w-full pl-10 pr-4 py-2.5 text-xs rounded-2xl bg-white border border-stone-200 focus:outline-hidden focus:ring-2 focus:ring-rose-500 font-medium"
              />
            </div>
          )}

          {/* Duplicate Groups List */}
          {duplicateGroups.length === 0 ? (
            <div className="bg-white rounded-3xl border border-emerald-200 p-10 text-center space-y-3 shadow-xs">
              <div className="w-14 h-14 rounded-3xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto shadow-xs">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-base font-black text-stone-900">
                बधाई हो! कोई डुप्लीकेट रिकॉर्ड नहीं मिला
              </h3>
              <p className="text-xs text-stone-500 max-w-md mx-auto">
                {cleanerTarget === 'services' ? 'सर्विस कैटलॉग' : cleanerTarget === 'categories' ? 'श्रेणियां' : 'कारीगर'} पूरी तरह से साफ़ और यूनिक हैं।
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredDuplicateGroups.map((group, idx) => (
                <div
                  key={group.idKey}
                  className="bg-white rounded-3xl border border-stone-200 p-5 shadow-xs space-y-4"
                >
                  {/* Group Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-stone-100">
                    <div className="flex items-center gap-2.5">
                      <span className="w-6 h-6 rounded-full bg-rose-100 text-rose-700 text-xs font-black flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <div>
                        <h4 className="text-sm font-black text-stone-900 flex items-center gap-2">
                          <span>{group.name}</span>
                          <span className="px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 text-[10px] font-bold">
                            {group.categoryOrTrade}
                          </span>
                        </h4>
                        <p className="text-[11px] text-stone-400">
                          इस आइटम के कुल <strong>{group.duplicates.length + 1}</strong> रिकॉर्ड्स मिले (1 Primary + {group.duplicates.length} Duplicates)
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeleteSingleGroup(group)}
                      className="px-3 py-1.5 rounded-xl bg-rose-50 text-rose-700 hover:bg-rose-100 text-xs font-bold border border-rose-200 transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>यह ग्रुप साफ़ करें</span>
                    </button>
                  </div>

                  {/* Primary vs Duplicates Comparison */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    {/* Primary (Keep) */}
                    <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="px-2 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-black uppercase">
                          ✓ Keep (Primary Master)
                        </span>
                        <span className="text-[10px] font-mono text-emerald-800">{group.primaryDoc.id}</span>
                      </div>
                      <div className="font-bold text-stone-900">{group.primaryDoc.name}</div>
                      <div className="text-[11px] text-stone-600">{group.primaryDoc.priceOrPhone}</div>
                      <div className="text-[10px] text-emerald-700 font-semibold">
                        ★ {group.primaryDoc.rating ? `${group.primaryDoc.rating} Rating` : 'Default Master'}
                      </div>
                    </div>

                    {/* Duplicates (To Delete) */}
                    <div className="space-y-2">
                      {group.duplicates.map((dup) => (
                        <div
                          key={dup.id}
                          className="p-3 rounded-2xl bg-rose-50/50 border border-rose-200 flex items-center justify-between gap-2"
                        >
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 rounded-full bg-rose-200 text-rose-800 text-[10px] font-bold">
                                ✕ Duplicate (हटाया जाएगा)
                              </span>
                              <span className="text-[10px] font-mono text-stone-500">{dup.id}</span>
                            </div>
                            <div className="font-medium text-stone-800 text-xs">{dup.name}</div>
                            <div className="text-[11px] text-stone-500">{dup.priceOrPhone}</div>
                          </div>

                          <button
                            type="button"
                            onClick={async () => {
                              const coll = cleanerTarget === 'services' ? 'services' : cleanerTarget === 'categories' ? 'categories' : 'serviceMen';
                              await deleteDoc(doc(db, coll, dup.id));
                              await fetchLiveMasterData();
                              if (onRefresh) onRefresh();
                            }}
                            className="p-1.5 text-rose-600 hover:bg-rose-100 rounded-lg transition-colors cursor-pointer"
                            title="Delete this record only"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminDataImportManager;
