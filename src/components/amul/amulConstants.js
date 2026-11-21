// Amul Take Home Ration (THR) Monitoring Constants & Metadata

export const AMUL_PLANTS = [
  { id: 'Banas', name: 'Banas Dairy', code: 'BANAS', location: 'Palanpur, Banaskantha', color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' },
  { id: 'Kaira', name: 'Kaira Dairy', code: 'KAIRA', location: 'Anand', color: '#dc2626', bg: '#fef2f2', border: '#fecaca' },
  { id: 'Sumul', name: 'Sumul Dairy', code: 'SUMUL', location: 'Surat', color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0' }
];

export const AMUL_DISTRICTS = [
  // Banas Dairy (14 Districts)
  { dairy: 'Banas', name: 'BANASKANTHA', order: 1 },
  { dairy: 'Banas', name: 'MAHESANA', order: 2 },
  { dairy: 'Banas', name: 'GIR SOMNATH', order: 3 },
  { dairy: 'Banas', name: 'JUNAGADH', order: 4 },
  { dairy: 'Banas', name: 'PATAN', order: 5 },
  { dairy: 'Banas', name: 'ARAVALLI', order: 6 },
  { dairy: 'Banas', name: 'SABARKANTHA', order: 7 },
  { dairy: 'Banas', name: 'KACHCHH', order: 8 },
  { dairy: 'Banas', name: 'DEVBHUMI DWARKA', order: 9 },
  { dairy: 'Banas', name: 'JAMNAGAR', order: 10 },
  { dairy: 'Banas', name: 'MORBI', order: 11 },
  { dairy: 'Banas', name: 'PORBANDAR', order: 12 },
  { dairy: 'Banas', name: 'JAMNAGAR URBAN', order: 13 },
  { dairy: 'Banas', name: 'JUNAGADH URBAN', order: 14 },

  // Kaira Dairy (14 Districts)
  { dairy: 'Kaira', name: 'KHEDA', order: 15 },
  { dairy: 'Kaira', name: 'SURENDRANAGAR', order: 16 },
  { dairy: 'Kaira', name: 'AHMADABAD URBAN', order: 17 },
  { dairy: 'Kaira', name: 'ANAND', order: 18 },
  { dairy: 'Kaira', name: 'BHAVNAGAR', order: 19 },
  { dairy: 'Kaira', name: 'RAJKOT', order: 20 },
  { dairy: 'Kaira', name: 'MAHISAGAR', order: 21 },
  { dairy: 'Kaira', name: 'AMRELI', order: 22 },
  { dairy: 'Kaira', name: 'GANDHINAGAR', order: 23 },
  { dairy: 'Kaira', name: 'BHAVNAGAR URBAN', order: 24 },
  { dairy: 'Kaira', name: 'BOTAD', order: 25 },
  { dairy: 'Kaira', name: 'RAJKOT URBAN', order: 26 },
  { dairy: 'Kaira', name: 'AHMADABAD', order: 27 },
  { dairy: 'Kaira', name: 'GANDHINAGAR URBAN', order: 28 },

  // Sumul Dairy (12 Districts)
  { dairy: 'Sumul', name: 'PANCHMAHALS', order: 29 },
  { dairy: 'Sumul', name: 'VADODARA', order: 30 },
  { dairy: 'Sumul', name: 'SURAT URBAN', order: 31 },
  { dairy: 'Sumul', name: 'DAHOD', order: 32 },
  { dairy: 'Sumul', name: 'BHARUCH', order: 33 },
  { dairy: 'Sumul', name: 'VALSAD', order: 34 },
  { dairy: 'Sumul', name: 'SURAT', order: 35 },
  { dairy: 'Sumul', name: 'DANGS', order: 36 },
  { dairy: 'Sumul', name: 'VADODARA URBAN', order: 37 },
  { dairy: 'Sumul', name: 'NAVSARI', order: 38 },
  { dairy: 'Sumul', name: 'CHHOTA UDEPUR', order: 39 },
  { dairy: 'Sumul', name: 'NARMADA', order: 40 }
];

export const DISTRICT_TO_DAIRY_MAP = AMUL_DISTRICTS.reduce((acc, d) => {
  acc[d.name] = d.dairy;
  return acc;
}, {});

export const getDairyForDistrict = (districtName) => {
  if (!districtName) return 'Unknown';
  const clean = districtName.trim().toUpperCase();
  if (DISTRICT_TO_DAIRY_MAP[clean]) return DISTRICT_TO_DAIRY_MAP[clean];
  for (const d of AMUL_DISTRICTS) {
    if (clean.includes(d.name) || d.name.includes(clean)) return d.dairy;
  }
  return 'Unknown';
};
