/**
 * HARDINKAAM Unique Franchise Code Generator & Validator
 * Format: HDK-[DISTRICT_ABBR]-[001...N]
 * Examples:
 *   - Bhopal   -> HDK-BPL-001
 *   - Gwalior  -> HDK-GWL-001
 *   - Indore   -> HDK-IDR-001
 *   - Jabalpur -> HDK-JBL-001
 *   - Ujjain   -> HDK-UJN-001
 */

export const DISTRICT_ABBREVIATIONS: Record<string, string> = {
  // Madhya Pradesh
  bhopal: 'BPL',
  gwalior: 'GWL',
  indore: 'IDR',
  jabalpur: 'JBL',
  ujjain: 'UJN',
  sehore: 'SEH',
  raisen: 'RSN',
  hoshangabad: 'HBD',
  narmadapuram: 'NMP',
  vidisha: 'VDS',
  sagar: 'SGR',
  satna: 'STN',
  rewa: 'REW',
  chhindwara: 'CDW',
  ratlam: 'RTL',
  dewas: 'DWS',
  morena: 'MRN',
  bhind: 'BHD',
  guna: 'GNA',
  shivpuri: 'SVP',
  khargone: 'KRG',
  khandwa: 'KND',
  mandsaur: 'MDS',
  neemuch: 'NMC',
  katni: 'KTN',
  singrauli: 'SGL',
  damoh: 'DMH',
  chhatarpur: 'CHT',
  panna: 'PNA',
  tikamgarh: 'TKM',
  balaghat: 'BGT',
  seoni: 'SNI',
  narsinghpur: 'NSP',
  mandla: 'MDL',
  dindori: 'DND',
  umaria: 'UMR',
  anuppur: 'ANP',
  shahdol: 'SHD',
  sidhi: 'SDH',
  barwani: 'BWN',
  burhanpur: 'BHP',
  alirajpur: 'ARJ',
  jhabua: 'JHB',
  dhar: 'DHR',
  agar: 'AGR',
  'agar malwa': 'AGM',
  shajapur: 'SJP',
  harda: 'HRD',
  betul: 'BTL',
  ashoknagar: 'ASN',
  sheopur: 'SPR',
  datia: 'DTA',
  niwari: 'NWR',
  mauganj: 'MGJ',
  maihar: 'MHR',
  pandhurna: 'PDH',

  // Rajasthan
  jaipur: 'JPR',
  jodhpur: 'JDH',
  kota: 'KTA',
  bikaner: 'BKN',
  ajmer: 'AJM',
  udaipur: 'UDP',
  bhilwara: 'BHL',
  alwar: 'ALW',
  bharatpur: 'BHT',
  sikar: 'SKR',

  // Uttar Pradesh
  lucknow: 'LKO',
  kanpur: 'KNP',
  varanasi: 'VNS',
  agra: 'AGR',
  prayagraj: 'PRG',
  allahabad: 'ALD',
  noida: 'NDA',
  'greater noida': 'GND',
  ghaziabad: 'GZB',
  meerut: 'MRT',
  bareilly: 'BLY',
  aligarh: 'ALG',
  moradabad: 'MRD',
  gorakhpur: 'GKP',
  jhansi: 'JHS',
  mathura: 'MTR',
  ayodhya: 'AYD',

  // Maharashtra
  mumbai: 'MUM',
  pune: 'PUN',
  nagpur: 'NGP',
  nashik: 'NSK',
  aurangabad: 'AGB',
  'chhatrapati sambhajinagar': 'CSN',
  solapur: 'SLP',
  amravati: 'AMV',
  navi_mumbai: 'NVM',
  thane: 'THN',
  kolhapur: 'KLP',

  // Delhi NCR
  delhi: 'DEL',
  'new delhi': 'NDL',
  gurugram: 'GGN',
  gurgaon: 'GGN',
  faridabad: 'FBD',

  // Gujarat
  ahmedabad: 'AMD',
  surat: 'SRT',
  vadodara: 'VDR',
  rajkot: 'RJK',
  bhavnagar: 'BHV',
  jamnagar: 'JMN',
  gandhinagar: 'GNR',

  // Chhattisgarh
  raipur: 'RPR',
  bilaspur: 'BSP',
  bhilai: 'BHL',
  durg: 'DRG',
  korba: 'KRB',
  rajnandgaon: 'RJN',

  // Bihar
  patna: 'PAT',
  gaya: 'GAY',
  bhagalpur: 'BGP',
  muzaffarpur: 'MZF',

  // Haryana & Punjab
  chandigarh: 'CHD',
  ludhiana: 'LDH',
  amritsar: 'ASR',
  jalandhar: 'JLD',
  panipat: 'PNP',
  karnal: 'KRL',
  ambala: 'AMB',
  rohtak: 'RTK',
  hisar: 'HSR',
};

/**
 * Derives a standardized 3-letter uppercase abbreviation for a district.
 */
export function getDistrictAbbreviation(districtName: string): string {
  if (!districtName) return 'IND';
  const clean = districtName.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  
  if (DISTRICT_ABBREVIATIONS[clean]) {
    return DISTRICT_ABBREVIATIONS[clean];
  }

  // Try matching without extra words (e.g. "Bhopal District" -> "Bhopal")
  const firstWord = districtName.trim().split(/\s+/)[0].toLowerCase();
  if (DISTRICT_ABBREVIATIONS[firstWord]) {
    return DISTRICT_ABBREVIATIONS[firstWord];
  }

  // Fallback: Pick 3 consonants or letters
  const consonants = clean.replace(/[aeiou]/g, '').toUpperCase();
  if (consonants.length >= 3) {
    return consonants.substring(0, 3);
  }

  const alpha = clean.toUpperCase();
  if (alpha.length >= 3) {
    return alpha.substring(0, 3);
  }

  return (alpha + 'XXX').substring(0, 3);
}

/**
 * Automatically generates the next unique Franchise Code for a given district.
 * e.g., HDK-GWL-001, HDK-GWL-002
 */
export function generateFranchiseCode(
  districtName: string,
  existingCodes: string[] = []
): string {
  const abbr = getDistrictAbbreviation(districtName);
  const prefix = `HDK-${abbr}-`;

  const matchingIndexes: number[] = [];
  const normalizedExisting = existingCodes.map((c) => (c || '').toUpperCase().trim());

  normalizedExisting.forEach((code) => {
    if (code.startsWith(prefix)) {
      const numPart = code.replace(prefix, '');
      const num = parseInt(numPart, 10);
      if (!isNaN(num)) {
        matchingIndexes.push(num);
      }
    }
  });

  let nextIndex = 1;
  while (matchingIndexes.includes(nextIndex)) {
    nextIndex++;
  }

  const paddedNum = String(nextIndex).padStart(3, '0');
  return `${prefix}${paddedNum}`;
}

/**
 * Validates franchise code format (e.g. HDK-BPL-001, HDK-GWL-001)
 */
export function isValidFranchiseCode(code: string): boolean {
  if (!code) return false;
  const regex = /^HDK-[A-Z0-9]{3}-\d{3,4}$/i;
  return regex.test(code.trim());
}

/**
 * Normalizes a franchise code to canonical uppercase
 */
export function normalizeFranchiseCode(code: string): string {
  return (code || '').trim().toUpperCase();
}
