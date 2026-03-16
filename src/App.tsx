import React, { useState } from 'react';
import { supabase } from './lib/supabase';
import { useHousehold } from './useHousehold';
import { AuthScreen } from './AuthScreen';
import { OnboardingFlow } from './OnboardingFlow';
import { 
  Home, 
  Shield, 
  FileText, 
  Wrench, 
  ChevronRight, 
  ChevronDown, 
  ArrowLeft, 
  Clock, 
  Info, 
  User, 
  Menu, 
  X, 
  Calendar, 
  Users, 
  TrendingUp,
  XCircle,
  CheckCircle,
  AlertCircle,
  ChevronUp,
  Car,
  Building,
  Umbrella,
  Heart,
  Edit3,
  Plus,
  AlertTriangle,
  DollarSign,
  Upload,
  Folder,
  Download,
  Eye,
  Zap,
  Thermometer,
  Droplets,
  Refrigerator,
  Flame,
  ScrollText,
  Scale,
  FileSignature,
  ClipboardList,
  CircleDot,
  CreditCard,
  Wallet,
  ShoppingCart,
  Utensils,
  Tv,
  PiggyBank,
  TrendingDown,
  LucideIcon
} from 'lucide-react';

// Logo path from public folder
const commandLogo = '/Command_Logo.png';

// Type definitions
interface Recommendation {
  title: string;
  savings?: number;
  description: string;
  impact: string;
}

interface Priority {
  id: number;
  title: string;
  category: string;
  impact: 'Critical' | 'High' | 'Medium' | 'Low';
  urgency: string;
  description: string;
  potentialSavings?: string;
  estimatedCost?: string;
  icon: LucideIcon;
  rationale: string;
  recommendations: Recommendation[];
}

interface KeyMetric {
  label: string;
  value: string;
  status: 'good' | 'warning' | 'critical' | 'neutral' | 'info';
}

interface SectionItem {
  label: string;
  value: string;
  status: 'good' | 'warning' | 'critical' | 'info';
}

interface HouseholdSection {
  id: string;
  icon: LucideIcon;
  title: string;
  score: number;
  status: 'good' | 'needs-attention' | 'critical';
  summary: string;
  keyMetrics: KeyMetric[];
  items: SectionItem[];
}

interface TimelineEvent {
  id: number;
  date: string;
  title: string;
  category: string;
  type: 'upcoming' | 'past';
  icon: LucideIcon;
  status?: 'warning' | 'info' | 'success' | 'critical';
}

interface InsurancePolicy {
  id: string;
  type: 'home' | 'auto' | 'umbrella' | 'life' | 'health';
  name: string;
  carrier: string;
  policyNumber: string;
  premium: number;
  premiumFrequency: 'monthly' | 'quarterly' | 'annual';
  deductible: number;
  coverage: string;
  renewalDate: string;
  status: 'active' | 'expiring-soon' | 'action-needed' | 'expired';
  icon: LucideIcon;
  details: Record<string, string>;
  recommendations?: string[];
}

interface DocumentVersion {
  id: string;
  version: number;
  uploadedDate: string;
  uploadedBy: string;
  fileSize: string;
  changes?: string;
}

interface Document {
  id: string;
  name: string;
  type: string;
  category: 'legal' | 'insurance' | 'home' | 'tax' | 'family' | 'financial';
  subcategory?: string;
  uploadedDate: string;
  lastModified: string;
  status: 'current' | 'needs-review' | 'outdated' | 'expired';
  summary?: string;
  recommendations?: string[];
  versions: DocumentVersion[];
  linkedTo?: string;
  icon: LucideIcon;
}

interface LegalDocument {
  id: string;
  name: string;
  type: 'will' | 'trust' | 'healthcare-directive' | 'power-of-attorney' | 'beneficiary' | 'other';
  status: 'current' | 'needs-review' | 'outdated' | 'not-established';
  lastUpdated: string;
  summary: string;
  recommendations: string[];
  documents: Document[];
  icon: LucideIcon;
}

interface Attorney {
  name: string;
  firm: string;
  specialty: string;
  phone: string;
  email: string;
  address: string;
  lastContact: string;
}

interface HomeAsset {
  id: string;
  name: string;
  category: 'hvac' | 'roof' | 'appliance' | 'plumbing' | 'electrical' | 'exterior' | 'other';
  brand?: string;
  model?: string;
  installDate: string;
  expectedLifespan: number;
  currentAge: number;
  condition: 'excellent' | 'good' | 'fair' | 'poor' | 'replace-soon';
  estimatedReplacementCost: number;
  warrantyExpires?: string;
  lastServiceDate?: string;
  documents: Document[];
  maintenanceHistory: MaintenanceRecord[];
  icon: LucideIcon;
}

interface MaintenanceRecord {
  id: string;
  date: string;
  type: 'repair' | 'maintenance' | 'inspection' | 'replacement';
  description: string;
  cost: number;
  provider?: string;
  notes?: string;
}

const CommandApp: React.FC = () => {
  const { data, loading, userId, refresh } = useHousehold();
  const [activeView, setActiveView] = useState<string>('dashboard');
  const [onboardingComplete, setOnboardingComplete] = useState<boolean>(false);
  const isNewUser = !loading && !!userId && !data?.household && !onboardingComplete;
  const [selectedPriority, setSelectedPriority] = useState<Priority | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [dismissedPriorities, setDismissedPriorities] = useState<number[]>([]);
  const [showDismissed, setShowDismissed] = useState<boolean>(false);
  // const [selectedPolicy, setSelectedPolicy] = useState<InsurancePolicy | null>(null);
  // const [selectedLegalDoc, setSelectedLegalDoc] = useState<LegalDocument | null>(null);
  // const [selectedAsset, setSelectedAsset] = useState<HomeAsset | null>(null);
  const [showDocumentUpload, setShowDocumentUpload] = useState<boolean>(false);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  // const [dismissedTaxRecs, setDismissedTaxRecs] = useState<string[]>([]);
  const [showAddContribution, setShowAddContribution] = useState<boolean>(false);
  const [showAddExpense, setShowAddExpense] = useState<boolean>(false);
  const [showUploadTaxDoc, setShowUploadTaxDoc] = useState<'contributions' | 'expenses' | null>(null);
  const [uploadParseStatus, setUploadParseStatus] = useState<'idle' | 'parsing' | 'done'>('idle');
  const [parsedUploadItems, setParsedUploadItems] = useState<any[]>([]);

  // ── Weekly Brief ─────────────────────────────────────────────────────────
  const shouldShowWeeklyBrief = (): boolean => {
    try {
      const last = localStorage.getItem('command_brief_dismissed');
      if (!last) return true;
      const daysSince = (Date.now() - parseInt(last)) / (1000 * 60 * 60 * 24);
      return daysSince >= 7;
    } catch { return true; }
  };
  const [showWeeklyBrief, setShowWeeklyBrief] = useState<boolean>(shouldShowWeeklyBrief);
  const [briefExpanded, setBriefExpanded] = useState<Record<string, boolean>>({});

  const dismissWeeklyBrief = () => {
    try { localStorage.setItem('command_brief_dismissed', Date.now().toString()); } catch {}
    setShowWeeklyBrief(false);
  };

  // ── Dev Persona Switcher ──────────────────────────────────────────────────
  interface DevPersona {
    id: string;
    name: string;
    initials: string;
    title: string;
    hhi: string;
    netWorth: string;
    score: number;
    description: string;
  }
  const devPersonas: DevPersona[] = [
    { id: 'adam', name: 'Adam Bailey', initials: 'AB', title: 'VP / Senior Director', hhi: '$325K', netWorth: '$2.8M', score: 72, description: 'Dual-income, 2 kids, $750K home — primary demo persona' },
    { id: 'rachel', name: 'Rachel Kim', initials: 'RK', title: 'Senior Engineer', hhi: '$185K', netWorth: '$420K', score: 58, description: 'Single, first-time homeowner, heavy student loan payoff phase' },
    { id: 'tom', name: 'Tom & Nancy Reeves', initials: 'TR', title: 'Near-Retirees', hhi: '$210K', netWorth: '$4.1M', score: 85, description: 'Empty nesters, 3 years from retirement, estate planning focus' },
  ];
  const [activePersona, setActivePersona] = useState<DevPersona>(devPersonas[0]);
  const [showDevSwitcher, setShowDevSwitcher] = useState<boolean>(false);

  const dismissPriority = (id: number, e: React.MouseEvent): void => {
    e.stopPropagation();
    setDismissedPriorities(prev => [...prev, id]);
  };

  const restorePriority = (id: number, e: React.MouseEvent): void => {
    e.stopPropagation();
    setDismissedPriorities(prev => prev.filter(pId => pId !== id));
  };

  // Attorney Information
  const _attorney: Attorney = {
    name: 'Jennifer Morrison',
    firm: 'Morrison & Associates Law',
    specialty: 'Estate Planning & Trust Law',
    phone: '(612) 555-8200',
    email: 'jmorrison@morrisonlaw.com',
    address: '450 Nicollet Mall, Suite 1200, Minneapolis, MN 55402',
    lastContact: 'March 2019'
  };

  // Legal Documents Data
  const _legalDocuments: LegalDocument[] = [
    {
      id: 'will-1',
      name: 'Last Will and Testament',
      type: 'will',
      status: 'needs-review',
      lastUpdated: 'March 15, 2019',
      summary: 'Current will distributes assets equally between spouse and children. Names Sarah Bailey as executor. Guardian designation for minor children names Sarah\'s sister.',
      recommendations: [
        'Update to reflect increased net worth ($2.8M vs $1.2M when drafted)',
        'Review guardian designations - children are now 9 and 12',
        'Consider specific bequests for new assets acquired since 2019',
        'Coordinate with new trust if established'
      ],
      documents: [],
      icon: ScrollText
    },
    {
      id: 'trust-1',
      name: 'Revocable Living Trust',
      type: 'trust',
      status: 'not-established',
      lastUpdated: 'N/A',
      summary: 'No trust currently established. With $2.8M net worth, a revocable living trust would help avoid probate, maintain privacy, and provide structured asset distribution.',
      recommendations: [
        'PRIORITY: Establish revocable living trust to avoid probate',
        'Estimated probate costs avoided: $15,000 - $40,000',
        'Consider sub-trusts for minor children\'s inheritance',
        'Review with attorney - recommend scheduling within 30 days'
      ],
      documents: [],
      icon: FileSignature
    },
    {
      id: 'healthcare-1',
      name: 'Healthcare Directive',
      type: 'healthcare-directive',
      status: 'outdated',
      lastUpdated: 'March 15, 2019',
      summary: 'Current directive names Sarah Bailey as primary healthcare agent and Sarah\'s mother as alternate. Includes standard end-of-life care preferences.',
      recommendations: [
        'Review and confirm healthcare preferences are still accurate',
        'Consider updating alternate agent (Sarah\'s mother is now 72)',
        'Add HIPAA authorization for additional family members',
        'Ensure copies are on file with primary care physician'
      ],
      documents: [],
      icon: Heart
    },
    {
      id: 'poa-1',
      name: 'Financial Power of Attorney',
      type: 'power-of-attorney',
      status: 'needs-review',
      lastUpdated: 'March 15, 2019',
      summary: 'Durable financial POA grants Sarah Bailey broad authority to manage financial affairs if incapacitated. Includes real estate, banking, and investment powers.',
      recommendations: [
        'Review scope of powers - may need updates for new account types',
        'Consider adding successor agent designation',
        'Verify acceptance by all financial institutions',
        'Update to include digital asset management provisions'
      ],
      documents: [],
      icon: Scale
    },
    {
      id: 'beneficiary-1',
      name: 'Beneficiary Designations',
      type: 'beneficiary',
      status: 'needs-review',
      lastUpdated: 'Various',
      summary: 'Beneficiary designations across retirement accounts, life insurance, and investment accounts. Last comprehensive review was in 2019.',
      recommendations: [
        'Review all retirement account beneficiaries (401k, IRAs)',
        'Confirm life insurance beneficiary designations',
        'Ensure designations align with estate plan',
        'Consider contingent beneficiary updates for children'
      ],
      documents: [],
      icon: ClipboardList
    }
  ];

  // Home Assets Data
  const _homeAssets: HomeAsset[] = [
    {
      id: 'hvac-1',
      name: 'HVAC System',
      category: 'hvac',
      brand: 'Carrier',
      model: 'Infinity 24ANB1',
      installDate: 'June 2012',
      expectedLifespan: 18,
      currentAge: 14,
      condition: 'fair',
      estimatedReplacementCost: 8500,
      warrantyExpires: 'June 2022',
      lastServiceDate: 'October 2025',
      documents: [],
      maintenanceHistory: [
        { id: 'm1', date: 'Oct 15, 2025', type: 'maintenance', description: 'Annual inspection and tune-up', cost: 189, provider: 'Comfort Systems' },
        { id: 'm2', date: 'Jul 3, 2025', type: 'repair', description: 'Capacitor replacement', cost: 285, provider: 'Comfort Systems' },
        { id: 'm3', date: 'Oct 10, 2024', type: 'maintenance', description: 'Annual inspection', cost: 175, provider: 'Comfort Systems' }
      ],
      icon: Thermometer
    },
    {
      id: 'roof-1',
      name: 'Roof',
      category: 'roof',
      brand: 'GAF',
      model: 'Timberline HDZ',
      installDate: 'August 2022',
      expectedLifespan: 30,
      currentAge: 3,
      condition: 'excellent',
      estimatedReplacementCost: 18000,
      warrantyExpires: 'August 2052',
      lastServiceDate: 'August 2024',
      documents: [],
      maintenanceHistory: [
        { id: 'm1', date: 'Aug 20, 2024', type: 'inspection', description: 'Annual roof inspection', cost: 0, provider: 'ABC Roofing', notes: 'No issues found' }
      ],
      icon: Building
    },
    {
      id: 'waterheater-1',
      name: 'Water Heater',
      category: 'plumbing',
      brand: 'Rheem',
      model: 'Performance Plus 50 Gal',
      installDate: 'March 2018',
      expectedLifespan: 12,
      currentAge: 8,
      condition: 'good',
      estimatedReplacementCost: 1800,
      warrantyExpires: 'March 2024',
      lastServiceDate: 'November 2024',
      documents: [],
      maintenanceHistory: [
        { id: 'm1', date: 'Nov 5, 2024', type: 'maintenance', description: 'Anode rod inspection and tank flush', cost: 125, provider: 'Pro Plumbing' }
      ],
      icon: Droplets
    },
    {
      id: 'furnace-1',
      name: 'Furnace',
      category: 'hvac',
      brand: 'Carrier',
      model: '59TP6',
      installDate: 'June 2012',
      expectedLifespan: 20,
      currentAge: 14,
      condition: 'good',
      estimatedReplacementCost: 4500,
      warrantyExpires: 'June 2022',
      lastServiceDate: 'October 2025',
      documents: [],
      maintenanceHistory: [
        { id: 'm1', date: 'Oct 15, 2025', type: 'maintenance', description: 'Annual inspection (with AC)', cost: 0, provider: 'Comfort Systems' }
      ],
      icon: Flame
    },
    {
      id: 'fridge-1',
      name: 'Refrigerator',
      category: 'appliance',
      brand: 'Samsung',
      model: 'RF28R7551SR',
      installDate: 'December 2020',
      expectedLifespan: 15,
      currentAge: 5,
      condition: 'excellent',
      estimatedReplacementCost: 2800,
      warrantyExpires: 'December 2025',
      lastServiceDate: undefined,
      documents: [],
      maintenanceHistory: [],
      icon: Refrigerator
    },
    {
      id: 'washer-1',
      name: 'Washer & Dryer',
      category: 'appliance',
      brand: 'LG',
      model: 'WM4000HWA / DLEX4000W',
      installDate: 'January 2021',
      expectedLifespan: 12,
      currentAge: 5,
      condition: 'excellent',
      estimatedReplacementCost: 2200,
      warrantyExpires: 'January 2026',
      lastServiceDate: undefined,
      documents: [],
      maintenanceHistory: [],
      icon: CircleDot
    },
    {
      id: 'dishwasher-1',
      name: 'Dishwasher',
      category: 'appliance',
      brand: 'Bosch',
      model: 'SHPM88Z75N',
      installDate: 'March 2019',
      expectedLifespan: 12,
      currentAge: 7,
      condition: 'good',
      estimatedReplacementCost: 1200,
      warrantyExpires: 'March 2021',
      lastServiceDate: undefined,
      documents: [],
      maintenanceHistory: [],
      icon: Droplets
    },
    {
      id: 'garage-1',
      name: 'Garage Door Opener',
      category: 'exterior',
      brand: 'LiftMaster',
      model: '8500W',
      installDate: 'May 2018',
      expectedLifespan: 15,
      currentAge: 7,
      condition: 'good',
      estimatedReplacementCost: 650,
      warrantyExpires: 'May 2023',
      lastServiceDate: 'June 2024',
      documents: [],
      maintenanceHistory: [
        { id: 'm1', date: 'Jun 10, 2024', type: 'maintenance', description: 'Lubrication and safety check', cost: 85, provider: 'Precision Door' }
      ],
      icon: Home
    }
  ];

  // All Documents (for global document view)
  const _allDocuments: Document[] = [
    {
      id: 'doc-1',
      name: 'Last Will and Testament - Bailey Family',
      type: 'PDF',
      category: 'legal',
      subcategory: 'will',
      uploadedDate: 'Mar 15, 2019',
      lastModified: 'Mar 15, 2019',
      status: 'needs-review',
      summary: 'Original signed will from 2019',
      versions: [
        { id: 'v1', version: 1, uploadedDate: 'Mar 15, 2019', uploadedBy: 'Adam Bailey', fileSize: '2.4 MB' }
      ],
      linkedTo: 'will-1',
      icon: FileText
    },
    {
      id: 'doc-2',
      name: 'State Farm Auto Policy Declaration',
      type: 'PDF',
      category: 'insurance',
      subcategory: 'auto',
      uploadedDate: 'Feb 1, 2025',
      lastModified: 'Feb 1, 2025',
      status: 'current',
      versions: [
        { id: 'v3', version: 3, uploadedDate: 'Feb 1, 2025', uploadedBy: 'System', fileSize: '1.8 MB', changes: 'Annual renewal - premium increased 3%' },
        { id: 'v2', version: 2, uploadedDate: 'Feb 1, 2024', uploadedBy: 'System', fileSize: '1.7 MB', changes: 'Added new vehicle (BMW X5)' },
        { id: 'v1', version: 1, uploadedDate: 'Feb 1, 2023', uploadedBy: 'Adam Bailey', fileSize: '1.5 MB' }
      ],
      linkedTo: 'auto-1',
      icon: FileText
    },
    {
      id: 'doc-3',
      name: 'Roof Warranty Certificate',
      type: 'PDF',
      category: 'home',
      subcategory: 'roof',
      uploadedDate: 'Aug 25, 2022',
      lastModified: 'Aug 25, 2022',
      status: 'current',
      summary: '30-year manufacturer warranty from GAF',
      versions: [
        { id: 'v1', version: 1, uploadedDate: 'Aug 25, 2022', uploadedBy: 'Adam Bailey', fileSize: '856 KB' }
      ],
      linkedTo: 'roof-1',
      icon: FileText
    },
    {
      id: 'doc-4',
      name: 'HVAC Installation Invoice',
      type: 'PDF',
      category: 'home',
      subcategory: 'hvac',
      uploadedDate: 'Jun 15, 2012',
      lastModified: 'Jun 15, 2012',
      status: 'current',
      versions: [
        { id: 'v1', version: 1, uploadedDate: 'Jun 15, 2012', uploadedBy: 'Adam Bailey', fileSize: '1.2 MB' }
      ],
      linkedTo: 'hvac-1',
      icon: FileText
    }
  ];

  // Tax Data
  interface TaxDocument {
    id: string;
    name: string;
    year: number;
    type: 'w2' | '1099' | 'return' | 'estimate' | 'receipt' | 'statement' | 'other';
    status: 'received' | 'pending' | 'filed' | 'uploaded';
    dueDate?: string;
    amount?: number;
    source?: string;
  }

  interface CharitableContribution {
    id: string;
    organization: string;
    date: string;
    amount: number;
    type: 'cash' | 'stock' | 'property' | 'goods';
    acknowledged: boolean;
    taxDeductible: boolean;
  }

  interface BusinessExpense {
    id: string;
    category: string;
    description: string;
    amount: number;
    date: string;
    deductible: boolean;
    receipt: boolean;
  }

  interface TaxRecommendation {
    id: string;
    title: string;
    description: string;
    potentialSavings?: number;
    priority: 'high' | 'medium' | 'low';
    deadline?: string;
  }

  interface TaxLawUpdate {
    id: string;
    title: string;
    effectiveDate: string;
    impact: 'positive' | 'negative' | 'neutral';
    summary: string;
    actionRequired: boolean;
  }

  const _taxDocuments: TaxDocument[] = [
    { id: 'td-1', name: 'W-2 - Primary Employment', year: 2025, type: 'w2', status: 'received', source: 'Acme Corp', amount: 285000 },
    { id: 'td-2', name: 'W-2 - Spouse Employment', year: 2025, type: 'w2', status: 'received', source: 'Metro Health', amount: 40000 },
    { id: 'td-3', name: '1099-INT - Bank Interest', year: 2025, type: '1099', status: 'received', source: 'Chase Bank', amount: 1250 },
    { id: 'td-4', name: '1099-DIV - Investment Dividends', year: 2025, type: '1099', status: 'received', source: 'Vanguard', amount: 8500 },
    { id: 'td-5', name: '1099-NEC - Consulting Income', year: 2025, type: '1099', status: 'received', source: 'Various Clients', amount: 45000 },
    { id: 'td-6', name: '1099-B - Stock Sales', year: 2025, type: '1099', status: 'pending', source: 'Fidelity' },
    { id: 'td-7', name: 'Mortgage Interest Statement', year: 2025, type: 'statement', status: 'received', source: 'Wells Fargo', amount: 18500 },
    { id: 'td-8', name: 'Property Tax Statement', year: 2025, type: 'statement', status: 'received', source: 'Scott County', amount: 8200 },
    { id: 'td-9', name: '2024 Federal Return', year: 2024, type: 'return', status: 'filed' },
    { id: 'td-10', name: '2024 State Return (MN)', year: 2024, type: 'return', status: 'filed' }
  ];

  const [_charitableContributions, _setCharitableContributions] = useState<CharitableContribution[]>([
    { id: 'cc-1', organization: 'United Way', date: 'Dec 15, 2025', amount: 5000, type: 'cash', acknowledged: true, taxDeductible: true },
    { id: 'cc-2', organization: 'St. Jude Children\'s Hospital', date: 'Nov 20, 2025', amount: 2500, type: 'cash', acknowledged: true, taxDeductible: true },
    { id: 'cc-3', organization: 'Local Food Shelf', date: 'Oct 5, 2025', amount: 1000, type: 'cash', acknowledged: true, taxDeductible: true },
    { id: 'cc-4', organization: 'Alma Mater University', date: 'Sep 1, 2025', amount: 10000, type: 'stock', acknowledged: true, taxDeductible: true },
    { id: 'cc-5', organization: 'Habitat for Humanity', date: 'Aug 15, 2025', amount: 500, type: 'goods', acknowledged: false, taxDeductible: true }
  ]);

  const [_businessExpenses, _setBusinessExpenses] = useState<BusinessExpense[]>([
    { id: 'be-1', category: 'Home Office', description: 'Dedicated office space (150 sq ft)', amount: 1800, date: '2025', deductible: true, receipt: true },
    { id: 'be-2', category: 'Software', description: 'Adobe Creative Suite, Zoom Pro', amount: 850, date: '2025', deductible: true, receipt: true },
    { id: 'be-3', category: 'Professional Development', description: 'Industry conference & courses', amount: 2200, date: '2025', deductible: true, receipt: true },
    { id: 'be-4', category: 'Equipment', description: 'Computer upgrade, monitor', amount: 1500, date: '2025', deductible: true, receipt: true },
    { id: 'be-5', category: 'Internet/Phone', description: 'Business portion (40%)', amount: 720, date: '2025', deductible: true, receipt: true },
    { id: 'be-6', category: 'Professional Services', description: 'Legal consultation, accounting', amount: 1200, date: '2025', deductible: true, receipt: true },
    { id: 'be-7', category: 'Travel', description: 'Client meetings, mileage', amount: 1850, date: '2025', deductible: true, receipt: true }
  ]);

  const _taxRecommendations: TaxRecommendation[] = [
    { id: 'tr-1', title: 'Maximize 401(k) Contributions', description: 'You contributed $20,500 in 2025. The limit is $23,000. Consider increasing to capture additional $2,500 in tax-deferred savings.', potentialSavings: 875, priority: 'high', deadline: 'Dec 31, 2026' },
    { id: 'tr-2', title: 'Consider Backdoor Roth IRA', description: 'Your income exceeds Roth IRA limits. A backdoor Roth conversion could provide tax-free growth.', potentialSavings: 0, priority: 'medium' },
    { id: 'tr-3', title: 'Harvest Investment Losses', description: 'You have $12,000 in unrealized losses that could offset gains and reduce tax liability.', potentialSavings: 2400, priority: 'high', deadline: 'Dec 31, 2026' },
    { id: 'tr-4', title: 'HSA Contribution Room', description: 'You contributed $5,000 to your HSA. Family limit is $8,300. Additional contributions reduce taxable income.', potentialSavings: 1155, priority: 'medium' },
    { id: 'tr-5', title: 'Bunch Charitable Contributions', description: 'Consider "bunching" 2 years of donations into one year to exceed standard deduction threshold.', potentialSavings: 1500, priority: 'low' },
    { id: 'tr-6', title: 'Review Estimated Tax Payments', description: 'Your consulting income requires quarterly estimates. Ensure Q1 2026 payment is adequate to avoid penalties.', priority: 'high', deadline: 'Apr 15, 2026' }
  ];

  const _taxLawUpdates: TaxLawUpdate[] = [
    { id: 'tl-1', title: 'SALT Deduction Cap Extended', effectiveDate: '2025', impact: 'negative', summary: 'The $10,000 cap on state and local tax (SALT) deductions continues through 2025. This affects your property tax and state income tax deductions.', actionRequired: false },
    { id: 'tl-2', title: 'Standard Deduction Increase', effectiveDate: '2025', impact: 'positive', summary: 'Standard deduction for married filing jointly increased to $29,200. Compare against your itemized deductions to optimize.', actionRequired: true },
    { id: 'tl-3', title: '1099-K Reporting Threshold', effectiveDate: '2025', impact: 'neutral', summary: 'Payment platforms must report transactions over $5,000 (down from $20,000). May receive additional 1099-K forms.', actionRequired: false },
    { id: 'tl-4', title: 'Clean Vehicle Tax Credit', effectiveDate: '2025', impact: 'positive', summary: 'If purchasing an electric vehicle, credits up to $7,500 are available. Your Tesla may have qualified for the used EV credit.', actionRequired: true }
  ];

  const _cpaTaxProfessional = {
    name: 'Michael Chen, CPA',
    firm: 'Chen & Associates Tax Advisors',
    phone: '(612) 555-3400',
    email: 'mchen@chentax.com',
    address: '2800 Southtown Dr, Suite 300, Bloomington, MN 55431',
    lastFiling: 'April 2025'
  };

  // Family & Life Administration Data
  interface FamilyMember {
    id: string;
    name: string;
    relationship: string;
    birthDate: string;
    age: number;
    milestones: Milestone[];
  }

  interface Milestone {
    id: string;
    title: string;
    date: string;
    type: 'past' | 'upcoming';
    category: 'education' | 'health' | 'legal' | 'financial' | 'life';
    triggersReview: string[];
    status?: 'completed' | 'pending' | 'action-needed';
  }

  interface CollegePlan {
    childName: string;
    targetYear: number;
    estimatedCost: number;
    currentSavings: number;
    monthlyContribution: number;
    accountType: string;
    onTrack: boolean;
  }

  const _familyMembers: FamilyMember[] = [
    {
      id: 'fm-1',
      name: 'Adam Bailey',
      relationship: 'Self',
      birthDate: 'May 15, 1981',
      age: 44,
      milestones: [
        { id: 'm1', title: '45th Birthday', date: 'May 15, 2026', type: 'upcoming', category: 'life', triggersReview: ['Life insurance review', 'Estate plan check'], status: 'pending' }
      ]
    },
    {
      id: 'fm-2',
      name: 'Sarah Bailey',
      relationship: 'Spouse',
      birthDate: 'Aug 22, 1983',
      age: 42,
      milestones: [
        { id: 'm2', title: 'Annual health screening', date: 'Mar 2026', type: 'upcoming', category: 'health', triggersReview: ['Health insurance benefits'], status: 'pending' }
      ]
    },
    {
      id: 'fm-3',
      name: 'Emma Bailey',
      relationship: 'Daughter',
      birthDate: 'Sep 10, 2013',
      age: 12,
      milestones: [
        { id: 'm3', title: 'Starting 7th Grade', date: 'Sep 2026', type: 'upcoming', category: 'education', triggersReview: ['School enrollment', 'Activity registrations'], status: 'pending' },
        { id: 'm4', title: 'Drivers permit eligible', date: 'Sep 2028', type: 'upcoming', category: 'life', triggersReview: ['Auto insurance update', 'Driving school'], status: 'pending' }
      ]
    },
    {
      id: 'fm-4',
      name: 'Jack Bailey',
      relationship: 'Son',
      birthDate: 'Mar 3, 2016',
      age: 9,
      milestones: [
        { id: 'm5', title: 'Starting 4th Grade', date: 'Sep 2026', type: 'upcoming', category: 'education', triggersReview: ['School enrollment'], status: 'pending' }
      ]
    }
  ];

  const _agingParents = [
    { name: 'Robert Bailey', relationship: 'Father', age: 72, location: 'Rochester, MN', healthStatus: 'Good', lastVisit: 'Jan 2026', notes: 'Annual checkup scheduled for March' },
    { name: 'Linda Bailey', relationship: 'Mother', age: 70, location: 'Rochester, MN', healthStatus: 'Good', lastVisit: 'Jan 2026', notes: 'Considering downsizing in 2-3 years' },
    { name: 'Margaret Thompson', relationship: 'Mother-in-law', age: 68, location: 'Minneapolis, MN', healthStatus: 'Fair', lastVisit: 'Dec 2025', notes: 'Managing arthritis, may need additional support' }
  ];

  const _collegePlans: CollegePlan[] = [
    { childName: 'Emma Bailey', targetYear: 2031, estimatedCost: 200000, currentSavings: 45000, monthlyContribution: 800, accountType: '529 Plan', onTrack: true },
    { childName: 'Jack Bailey', targetYear: 2034, estimatedCost: 220000, currentSavings: 28000, monthlyContribution: 600, accountType: '529 Plan', onTrack: true }
  ];

  const _upcomingLifeEvents = [
    { id: 'le-1', event: 'Emma turns 13', date: 'Sep 10, 2026', impact: 'Consider teen auto insurance rider', category: 'insurance' },
    { id: 'le-2', event: 'Adam turns 45', date: 'May 15, 2026', impact: 'Life insurance rate review, estate plan check', category: 'legal' },
    { id: 'le-3', event: 'Emma starts high school', date: 'Sep 2027', impact: 'College planning acceleration, extracurricular budget', category: 'financial' },
    { id: 'le-4', event: 'Emma gets drivers license', date: 'Sep 2029', impact: 'Auto insurance adjustment (+$1,200/yr est.)', category: 'insurance' },
    { id: 'le-5', event: 'Emma starts college', date: 'Aug 2031', impact: '529 distributions begin, health insurance decision', category: 'financial' }
  ];

  // Credit & Rewards Data
  interface CreditCard {
    id: string;
    name: string;
    issuer: string;
    type: 'cashback' | 'travel' | 'rewards' | 'business';
    annualFee: number;
    apr: number;
    creditLimit: number;
    currentBalance: number;
    rewardsRate: string;
    rewardsBalance: number;
    rewardsType: string;
    bestFor: string[];
    lastPayment: string;
    dueDate: string;
    status: 'active' | 'paid-off' | 'carrying-balance';
  }

  interface SpendingCategory {
    category: string;
    monthlyAvg: number;
    bestCard: string;
    currentCard: string;
    potentialRewards: number;
    actualRewards: number;
    optimized: boolean;
  }

  const _creditCards: CreditCard[] = [
    {
      id: 'cc-1',
      name: 'Sapphire Reserve',
      issuer: 'Chase',
      type: 'travel',
      annualFee: 550,
      apr: 22.49,
      creditLimit: 34000,
      currentBalance: 2847,
      rewardsRate: '3x travel, 3x dining, 1x other',
      rewardsBalance: 145000,
      rewardsType: 'Ultimate Rewards points',
      bestFor: ['Travel', 'Dining', 'Lyft/DoorDash'],
      lastPayment: 'Jan 28, 2026',
      dueDate: 'Feb 15, 2026',
      status: 'active'
    },
    {
      id: 'cc-2',
      name: 'Freedom Unlimited',
      issuer: 'Chase',
      type: 'cashback',
      annualFee: 0,
      apr: 20.49,
      creditLimit: 18000,
      currentBalance: 1250,
      rewardsRate: '1.5% everything, 3% dining/drugstore',
      rewardsBalance: 12500,
      rewardsType: 'Ultimate Rewards points',
      bestFor: ['Everyday spending', 'Drugstores'],
      lastPayment: 'Jan 25, 2026',
      dueDate: 'Feb 12, 2026',
      status: 'active'
    },
    {
      id: 'cc-3',
      name: 'Blue Cash Preferred',
      issuer: 'Amex',
      type: 'cashback',
      annualFee: 95,
      apr: 19.24,
      creditLimit: 25000,
      currentBalance: 890,
      rewardsRate: '6% groceries, 6% streaming, 3% gas',
      rewardsBalance: 342,
      rewardsType: 'Cash back ($)',
      bestFor: ['Groceries', 'Streaming services', 'Gas'],
      lastPayment: 'Jan 20, 2026',
      dueDate: 'Feb 8, 2026',
      status: 'active'
    },
    {
      id: 'cc-4',
      name: 'Ink Business Preferred',
      issuer: 'Chase',
      type: 'business',
      annualFee: 95,
      apr: 21.24,
      creditLimit: 20000,
      currentBalance: 0,
      rewardsRate: '3x travel, shipping, advertising, telecom',
      rewardsBalance: 48000,
      rewardsType: 'Ultimate Rewards points',
      bestFor: ['Business expenses', 'Advertising', 'Phone/Internet'],
      lastPayment: 'Jan 15, 2026',
      dueDate: 'Feb 5, 2026',
      status: 'paid-off'
    }
  ];

  const _spendingOptimization: SpendingCategory[] = [
    { category: 'Groceries', monthlyAvg: 1200, bestCard: 'Blue Cash Preferred', currentCard: 'Blue Cash Preferred', potentialRewards: 72, actualRewards: 72, optimized: true },
    { category: 'Dining', monthlyAvg: 600, bestCard: 'Sapphire Reserve', currentCard: 'Sapphire Reserve', potentialRewards: 54, actualRewards: 54, optimized: true },
    { category: 'Gas', monthlyAvg: 350, bestCard: 'Blue Cash Preferred', currentCard: 'Freedom Unlimited', potentialRewards: 21, actualRewards: 5.25, optimized: false },
    { category: 'Travel', monthlyAvg: 400, bestCard: 'Sapphire Reserve', currentCard: 'Sapphire Reserve', potentialRewards: 36, actualRewards: 36, optimized: true },
    { category: 'Online Shopping', monthlyAvg: 800, bestCard: 'Freedom Unlimited', currentCard: 'Various', potentialRewards: 12, actualRewards: 8, optimized: false },
    { category: 'Subscriptions', monthlyAvg: 250, bestCard: 'Blue Cash Preferred', currentCard: 'Sapphire Reserve', potentialRewards: 15, actualRewards: 2.50, optimized: false }
  ];

  const _creditRecommendations = [
    { id: 'cr-1', title: 'Use Blue Cash Preferred for Gas', description: 'Switch gas purchases from Freedom to Blue Cash for 6% vs 1.5% back', monthlySavings: 15.75, priority: 'high' },
    { id: 'cr-2', title: 'Consolidate Online Shopping', description: 'Use Freedom Unlimited for all online purchases to maximize 1.5% cashback', monthlySavings: 4, priority: 'medium' },
    { id: 'cr-3', title: 'Move Streaming to Blue Cash', description: 'Transfer streaming services to Blue Cash Preferred for 6% vs 1%', monthlySavings: 12.50, priority: 'medium' },
    { id: 'cr-4', title: 'Redeem Points Before Devaluation', description: 'Chase points historically devalue. Consider booking travel or transferring to partners.', priority: 'low' }
  ];

  // Finances & Budget Data
  interface BudgetCategory {
    category: string;
    icon: LucideIcon;
    budgeted: number;
    actual: number;
    color: string;
  }

  const _monthlyBudget: BudgetCategory[] = [
    { category: 'Housing', icon: Home, budgeted: 3500, actual: 3450, color: '#C9A24D' },
    { category: 'Transportation', icon: Car, budgeted: 800, actual: 920, color: '#6366F1' },
    { category: 'Groceries', icon: ShoppingCart, budgeted: 1200, actual: 1180, color: '#10B981' },
    { category: 'Dining', icon: Utensils, budgeted: 600, actual: 720, color: '#F59E0B' },
    { category: 'Utilities', icon: Zap, budgeted: 400, actual: 385, color: '#8B5CF6' },
    { category: 'Insurance', icon: Shield, budgeted: 650, actual: 650, color: '#EC4899' },
    { category: 'Healthcare', icon: Heart, budgeted: 300, actual: 275, color: '#EF4444' },
    { category: 'Entertainment', icon: Tv, budgeted: 400, actual: 480, color: '#06B6D4' },
    { category: 'Savings', icon: PiggyBank, budgeted: 3000, actual: 3000, color: '#22C55E' },
    { category: 'Other', icon: DollarSign, budgeted: 500, actual: 540, color: '#64748B' }
  ];

  const _financialSummary = {
    monthlyIncome: 27083, // $325k / 12
    totalBudgeted: 11350,
    totalActual: 11600,
    savingsRate: 26, // percentage
    emergencyFund: 45000,
    emergencyFundTarget: 50000,
    monthsOfExpenses: 3.9
  };

  const _upcomingObligations = [
    { id: 'ob-1', description: 'Q1 Estimated Tax Payment', amount: 12500, dueDate: 'Apr 15, 2026', type: 'tax' },
    { id: 'ob-2', description: 'Property Tax (1st half)', amount: 4100, dueDate: 'May 15, 2026', type: 'tax' },
    { id: 'ob-3', description: 'Emma Summer Camp Deposit', amount: 1500, dueDate: 'Mar 1, 2026', type: 'family' },
    { id: 'ob-4', description: 'Annual Life Insurance Premium', amount: 1020, dueDate: 'Dec 1, 2026', type: 'insurance' },
    { id: 'ob-5', description: 'Car Registration Renewal', amount: 450, dueDate: 'Jun 30, 2026', type: 'auto' }
  ];

  const _financialRecommendations = [
    { id: 'fr-1', title: 'Top off Emergency Fund', description: 'Add $5,000 to reach 4-month expense target', priority: 'medium' },
    { id: 'fr-2', title: 'Review Dining Budget', description: 'Consistently over budget by 20%. Consider adjusting to $700/month.', priority: 'low' },
    { id: 'fr-3', title: 'Entertainment Overspend', description: 'Over budget 3 of last 4 months. Review subscriptions.', priority: 'low' }
  ];

  // Insurance Policies Data
  const _insurancePolicies: InsurancePolicy[] = [
    {
      id: 'home-1',
      type: 'home',
      name: 'Homeowners Insurance',
      carrier: 'State Farm',
      policyNumber: 'HO-2847591',
      premium: 2400,
      premiumFrequency: 'annual',
      deductible: 1000,
      coverage: '$750,000 dwelling',
      renewalDate: 'Jun 15, 2026',
      status: 'active',
      icon: Building,
      details: {
        'Dwelling Coverage': '$750,000',
        'Personal Property': '$375,000',
        'Liability': '$300,000',
        'Medical Payments': '$5,000',
        'Loss of Use': '$150,000'
      },
      recommendations: ['Consider increasing liability to $500K given net worth']
    },
    {
      id: 'auto-1',
      type: 'auto',
      name: 'Auto Insurance',
      carrier: 'State Farm',
      policyNumber: 'AU-9384756',
      premium: 2400,
      premiumFrequency: 'annual',
      deductible: 250,
      coverage: '100/300/100',
      renewalDate: 'Feb 2, 2026',
      status: 'expiring-soon',
      icon: Car,
      details: {
        'Bodily Injury': '$100,000/$300,000',
        'Property Damage': '$100,000',
        'Collision Deductible': '$250',
        'Comprehensive Deductible': '$250',
        'Uninsured Motorist': '$100,000/$300,000',
        'Vehicles Covered': '2021 Tesla Model Y, 2023 BMW X5'
      },
      recommendations: [
        'Increase deductible to $500 to save ~$240/year',
        'Shop competing carriers - potential savings of $450/year',
        'Bundle with home for additional 10% discount'
      ]
    },
    {
      id: 'umbrella-1',
      type: 'umbrella',
      name: 'Umbrella Policy',
      carrier: 'State Farm',
      policyNumber: 'UM-1928374',
      premium: 350,
      premiumFrequency: 'annual',
      deductible: 0,
      coverage: '$1,000,000',
      renewalDate: 'Jun 15, 2026',
      status: 'action-needed',
      icon: Umbrella,
      details: {
        'Coverage Limit': '$1,000,000',
        'Underlying Auto Required': '$300,000 liability',
        'Underlying Home Required': '$300,000 liability'
      },
      recommendations: [
        'URGENT: Increase to $2M-$3M to match net worth of $2.8M',
        'Current coverage leaves $1.8M+ exposed in worst-case scenario'
      ]
    },
    {
      id: 'life-1',
      type: 'life',
      name: 'Term Life Insurance',
      carrier: 'Northwestern Mutual',
      policyNumber: 'LF-7462951',
      premium: 85,
      premiumFrequency: 'monthly',
      deductible: 0,
      coverage: '$1,500,000',
      renewalDate: 'Dec 1, 2035',
      status: 'active',
      icon: Heart,
      details: {
        'Death Benefit': '$1,500,000',
        'Term Length': '20 years',
        'Term Expires': 'December 2035',
        'Insured': 'Adam Bailey',
        'Beneficiary': 'Sarah Bailey (spouse)'
      }
    },
    {
      id: 'life-2',
      type: 'life',
      name: 'Term Life Insurance (Spouse)',
      carrier: 'Northwestern Mutual',
      policyNumber: 'LF-7462952',
      premium: 65,
      premiumFrequency: 'monthly',
      deductible: 0,
      coverage: '$750,000',
      renewalDate: 'Dec 1, 2035',
      status: 'active',
      icon: Heart,
      details: {
        'Death Benefit': '$750,000',
        'Term Length': '20 years',
        'Term Expires': 'December 2035',
        'Insured': 'Sarah Bailey',
        'Beneficiary': 'Adam Bailey (spouse)'
      }
    }
  ];

  const priorities: Priority[] = [
    {
      id: 1,
      title: 'Auto Insurance Renewal Due',
      category: 'Insurance',
      impact: 'High',
      urgency: 'Due in 12 days',
      description: 'Your auto insurance policy renews on Feb 2. Review coverage and compare rates.',
      potentialSavings: '$450/year',
      icon: Shield,
      rationale: "Your State Farm auto insurance is set to renew on February 2, 2026. You're paying $2,400/year, about 18% above market average.",
      recommendations: [
        { title: 'Increase Deductible', savings: 240, description: 'Increase deductible from $250 to $500', impact: 'Your $15K emergency fund easily covers $500. Saves $240/year.' },
        { title: 'Shop Competing Carriers', savings: 450, description: 'Get quotes from Progressive, Geico, Liberty Mutual', impact: 'Could save $450/year with identical coverage.' }
      ]
    },
    {
      id: 2,
      title: 'Update Estate Documents',
      category: 'Legal',
      impact: 'Critical',
      urgency: 'Overdue',
      description: 'Your will and healthcare directive are 6 years old.',
      icon: FileText,
      rationale: "Your will was created in 2019. Since then: income up 65%, net worth at $2.8M, children now 9 and 12.",
      recommendations: [
        { title: 'Establish Living Trust', description: 'With $2.8M net worth, a trust avoids probate', impact: 'Saves $15K-$40K in estate costs, maintains privacy' }
      ]
    },
    {
      id: 3,
      title: 'HVAC System Aging',
      category: 'Home',
      impact: 'Medium',
      urgency: 'Plan within 18 months',
      description: 'Your HVAC is 14 years old. Expected lifespan: 15-20 years.',
      estimatedCost: '$8,500',
      icon: Wrench,
      rationale: "System is 14 years old, approaching end of life. Plan now to avoid emergency replacement.",
      recommendations: [
        { title: 'Start Replacement Fund', description: 'Save $450/month for 18 months', impact: 'Eliminates financing costs (~$800 saved)' }
      ]
    },
    {
      id: 4,
      title: 'Review Umbrella Coverage',
      category: 'Insurance',
      impact: 'Medium',
      urgency: 'Review this quarter',
      description: 'Your income has doubled since last umbrella review.',
      icon: Shield,
      rationale: "With $2.8M net worth and $325K income, your current $1M umbrella may be insufficient.",
      recommendations: [
        { title: 'Increase to $2M Coverage', description: 'Match coverage to net worth', impact: 'Additional ~$150/year for significant protection increase.' }
      ]
    }
  ];

  const _timelineEvents: TimelineEvent[] = [
    { id: 1, date: 'Feb 2, 2026', title: 'Auto Insurance Renewal', category: 'Insurance', type: 'upcoming', icon: Shield, status: 'warning' },
    { id: 2, date: 'Feb 15, 2026', title: 'Q1 Estimated Tax Payment Due', category: 'Taxes', type: 'upcoming', icon: Calendar, status: 'info' },
    { id: 3, date: 'Mar 1, 2026', title: 'Home Insurance Renewal', category: 'Insurance', type: 'upcoming', icon: Shield, status: 'info' },
    { id: 4, date: 'Apr 15, 2026', title: 'Tax Filing Deadline', category: 'Taxes', type: 'upcoming', icon: Calendar, status: 'warning' },
    { id: 5, date: 'Jun 30, 2026', title: 'HSA Contribution Review', category: 'Healthcare', type: 'upcoming', icon: Heart, status: 'info' },
    { id: 6, date: 'Jan 15, 2026', title: 'Q4 Estimated Taxes Paid', category: 'Taxes', type: 'past', icon: Calendar, status: 'success' },
    { id: 7, date: 'Jan 10, 2026', title: 'Annual Financial Review Completed', category: 'Advisory', type: 'past', icon: TrendingUp, status: 'success' },
    { id: 8, date: 'Dec 20, 2025', title: 'Emergency Contacts Updated', category: 'Family', type: 'past', icon: Users, status: 'success' },
    { id: 9, date: 'Dec 1, 2025', title: 'Life Insurance Premium Paid', category: 'Insurance', type: 'past', icon: Shield, status: 'success' }
  ];

  const householdSections: HouseholdSection[] = [
    { id: 'insurance', icon: Shield, title: 'Insurance', score: 6.5, status: 'needs-attention', summary: 'You have 5 active policies with annual premiums of $5,850. Auto renewal is due in 12 days.', keyMetrics: [], items: [] },
    { id: 'legal', icon: FileText, title: 'Legal', score: 4.0, status: 'critical', summary: 'Your estate documents are 6 years old. With $2.8M net worth, you should have a revocable living trust in place.', keyMetrics: [], items: [] },
    { id: 'home', icon: Wrench, title: 'Home', score: 7.5, status: 'good', summary: 'Most systems are in good condition. HVAC is 14 years old and approaching replacement.', keyMetrics: [], items: [] },
    { id: 'finances', icon: Wallet, title: 'Finances', score: 8.0, status: 'good', summary: 'Budget tracking on target. 26% savings rate. Emergency fund at 3.9 months.', keyMetrics: [], items: [] },
    { id: 'taxes', icon: Calendar, title: 'Taxes', score: 7.5, status: 'good', summary: 'Working with CPA for annual filing. Estimated quarterly payments current.', keyMetrics: [], items: [] },
    { id: 'family', icon: Users, title: 'Family', score: 8.5, status: 'good', summary: 'School registrations current for both children. College savings on track.', keyMetrics: [], items: [] },
    { id: 'credit', icon: CreditCard, title: 'Credit', score: 7.0, status: 'good', summary: '4 credit cards optimized. 5% utilization. $32K+ in rewards value.', keyMetrics: [], items: [] }
  ];

  // ── Live Data: User Identity ──────────────────────────────────────────────
  const firstName: string = data?.profile?.primary_first_name ?? activePersona.name.split(' ')[0];
  const lastName: string = data?.profile?.primary_last_name ?? (activePersona.name.split(' ')[1] ?? '');
  const userInitials: string = firstName && lastName
    ? `${firstName[0]}${lastName[0]}`.toUpperCase()
    : firstName ? firstName[0].toUpperCase() : activePersona.initials;
  const displayName: string = firstName ? `${firstName} ${lastName}`.trim() : activePersona.name;

  // ── Live Data: Priority Actions from Supabase ─────────────────────────────
  const categoryIconMap: Record<string, LucideIcon> = {
    'Insurance': Shield, 'Legal': FileText, 'Home': Wrench,
    'Finances': Wallet, 'Taxes': Calendar, 'Family': Users,
    'Credit': CreditCard
  };
  const livePriorities: Priority[] = (data?.priorityActions ?? [])
    .filter((a: any) => a.status !== 'dismissed' && a.status !== 'completed')
    .map((action: any, idx: number) => ({
      id: idx + 1,
      title: action.title ?? 'Action Required',
      category: action.category ?? 'General',
      impact: action.severity
        ? ((action.severity.charAt(0).toUpperCase() + action.severity.slice(1)) as Priority['impact'])
        : ('Medium' as Priority['impact']),
      urgency: action.due_date ? `Due ${action.due_date}` : 'Review needed',
      description: action.description ?? '',
      potentialSavings: action.potential_savings ?? undefined,
      estimatedCost: action.estimated_cost ?? undefined,
      icon: categoryIconMap[action.category ?? ''] ?? AlertTriangle,
      rationale: action.description ?? '',
      recommendations: []
    }));
  // Use DB priority actions when available, fall back to hardcoded demo data
  const activePrioritiesSource: Priority[] = livePriorities.length > 0 ? livePriorities : priorities;

  // ── Live Data: Section Scores from Supabase ───────────────────────────────
  const liveSections: HouseholdSection[] = householdSections.map(section => {
    const dbScore = (data?.sectionScores ?? []).find((s: any) => s.section === section.id);
    if (!dbScore) return section;
    const rawScore = typeof dbScore.score === 'number' ? dbScore.score : parseFloat(dbScore.score) || 0;
    // DB stores 0-100, display as 0-10
    const displayScore = rawScore > 10 ? Math.round((rawScore / 10) * 10) / 10 : rawScore;
    return { ...section, score: displayScore };
  });

  // ── Live Data: Health Score ───────────────────────────────────────────────
  const liveHealthScore: number = data?.household?.health_score ?? activePersona.score;

  const getScoreColor = (score: number): string => {
    if (score >= 8) return 'text-green-500';
    if (score >= 6) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getScoreRingColor = (score: number): string => {
    if (score >= 8) return 'border-green-500';
    if (score >= 6) return 'border-yellow-500';
    return 'border-red-500';
  };

  const _getConditionColor = (condition: string): string => {
    switch (condition) {
      case 'excellent': return 'text-green-600 bg-green-100';
      case 'good': return 'text-blue-600 bg-blue-100';
      case 'fair': return 'text-yellow-600 bg-yellow-100';
      case 'poor': return 'text-orange-600 bg-orange-100';
      case 'replace-soon': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const _getStatusColor = (status: string): string => {
    switch (status) {
      case 'current': return 'text-green-600 bg-green-100';
      case 'needs-review': return 'text-yellow-600 bg-yellow-100';
      case 'outdated': return 'text-orange-600 bg-orange-100';
      case 'not-established': return 'text-red-600 bg-red-100';
      case 'expired': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  // ── Weekly Command Brief Modal ────────────────────────────────────────────
  const WeeklyBriefModal: React.FC = () => {
    const sections = [
      {
        id: 'risk',
        label: 'Risk',
        icon: AlertTriangle,
        color: 'text-red-600',
        bg: 'bg-red-50',
        border: 'border-red-200',
        iconBg: 'bg-red-100',
        headline: '2 risks need action this week',
        summary: 'Your umbrella policy has a $500K gap relative to your net worth, and your auto policy renewal in 18 days has a 12% premium increase flagged.',
        why: 'An umbrella gap at your net worth level ($2.8M) exposes personal assets directly to liability claims exceeding home/auto limits. The auto renewal increase can typically be negotiated or shopped — waiting past renewal locks you in for another year.',
      },
      {
        id: 'leakage',
        label: 'Leakage',
        icon: TrendingDown,
        color: 'text-orange-600',
        bg: 'bg-orange-50',
        border: 'border-orange-200',
        iconBg: 'bg-orange-100',
        headline: '$2,655 in recoverable money identified',
        summary: 'You have $875 in uncaptured 401(k) tax savings, $2,400 from harvestable investment losses, and an HSA contribution gap of $3,300 ($1,155 in tax savings).',
        why: 'These aren\'t hypothetical — they\'re based on your actual numbers. The 401(k) gap and HSA room both have hard year-end deadlines. Investment loss harvesting requires selling before Dec 31 to offset 2025 gains.',
      },
      {
        id: 'action',
        label: 'Recommended Action',
        icon: Zap,
        color: 'text-yellow-700',
        bg: 'bg-yellow-50',
        border: 'border-yellow-200',
        iconBg: 'bg-yellow-100',
        headline: 'Call your CPA before April 15',
        summary: 'With Q1 estimated taxes due April 15 and your consulting income up this year, your current withholding may result in an underpayment penalty. One 20-minute call with Michael Chen can confirm your exposure.',
        why: 'The IRS underpayment penalty is currently 8% annualized. Given your 1099 consulting income of $45K this year, a shortfall of even $5K in estimated taxes creates a ~$200 penalty — avoidable with a quick check.',
      },
    ];

    return (
      <div className="fixed inset-0 bg-black/60 flex items-start justify-center z-50 p-4 pt-12 overflow-y-auto">
        <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl mb-12">
          {/* Header */}
          <div className="px-6 pt-6 pb-5 border-b border-gray-100">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-6 h-6 rounded flex items-center justify-center" style={{ backgroundColor: '#C9A24D' }}>
                    <Zap className="w-3.5 h-3.5 text-white" />
                  </div>
                  <span className="text-xs font-semibold uppercase tracking-widest text-gray-400">Weekly Command Brief</span>
                </div>
                <h2 className="text-xl font-bold text-gray-900">Week of Feb 23, 2026</h2>
                <p className="text-sm text-gray-500 mt-0.5">3 things that need your attention</p>
              </div>
              <button onClick={dismissWeeklyBrief} className="p-2 hover:bg-gray-100 rounded-lg transition-colors mt-0.5">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
          </div>

          {/* Sections */}
          <div className="divide-y divide-gray-100">
            {sections.map(section => {
              const Icon = section.icon;
              const isOpen = briefExpanded[section.id];
              return (
                <div key={section.id} className={`transition-colors ${isOpen ? section.bg : ''}`}>
                  <div className="px-6 py-4">
                    <div className="flex items-start gap-3">
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${section.iconBg}`}>
                        <Icon className={`w-4.5 h-4.5 ${section.color}`} style={{ width: '18px', height: '18px' }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className={`text-xs font-semibold uppercase tracking-wider ${section.color}`}>{section.label}</span>
                        </div>
                        <p className="font-semibold text-gray-900 text-sm leading-snug">{section.headline}</p>
                        <p className="text-sm text-gray-600 mt-1 leading-relaxed">{section.summary}</p>
                        <button
                          onClick={() => setBriefExpanded(prev => ({ ...prev, [section.id]: !prev[section.id] }))}
                          className={`flex items-center gap-1 mt-2 text-xs font-medium transition-colors ${section.color} hover:opacity-70`}
                        >
                          {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          {isOpen ? 'Less detail' : 'Why this matters'}
                        </button>
                        {isOpen && (
                          <div className={`mt-3 p-3 rounded-lg border text-sm text-gray-700 leading-relaxed ${section.border} ${section.bg}`}>
                            {section.why}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
            <p className="text-xs text-gray-400">Returns automatically next week</p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => { dismissWeeklyBrief(); setActiveView('dashboard'); }}
                className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                View Dashboard
              </button>
              <button
                onClick={dismissWeeklyBrief}
                className="px-4 py-2 rounded-lg text-sm font-medium text-white hover:opacity-90 transition-opacity"
                style={{ backgroundColor: '#C9A24D' }}
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ── Dev Persona Switcher ──────────────────────────────────────────────────
  const DevPersonaSwitcher: React.FC = () => (
    <div className="fixed bottom-5 left-5 z-40">
      {showDevSwitcher && (
        <div className="mb-2 bg-gray-900 rounded-xl shadow-2xl overflow-hidden w-72 border border-gray-700">
          <div className="px-4 py-3 border-b border-gray-700">
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">Dev — Persona Switcher</p>
          </div>
          <div className="divide-y divide-gray-800">
            {devPersonas.map(persona => (
              <button
                key={persona.id}
                onClick={() => { setActivePersona(persona); setShowDevSwitcher(false); }}
                className={`w-full px-4 py-3 text-left transition-colors hover:bg-gray-800 flex items-start gap-3 ${activePersona.id === persona.id ? 'bg-gray-800' : ''}`}
              >
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0 mt-0.5"
                  style={{ backgroundColor: activePersona.id === persona.id ? '#C9A24D' : '#374151' }}>
                  {persona.initials}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-white">{persona.name}</p>
                    {activePersona.id === persona.id && (
                      <span className="text-xs px-1.5 py-0.5 rounded text-white font-medium" style={{ backgroundColor: '#C9A24D' }}>Active</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">{persona.hhi} HHI · {persona.netWorth} NW · Score {persona.score}</p>
                  <p className="text-xs text-gray-500 mt-0.5 leading-snug">{persona.description}</p>
                </div>
              </button>
            ))}
          </div>
          <div className="px-4 py-2 bg-gray-950">
            <p className="text-xs text-gray-600">Data stays as Adam Bailey — persona affects name & score display only</p>
          </div>
        </div>
      )}
      <button
        onClick={() => setShowDevSwitcher(prev => !prev)}
        className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold shadow-lg border transition-all ${showDevSwitcher ? 'bg-gray-900 text-white border-gray-700' : 'bg-gray-900 text-gray-300 border-gray-700 hover:border-gray-500'}`}
      >
        <div className="w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-bold"
          style={{ backgroundColor: '#C9A24D', fontSize: '9px' }}>
          {activePersona.initials}
        </div>
        <span>{activePersona.name}</span>
        <span className="text-gray-500">·</span>
        <span className="text-gray-400">DEV</span>
        {showDevSwitcher ? <ChevronDown className="w-3 h-3 text-gray-400" /> : <ChevronUp className="w-3 h-3 text-gray-400" />}
      </button>
    </div>
  );

  // ── Tax: Add Charitable Contribution Modal ───────────────────────────────
  const AddContributionModal: React.FC = () => {
    const [form, setForm] = useState({ organization: '', date: '', amount: '', type: 'cash' as CharitableContribution['type'], acknowledged: false });
    const [error, setError] = useState('');

    const handleSubmit = () => {
      if (!form.organization.trim() || !form.date || !form.amount) { setError('Please fill in all required fields.'); return; }
      const newItem: CharitableContribution = {
        id: 'cc-' + Date.now(),
        organization: form.organization.trim(),
        date: form.date,
        amount: parseFloat(form.amount),
        type: form.type,
        acknowledged: form.acknowledged,
        taxDeductible: true
      };
      setCharitableContributions(prev => [newItem, ...prev]);
      setShowAddContribution(false);
    };

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl max-w-lg w-full shadow-xl">
          <div className="p-6 border-b border-gray-200 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Add Charitable Contribution</h2>
              <p className="text-sm text-gray-500 mt-0.5">Tax Year 2025</p>
            </div>
            <button onClick={() => setShowAddContribution(false)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
          <div className="p-6 space-y-4">
            {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Organization <span className="text-red-500">*</span></label>
              <input
                type="text" placeholder="e.g. Red Cross"
                value={form.organization}
                onChange={e => setForm(f => ({ ...f, organization: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:border-transparent"
                style={{ ['--tw-ring-color' as any]: '#C9A24D' }}
                onFocus={e => e.target.style.borderColor = '#C9A24D'}
                onBlur={e => e.target.style.borderColor = ''}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date <span className="text-red-500">*</span></label>
                <input
                  type="date"
                  value={form.date}
                  onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none"
                  onFocus={e => e.target.style.borderColor = '#C9A24D'}
                  onBlur={e => e.target.style.borderColor = ''}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount ($) <span className="text-red-500">*</span></label>
                <input
                  type="number" min="0" step="0.01" placeholder="0.00"
                  value={form.amount}
                  onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none"
                  onFocus={e => e.target.style.borderColor = '#C9A24D'}
                  onBlur={e => e.target.style.borderColor = ''}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contribution Type</label>
              <div className="grid grid-cols-4 gap-2">
                {(['cash', 'stock', 'property', 'goods'] as const).map(t => (
                  <button
                    key={t}
                    onClick={() => setForm(f => ({ ...f, type: t }))}
                    className={`py-2 text-sm font-medium rounded-lg border capitalize transition-colors ${form.type === t ? 'text-white border-transparent' : 'border-gray-200 text-gray-700 hover:bg-gray-50'}`}
                    style={form.type === t ? { backgroundColor: '#C9A24D', borderColor: '#C9A24D' } : {}}
                  >{t}</button>
                ))}
              </div>
            </div>
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={form.acknowledged}
                onChange={e => setForm(f => ({ ...f, acknowledged: e.target.checked }))}
                className="w-4 h-4 rounded"
              />
              <span className="text-sm text-gray-700">Acknowledgment / receipt received from organization</span>
            </label>
          </div>
          <div className="p-6 border-t border-gray-100 flex gap-3 justify-end">
            <button onClick={() => setShowAddContribution(false)} className="px-4 py-2 rounded-lg border border-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-50">Cancel</button>
            <button onClick={handleSubmit} className="px-4 py-2 rounded-lg text-white text-sm font-medium hover:opacity-90 transition-opacity" style={{ backgroundColor: '#C9A24D' }}>Add Contribution</button>
          </div>
        </div>
      </div>
    );
  };

  // ── Tax: Add Business Expense Modal ─────────────────────────────────────
  const AddExpenseModal: React.FC = () => {
    const expenseCategories = ['Home Office', 'Software', 'Equipment', 'Travel', 'Professional Development', 'Professional Services', 'Internet/Phone', 'Marketing', 'Meals & Entertainment', 'Other'];
    const [form, setForm] = useState({ category: 'Software', description: '', amount: '', date: '', receipt: false });
    const [error, setError] = useState('');

    const handleSubmit = () => {
      if (!form.description.trim() || !form.amount || !form.date) { setError('Please fill in all required fields.'); return; }
      const newItem: BusinessExpense = {
        id: 'be-' + Date.now(),
        category: form.category,
        description: form.description.trim(),
        amount: parseFloat(form.amount),
        date: form.date,
        deductible: true,
        receipt: form.receipt
      };
      setBusinessExpenses(prev => [newItem, ...prev]);
      setShowAddExpense(false);
    };

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl max-w-lg w-full shadow-xl">
          <div className="p-6 border-b border-gray-200 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Add Business Expense</h2>
              <p className="text-sm text-gray-500 mt-0.5">Schedule C / 1099 Deductions</p>
            </div>
            <button onClick={() => setShowAddExpense(false)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
          <div className="p-6 space-y-4">
            {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select
                value={form.category}
                onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none bg-white"
                onFocus={e => e.target.style.borderColor = '#C9A24D'}
                onBlur={e => e.target.style.borderColor = ''}
              >
                {expenseCategories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description <span className="text-red-500">*</span></label>
              <input
                type="text" placeholder="Brief description of the expense"
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none"
                onFocus={e => e.target.style.borderColor = '#C9A24D'}
                onBlur={e => e.target.style.borderColor = ''}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount ($) <span className="text-red-500">*</span></label>
                <input
                  type="number" min="0" step="0.01" placeholder="0.00"
                  value={form.amount}
                  onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none"
                  onFocus={e => e.target.style.borderColor = '#C9A24D'}
                  onBlur={e => e.target.style.borderColor = ''}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date / Period <span className="text-red-500">*</span></label>
                <input
                  type="text" placeholder="e.g. 2025 or Mar 2025"
                  value={form.date}
                  onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none"
                  onFocus={e => e.target.style.borderColor = '#C9A24D'}
                  onBlur={e => e.target.style.borderColor = ''}
                />
              </div>
            </div>
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={form.receipt}
                onChange={e => setForm(f => ({ ...f, receipt: e.target.checked }))}
                className="w-4 h-4 rounded"
              />
              <span className="text-sm text-gray-700">Receipt / documentation on file</span>
            </label>
          </div>
          <div className="p-6 border-t border-gray-100 flex gap-3 justify-end">
            <button onClick={() => setShowAddExpense(false)} className="px-4 py-2 rounded-lg border border-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-50">Cancel</button>
            <button onClick={handleSubmit} className="px-4 py-2 rounded-lg text-white text-sm font-medium hover:opacity-90 transition-opacity" style={{ backgroundColor: '#C9A24D' }}>Add Expense</button>
          </div>
        </div>
      </div>
    );
  };

  // ── Tax: Upload Document Modal (Contributions or Expenses) ───────────────
  const UploadTaxDocModal: React.FC = () => {
    const isContrib = showUploadTaxDoc === 'contributions';
    const [fileName, setFileName] = useState('');
    const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());

    const mockParsedContributions = [
      { organization: 'American Red Cross', date: 'Jan 15, 2025', amount: 750, type: 'cash', acknowledged: true },
      { organization: 'Doctors Without Borders', date: 'Mar 8, 2025', amount: 1200, type: 'cash', acknowledged: true },
      { organization: 'Local Community Foundation', date: 'Jun 22, 2025', amount: 500, type: 'cash', acknowledged: false },
    ];
    const mockParsedExpenses = [
      { category: 'Software', description: 'Figma annual subscription', amount: 144, date: 'Jan 2025', receipt: true },
      { category: 'Travel', description: 'Flight to Chicago client meeting', amount: 380, date: 'Feb 2025', receipt: true },
      { category: 'Meals & Entertainment', description: 'Client dinner, 3 attendees', amount: 210, date: 'Feb 2025', receipt: false },
    ];
    const mockItems = isContrib ? mockParsedContributions : mockParsedExpenses;

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setFileName(file.name);
      setUploadParseStatus('parsing');
      setTimeout(() => {
        setUploadParseStatus('done');
        setParsedUploadItems(mockItems);
        setSelectedItems(new Set(mockItems.map((_, i) => i)));
      }, 1800);
    };

    const toggleItem = (idx: number) => {
      setSelectedItems(prev => {
        const next = new Set(prev);
        next.has(idx) ? next.delete(idx) : next.add(idx);
        return next;
      });
    };

    const handleImport = () => {
      if (isContrib) {
        const toAdd: CharitableContribution[] = [...selectedItems].map(i => ({
          id: 'cc-' + Date.now() + '-' + i,
          ...mockParsedContributions[i],
          type: mockParsedContributions[i].type as CharitableContribution['type'],
          taxDeductible: true
        }));
        setCharitableContributions(prev => [...toAdd, ...prev]);
      } else {
        const toAdd: BusinessExpense[] = [...selectedItems].map(i => ({
          id: 'be-' + Date.now() + '-' + i,
          ...mockParsedExpenses[i],
          deductible: true
        }));
        setBusinessExpenses(prev => [...toAdd, ...prev]);
      }
      setShowUploadTaxDoc(null);
      setUploadParseStatus('idle');
      setParsedUploadItems([]);
    };

    const handleClose = () => {
      setShowUploadTaxDoc(null);
      setUploadParseStatus('idle');
      setParsedUploadItems([]);
    };

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl max-w-xl w-full shadow-xl">
          <div className="p-6 border-b border-gray-200 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Upload {isContrib ? 'Contribution' : 'Expense'} Document</h2>
              <p className="text-sm text-gray-500 mt-0.5">{isContrib ? 'Import multiple donations from a statement or export' : 'Import multiple expenses from a receipt log or statement'}</p>
            </div>
            <button onClick={handleClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          <div className="p-6 space-y-5">
            {/* Drop Zone */}
            {uploadParseStatus === 'idle' && (
              <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-xl p-10 text-center hover:border-yellow-400 transition-colors cursor-pointer">
                <Upload className="w-10 h-10 text-gray-300 mb-3" />
                <p className="font-medium text-gray-700 mb-1">Drop your file here or click to browse</p>
                <p className="text-sm text-gray-400">PDF, CSV, XLS — up to 25MB</p>
                <input type="file" accept=".pdf,.csv,.xls,.xlsx" className="hidden" onChange={handleFileChange} />
              </label>
            )}

            {/* Parsing animation */}
            {uploadParseStatus === 'parsing' && (
              <div className="flex flex-col items-center justify-center py-10 gap-4">
                <div className="w-12 h-12 rounded-full border-4 border-gray-200 border-t-yellow-500 animate-spin" style={{ borderTopColor: '#C9A24D' }} />
                <div className="text-center">
                  <p className="font-medium text-gray-800">Analyzing {fileName}…</p>
                  <p className="text-sm text-gray-500 mt-1">Extracting {isContrib ? 'contributions' : 'expenses'} from your document</p>
                </div>
              </div>
            )}

            {/* Parsed results */}
            {uploadParseStatus === 'done' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-700">{parsedUploadItems.length} entries found in <span className="text-gray-900">{fileName}</span></p>
                  <button onClick={() => setSelectedItems(selectedItems.size === parsedUploadItems.length ? new Set() : new Set(parsedUploadItems.map((_, i) => i)))}
                    className="text-xs underline text-gray-500 hover:text-gray-800">
                    {selectedItems.size === parsedUploadItems.length ? 'Deselect all' : 'Select all'}
                  </button>
                </div>
                <div className="divide-y divide-gray-100 border border-gray-200 rounded-lg overflow-hidden">
                  {parsedUploadItems.map((item, idx) => (
                    <div key={idx} onClick={() => toggleItem(idx)} className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors ${selectedItems.has(idx) ? 'bg-yellow-50' : 'hover:bg-gray-50'}`}>
                      <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${selectedItems.has(idx) ? 'border-transparent' : 'border-gray-300'}`}
                        style={selectedItems.has(idx) ? { backgroundColor: '#C9A24D' } : {}}>
                        {selectedItems.has(idx) && <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 12 12"><path d="M10 3L5 8.5 2 5.5" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">{isContrib ? (item as any).organization : (item as any).description}</p>
                        <p className="text-xs text-gray-500">{isContrib ? (item as any).date : `${(item as any).category} • ${(item as any).date}`}</p>
                      </div>
                      <p className="text-sm font-semibold text-gray-900 flex-shrink-0">${(item as any).amount.toLocaleString()}</p>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-400">Select the entries you want to import. Uncheck any you want to skip.</p>
              </div>
            )}
          </div>

          <div className="p-6 border-t border-gray-100 flex gap-3 justify-end">
            <button onClick={handleClose} className="px-4 py-2 rounded-lg border border-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-50">Cancel</button>
            {uploadParseStatus === 'done' && (
              <button
                onClick={handleImport}
                disabled={selectedItems.size === 0}
                className="px-4 py-2 rounded-lg text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-40"
                style={{ backgroundColor: '#C9A24D' }}
              >
                Import {selectedItems.size} {isContrib ? (selectedItems.size === 1 ? 'Contribution' : 'Contributions') : (selectedItems.size === 1 ? 'Expense' : 'Expenses')}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Global Document Upload Modal
  const DocumentUploadModal: React.FC = () => (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">Upload Document</h2>
            <button onClick={() => setShowDocumentUpload(false)} className="p-2 hover:bg-gray-100 rounded-lg">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
          <p className="text-sm text-gray-600 mt-1">Upload any document and we'll automatically categorize it</p>
        </div>
        
        <div className="p-6 space-y-6">
          {/* Upload Area */}
          <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-yellow-500 transition-colors cursor-pointer">
            <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-900 font-medium mb-1">Drop files here or click to upload</p>
            <p className="text-sm text-gray-500">PDF, DOC, DOCX, JPG, PNG up to 25MB</p>
          </div>

          {/* Auto-categorization Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Zap className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <h3 className="font-semibold text-blue-900 mb-1">Smart Categorization</h3>
                <p className="text-sm text-blue-800">
                  Documents are automatically analyzed and categorized. We'll detect insurance policies, 
                  legal documents, warranties, and moreâ€”then file them in the right place.
                </p>
              </div>
            </div>
          </div>

          {/* Manual Override */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Or select a category manually</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {[
                { id: 'insurance', label: 'Insurance', icon: Shield },
                { id: 'legal', label: 'Legal', icon: FileText },
                { id: 'home', label: 'Home', icon: Home },
                { id: 'tax', label: 'Tax', icon: Calendar },
                { id: 'family', label: 'Family', icon: Users },
                { id: 'financial', label: 'Financial', icon: DollarSign }
              ].map(cat => (
                <button
                  key={cat.id}
                  className="flex items-center gap-2 px-4 py-3 rounded-lg border border-gray-200 hover:border-yellow-500 hover:bg-yellow-50 transition-colors"
                >
                  <cat.icon className="w-4 h-4 text-gray-600" />
                  <span className="text-sm font-medium text-gray-900">{cat.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Link to Existing Item */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Link to (optional)</label>
            <select className="w-full px-4 py-2 rounded-lg border border-gray-200 text-gray-900">
              <option value="">Auto-detect or select...</option>
              <optgroup label="Insurance Policies">
                <option value="auto-1">Auto Insurance - State Farm</option>
                <option value="home-1">Home Insurance - State Farm</option>
                <option value="umbrella-1">Umbrella Policy - State Farm</option>
              </optgroup>
              <optgroup label="Legal Documents">
                <option value="will-1">Last Will and Testament</option>
                <option value="trust-1">Revocable Living Trust</option>
                <option value="healthcare-1">Healthcare Directive</option>
              </optgroup>
              <optgroup label="Home Assets">
                <option value="hvac-1">HVAC System</option>
                <option value="roof-1">Roof</option>
                <option value="waterheater-1">Water Heater</option>
              </optgroup>
            </select>
          </div>
        </div>

        <div className="p-6 border-t border-gray-200 flex gap-3 justify-end">
          <button 
            onClick={() => setShowDocumentUpload(false)}
            className="px-4 py-2 rounded-lg border border-gray-200 text-gray-700 font-medium hover:bg-gray-50"
          >
            Cancel
          </button>
          <button 
            className="px-4 py-2 rounded-lg text-white font-medium hover:opacity-90"
            style={{ backgroundColor: '#C9A24D' }}
          >
            Upload Document
          </button>
        </div>
      </div>
    </div>
  );

  // Document Version History Modal
  const DocumentVersionModal: React.FC<{ document: Document }> = ({ document }) => (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Version History</h2>
              <p className="text-sm text-gray-600 mt-1">{document.name}</p>
            </div>
            <button onClick={() => setSelectedDocument(null)} className="p-2 hover:bg-gray-100 rounded-lg">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>
        
        <div className="p-6">
          <div className="space-y-4">
            {document.versions.map((version, index) => (
              <div key={version.id} className={`p-4 rounded-lg border ${index === 0 ? 'border-yellow-300 bg-yellow-50' : 'border-gray-200'}`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${index === 0 ? 'bg-yellow-200' : 'bg-gray-100'}`}>
                      <span className="text-sm font-bold text-gray-700">v{version.version}</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">{version.uploadedDate}</span>
                        {index === 0 && <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-800">Current</span>}
                      </div>
                      <p className="text-sm text-gray-500">Uploaded by {version.uploadedBy} â€¢ {version.fileSize}</p>
                      {version.changes && (
                        <p className="text-sm text-gray-700 mt-1">
                          <span className="font-medium">Changes:</span> {version.changes}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="p-2 hover:bg-gray-100 rounded-lg" title="View">
                      <Eye className="w-4 h-4 text-gray-500" />
                    </button>
                    <button className="p-2 hover:bg-gray-100 rounded-lg" title="Download">
                      <Download className="w-4 h-4 text-gray-500" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const Header: React.FC = () => (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <button 
            onClick={() => { setActiveView('dashboard'); setSelectedPriority(null); setSelectedPolicy(null); setSelectedLegalDoc(null); setSelectedAsset(null); }}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <img src={commandLogo} alt="Command" className="h-10 w-auto" />
          </button>

          <nav className="hidden lg:flex items-center gap-1">
            {[
              { id: 'insurance', label: 'Insurance', icon: Shield },
              { id: 'legal', label: 'Legal', icon: FileText },
              { id: 'home', label: 'Home', icon: Home },
              { id: 'finances', label: 'Finances', icon: Wallet },
              { id: 'taxes', label: 'Tax', icon: Calendar },
              { id: 'family', label: 'Family', icon: Users },
              { id: 'credit', label: 'Credit', icon: CreditCard }
            ].map(section => {
              const Icon = section.icon;
              return (
                <button
                  key={section.id}
                  onClick={() => { setActiveView(section.id); setSelectedPriority(null); setSelectedPolicy(null); setSelectedLegalDoc(null); setSelectedAsset(null); }}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg font-medium text-sm transition-colors ${
                    activeView === section.id ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {section.label}
                </button>
              );
            })}
          </nav>

          <div className="hidden lg:flex items-center gap-3">
            <button 
              onClick={() => setShowDocumentUpload(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-white font-medium text-sm hover:opacity-90 transition-opacity"
              style={{ backgroundColor: '#C9A24D' }}
            >
              <Upload className="w-4 h-4" />
              Upload
            </button>
            <button 
              onClick={() => setActiveView('documents')} 
              className={`p-2 rounded-lg transition-colors ${activeView === 'documents' ? 'bg-gray-100' : 'hover:bg-gray-100'}`}
            >
              <Folder className="w-5 h-5 text-gray-600" />
            </button>
            <button 
              onClick={() => setActiveView('profile')} 
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-all text-sm font-bold text-white ${
                activeView === 'profile' ? 'ring-2 ring-yellow-500' : ''
              }`}
              style={{ backgroundColor: '#C9A24D' }}
            >
              {userInitials}
            </button>
          </div>

          <button className="lg:hidden" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>
      
      {mobileMenuOpen && (
        <div className="lg:hidden bg-white border-t border-gray-200 py-2">
          <div className="px-4 space-y-1">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: Home },
              { id: 'insurance', label: 'Insurance', icon: Shield },
              { id: 'legal', label: 'Legal', icon: FileText },
              { id: 'home', label: 'Home', icon: Wrench },
              { id: 'finances', label: 'Finances', icon: Wallet },
              { id: 'taxes', label: 'Tax', icon: Calendar },
              { id: 'family', label: 'Family', icon: Users },
              { id: 'credit', label: 'Credit', icon: CreditCard },
              { id: 'documents', label: 'All Documents', icon: Folder },
              { id: 'profile', label: 'Profile', icon: User }
            ].map(section => {
              const Icon = section.icon;
              return (
                <button
                  key={section.id}
                  onClick={() => { setActiveView(section.id); setSelectedPriority(null); setMobileMenuOpen(false); }}
                  className={`flex items-center gap-3 w-full px-4 py-3 rounded-lg font-medium text-sm ${
                    activeView === section.id ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {section.label}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </header>
  );

  const SectionScoreCard: React.FC<{ section: HouseholdSection; compact?: boolean }> = ({ section, compact = false }) => {
    const Icon = section.icon;
    return (
      <button
        onClick={() => setActiveView(section.id)}
        className={`flex flex-col items-center p-2 rounded-lg hover:bg-white/10 transition-all ${compact ? 'min-w-[70px]' : 'min-w-[80px]'}`}
      >
        <div className={`w-10 h-10 rounded-full border-2 ${getScoreRingColor(section.score)} flex items-center justify-center mb-1`}>
          <Icon className="w-4 h-4 text-white" />
        </div>
        <span className={`text-xs text-gray-300 text-center leading-tight ${compact ? 'hidden sm:block' : ''}`}>{section.title}</span>
        <span className={`text-sm font-bold ${getScoreColor(section.score)}`}>{section.score}</span>
      </button>
    );
  };

  const PriorityCard: React.FC<{ priority: Priority; onClick: () => void; isDismissed?: boolean; onDismiss?: (e: React.MouseEvent) => void; onRestore?: (e: React.MouseEvent) => void }> = ({ priority, onClick, isDismissed = false, onDismiss, onRestore }) => (
    <div onClick={onClick} className={`bg-white border rounded-xl p-5 hover:shadow-lg transition-all cursor-pointer ${isDismissed ? 'border-gray-200 opacity-70' : 'border-gray-200 hover:border-gray-300'}`}>
      <div className="flex items-start gap-4">
        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center flex-shrink-0">
          <priority.icon className="w-5 h-5" style={{ color: '#C9A24D' }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3 mb-1.5">
            <h3 className="font-semibold text-gray-900">{priority.title}</h3>
            <span className={`px-2.5 py-0.5 text-xs font-medium rounded-full whitespace-nowrap flex-shrink-0 ${
              priority.impact === 'Critical' ? 'bg-red-100 text-red-800' : priority.impact === 'High' ? 'bg-yellow-100 text-yellow-800' : 'bg-blue-100 text-blue-800'
            }`}>{priority.impact}</span>
          </div>
          <p className="text-sm text-gray-600 mb-2 line-clamp-2">{priority.description}</p>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 text-xs text-gray-500">
              <div className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{priority.urgency}</div>
              {priority.potentialSavings && <div className="font-semibold" style={{ color: '#C9A24D' }}>Save {priority.potentialSavings}</div>}
              {priority.estimatedCost && <div className="text-gray-600 font-medium">Est. {priority.estimatedCost}</div>}
            </div>
            {!isDismissed && onDismiss && <button onClick={onDismiss} className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1"><XCircle className="w-3.5 h-3.5" />Dismiss</button>}
            {isDismissed && onRestore && <button onClick={onRestore} className="text-xs hover:text-yellow-600 flex items-center gap-1" style={{ color: '#C9A24D' }}><CheckCircle className="w-3.5 h-3.5" />Restore</button>}
          </div>
        </div>
        <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
      </div>
    </div>
  );

  const TimelineSection: React.FC = () => {
    const liveEvents = data?.timelineEvents ?? [];
    const today = new Date();
    const upcomingEvents = liveEvents
      .filter(e => !e.completed && e.event_date && new Date(e.event_date) >= today)
      .sort((a, b) => new Date(a.event_date!).getTime() - new Date(b.event_date!).getTime())
      .slice(0, 5);
    const pastEvents = liveEvents
      .filter(e => e.completed || (e.event_date && new Date(e.event_date) < today))
      .sort((a, b) => new Date(b.event_date ?? '').getTime() - new Date(a.event_date ?? '').getTime())
      .slice(0, 4);
    const getCategoryIcon = (category: string | null): LucideIcon => {
      switch ((category ?? '').toLowerCase()) {
        case 'insurance': return Shield;
        case 'taxes': case 'tax': return Calendar;
        case 'healthcare': case 'health': return Heart;
        case 'family': return Users;
        case 'legal': return FileText;
        case 'home': return Home;
        default: return Calendar;
      }
    };
    const getEventStatus = (eventType: string | null) => {
      switch (eventType) {
        case 'deadline': case 'renewal': return { bg: 'bg-yellow-100', text: 'text-yellow-600' };
        case 'action': return { bg: 'bg-red-100', text: 'text-red-600' };
        default: return { bg: 'bg-blue-100', text: 'text-blue-600' };
      }
    };
    const formatDate = (dateStr: string | null) => {
      if (!dateStr) return '';
      return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };
    if (liveEvents.length === 0) {
      return (
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Timeline</h3>
          <div className="text-center py-8 text-gray-400">
            <Calendar className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No timeline events yet. They'll appear here as your household data grows.</p>
          </div>
        </div>
      );
    }
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Timeline</h3>
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-medium text-gray-500 mb-3 flex items-center gap-2"><AlertCircle className="w-4 h-4" />Upcoming</h4>
            <div className="space-y-3">
              {upcomingEvents.length === 0 ? <p className="text-sm text-gray-400">No upcoming events</p> : upcomingEvents.map(event => {
                const Icon = getCategoryIcon(event.category);
                const style = getEventStatus(event.event_type);
                return (
                  <div key={event.id} className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${style.bg}`}>
                      <Icon className={`w-4 h-4 ${style.text}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{event.title}</p>
                      <p className="text-xs text-gray-500">{formatDate(event.event_date)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <div>
            <h4 className="text-sm font-medium text-gray-500 mb-3 flex items-center gap-2"><CheckCircle className="w-4 h-4" />Recent Activity</h4>
            <div className="space-y-3">
              {pastEvents.length === 0 ? <p className="text-sm text-gray-400">No recent activity</p> : pastEvents.map(event => {
                const Icon = getCategoryIcon(event.category);
                return (
                  <div key={event.id} className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0"><Icon className="w-4 h-4 text-green-600" /></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{event.title}</p>
                      <p className="text-xs text-gray-500">{formatDate(event.event_date)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Legal Section View
  const LegalView: React.FC = () => {
    const liveLegalDocs = data?.legalDocuments ?? [];
    const currentDocs = liveLegalDocs.filter(d => d.status === 'current').length;
    const needsReview = liveLegalDocs.filter(d => d.status === 'needs_review' || d.status === 'outdated').length;
    const notEstablished = liveLegalDocs.filter(d => d.status === 'not_established').length;
    const getLegalStatusLabel = (status: string) => {
      switch (status) {
        case 'not_established': return 'Not Established';
        case 'needs_review': return 'Needs Review';
        case 'outdated': return 'Outdated';
        default: return 'Current';
      }
    };
    const getLegalStatusColor = (status: string) => {
      switch (status) {
        case 'not_established': return 'text-red-600 bg-red-100';
        case 'needs_review': return 'text-yellow-600 bg-yellow-100';
        case 'outdated': return 'text-orange-600 bg-orange-100';
        default: return 'text-green-600 bg-green-100';
      }
    };
    const getLegalIcon = (type: string): LucideIcon => {
      switch (type) {
        case 'will': return ScrollText;
        case 'trust': return FileSignature;
        case 'healthcare_directive': return Heart;
        case 'poa': return Scale;
        case 'beneficiary': return ClipboardList;
        default: return FileText;
      }
    };

    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Legal & Estate</h1>
          <p className="text-gray-600">Keeps your legal documents current, aligned, and ready when it matters.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center"><FileText className="w-5 h-5 text-blue-600" /></div>
              <span className="text-sm text-gray-600">Total Documents</span>
            </div>
            <p className="text-3xl font-bold text-gray-900">{liveLegalDocs.length}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center"><CheckCircle className="w-5 h-5 text-green-600" /></div>
              <span className="text-sm text-gray-600">Current</span>
            </div>
            <p className="text-3xl font-bold text-gray-900">{currentDocs}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-yellow-100 flex items-center justify-center"><AlertTriangle className="w-5 h-5 text-yellow-600" /></div>
              <span className="text-sm text-gray-600">Needs Review</span>
            </div>
            <p className="text-3xl font-bold text-gray-900">{needsReview}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center"><XCircle className="w-5 h-5 text-red-600" /></div>
              <span className="text-sm text-gray-600">Not Established</span>
            </div>
            <p className="text-3xl font-bold text-gray-900">{notEstablished}</p>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Estate Documents</h2>
            <button onClick={() => setShowDocumentUpload(true)} className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-gray-100" style={{ color: '#C9A24D' }}>
              <Plus className="w-4 h-4" />Add Document
            </button>
          </div>
          {liveLegalDocs.length === 0 ? (
            <div className="p-12 text-center">
              <FileText className="w-12 h-12 text-gray-200 mx-auto mb-3" />
              <h3 className="font-medium text-gray-500 mb-1">No legal documents yet</h3>
              <p className="text-sm text-gray-400">Add your will, trust, POA, and other estate documents to track their status.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {liveLegalDocs.map(doc => {
                const Icon = getLegalIcon(doc.type);
                const colorClass = getLegalStatusColor(doc.status);
                return (
                  <div key={doc.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colorClass.split(' ')[1]}`}>
                          <Icon className={`w-5 h-5 ${colorClass.split(' ')[0]}`} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium text-gray-900">{doc.name}</h3>
                            <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${colorClass}`}>{getLegalStatusLabel(doc.status)}</span>
                          </div>
                          <p className="text-sm text-gray-500">Last reviewed: {doc.last_reviewed ?? 'Not on file'}</p>
                          {doc.attorney && <p className="text-xs text-gray-400">Attorney: {doc.attorney}</p>}
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    </div>
                    {doc.notes && <p className="text-sm text-gray-500 mt-2 ml-14">{doc.notes}</p>}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  };

  // Home Section View
  const HomeView: React.FC = () => {
    return (
      <div className="space-y-6">
        <div><h1 className="text-2xl font-bold text-gray-900 mb-1">Home & Assets</h1><p className="text-gray-600">Turns reactive maintenance into a proactive, planned system.</p></div>
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
          <Wrench className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <h3 className="font-medium text-gray-500 mb-1">No home assets tracked yet</h3>
          <p className="text-sm text-gray-400">Add your HVAC, roof, appliances, and other home systems to track maintenance and plan replacements.</p>
        </div>
      </div>
    );
  };

  const InsuranceView: React.FC = () => {
    const livePolicies = data?.insurancePolicies ?? [];
    const totalAnnualPremium = livePolicies.reduce((sum, p) => sum + (p.annual_premium ?? 0), 0);
    const needAttention = livePolicies.filter(p => p.status === 'renewal_soon' || p.status === 'action_needed').length;
    const getPolicyIcon = (type: string): LucideIcon => {
      switch (type) {
        case 'home': return Building; case 'auto': return Car; case 'umbrella': return Umbrella;
        case 'life': case 'health': return Heart; default: return Shield;
      }
    };
    const getPolicyStatusStyle = (status: string) => {
      if (status === 'action_needed') return { bg: 'bg-red-100', text: 'text-red-600', badge: 'bg-red-100 text-red-800', label: 'Action Needed' };
      if (status === 'renewal_soon') return { bg: 'bg-yellow-100', text: 'text-yellow-600', badge: 'bg-yellow-100 text-yellow-800', label: 'Renewal Soon' };
      return { bg: 'bg-gray-100', text: 'text-gray-600', badge: '', label: '' };
    };
    const policyTypeGroups = ['home','auto','umbrella','life','health','disability','other'];
    const typeLabels: Record<string,string> = {home:'Home',auto:'Auto',umbrella:'Umbrella',life:'Life',health:'Health',disability:'Disability',other:'Other'};
    const typeIcons: Record<string,LucideIcon> = {home:Building,auto:Car,umbrella:Umbrella,life:Heart,health:Heart,disability:Shield,other:Shield};
    return (
      <div className="space-y-6">
        <div><h1 className="text-2xl font-bold text-gray-900 mb-1">Insurance & Risk</h1><p className="text-gray-600">Maintains a living view of coverage across all policies.</p></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white border border-gray-200 rounded-xl p-5"><div className="flex items-center gap-3 mb-3"><div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center"><Shield className="w-5 h-5 text-blue-600" /></div><span className="text-sm text-gray-600">Active Policies</span></div><p className="text-3xl font-bold text-gray-900">{livePolicies.length}</p></div>
          <div className="bg-white border border-gray-200 rounded-xl p-5"><div className="flex items-center gap-3 mb-3"><div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center"><DollarSign className="w-5 h-5 text-green-600" /></div><span className="text-sm text-gray-600">Annual Premium</span></div><p className="text-3xl font-bold text-gray-900">${totalAnnualPremium.toLocaleString()}</p></div>
          <div className="bg-white border border-gray-200 rounded-xl p-5"><div className="flex items-center gap-3 mb-3"><div className="w-10 h-10 rounded-lg bg-yellow-100 flex items-center justify-center"><AlertTriangle className="w-5 h-5 text-yellow-600" /></div><span className="text-sm text-gray-600">Need Attention</span></div><p className="text-3xl font-bold text-gray-900">{needAttention}</p></div>
        </div>
        {livePolicies.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
            <Shield className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <h3 className="font-medium text-gray-500 mb-1">No insurance policies yet</h3>
            <p className="text-sm text-gray-400">Your home, auto, life, and umbrella policies will appear here once added.</p>
          </div>
        ) : (
          <>{policyTypeGroups.map(type => {
            const typePolicies = livePolicies.filter(p => p.type === type);
            if (typePolicies.length === 0) return null;
            const TypeIcon = typeIcons[type] ?? Shield;
            return (
              <div key={type} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3"><TypeIcon className="w-5 h-5" style={{ color: '#C9A24D' }} /><h2 className="text-lg font-semibold text-gray-900">{typeLabels[type] ?? type} Insurance</h2></div>
                <div className="divide-y divide-gray-100">
                  {typePolicies.map(policy => {
                    const Icon = getPolicyIcon(policy.type);
                    const style = getPolicyStatusStyle(policy.status);
                    return (
                      <div key={policy.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${style.bg}`}><Icon className={`w-5 h-5 ${style.text}`} /></div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="font-medium text-gray-900 capitalize">{policy.type} Insurance</h3>
                                {style.label && <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${style.badge}`}>{style.label}</span>}
                              </div>
                              <p className="text-sm text-gray-500">{policy.carrier ?? 'Carrier not set'}{policy.policy_number ? ` · ${policy.policy_number}` : ''}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            {policy.annual_premium && <p className="font-semibold text-gray-900">${policy.annual_premium.toLocaleString()}/yr</p>}
                            {policy.renewal_date && <p className="text-xs text-gray-500">Renews {policy.renewal_date}</p>}
                          </div>
                        </div>
                        {policy.notes && <p className="text-sm text-gray-500 mt-2 ml-14">{policy.notes}</p>}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}</>
        )}
      </div>
    );
  };

  const PriorityDetailView: React.FC<{ priority: Priority }> = ({ priority }) => (
    <div className="space-y-6">
      <button onClick={() => setSelectedPriority(null)} className="flex items-center gap-2 text-gray-600 hover:text-gray-900"><ArrowLeft className="w-4 h-4" /><span className="text-sm font-medium">Back to Dashboard</span></button>
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
        <div className="flex items-start gap-4 mb-6">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center"><priority.icon className="w-6 h-6" style={{ color: '#C9A24D' }} /></div>
          <div className="flex-1"><h1 className="text-2xl font-bold text-gray-900 mb-2">{priority.title}</h1><div className="flex items-center gap-3 text-sm text-gray-500"><Clock className="w-4 h-4" />{priority.urgency}</div></div>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6"><div className="flex items-start gap-3"><Info className="w-5 h-5 text-blue-600 mt-0.5" /><div><h3 className="font-semibold text-blue-900 mb-1">Why This Matters</h3><p className="text-sm text-blue-800">{priority.rationale}</p></div></div></div>
        {priority.recommendations.length > 0 && (
          <div><h3 className="text-lg font-semibold text-gray-900 mb-4">Recommendations</h3><div className="space-y-4">{priority.recommendations.map((rec, index) => (<div key={index} className="bg-white border border-gray-200 rounded-xl p-5"><h4 className="font-semibold text-gray-900 mb-1">{rec.title}</h4>{rec.savings && <div className="text-sm font-semibold mb-2" style={{ color: '#C9A24D' }}>Save ${rec.savings}/year</div>}<p className="text-sm text-gray-600 mb-2">{rec.description}</p><p className="text-sm text-gray-700">{rec.impact}</p></div>))}</div></div>
        )}
      </div>
    </div>
  );

  const DashboardView: React.FC = () => {
    if (selectedPriority) return <PriorityDetailView priority={selectedPriority} />;
    const activePriorities = activePrioritiesSource.filter(p => !dismissedPriorities.includes(p.id));
    const dismissedPriorityItems = activePrioritiesSource.filter(p => dismissedPriorities.includes(p.id));

    return (
      <div className="space-y-6">
        <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-xl p-6 text-white shadow-lg">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div><p className="text-sm text-gray-400 mb-1">Welcome back, {firstName}</p><h2 className="text-base font-medium text-gray-300 mb-2">Overall Household Health</h2><div className="flex items-end gap-2"><span className="text-6xl lg:text-7xl font-bold">{liveHealthScore}</span><span className="text-2xl text-gray-400 pb-2">/100</span></div><p className="text-xs text-gray-400 mt-2">{liveHealthScore >= 80 ? 'Excellent - household is well optimized' : liveHealthScore >= 60 ? 'Good - some areas need attention' : 'Needs attention - multiple areas require action'}</p></div>
            <div className="flex-1 lg:max-w-xl"><p className="text-xs text-gray-400 mb-3 lg:text-right">Section Scores</p><div className="flex flex-wrap justify-start lg:justify-end gap-1">{liveSections.map(section => <SectionScoreCard key={section.id} section={section} compact />)}</div></div>
          </div>
        </div>
        <div><h2 className="text-xl font-semibold text-gray-900 mb-3">Priority Actions</h2>{activePriorities.length > 0 ? <div className="grid gap-3">{activePriorities.map(priority => <PriorityCard key={priority.id} priority={priority} onClick={() => setSelectedPriority(priority)} onDismiss={(e) => dismissPriority(priority.id, e)} />)}</div> : <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center"><CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" /><p className="text-green-800 font-medium">All caught up!</p></div>}</div>
        <TimelineSection />
        {dismissedPriorityItems.length > 0 && <div className="border-t border-gray-200 pt-6"><button onClick={() => setShowDismissed(!showDismissed)} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-3">{showDismissed ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}Dismissed Items ({dismissedPriorityItems.length})</button>{showDismissed && <div className="grid gap-3">{dismissedPriorityItems.map(priority => <PriorityCard key={priority.id} priority={priority} onClick={() => setSelectedPriority(priority)} isDismissed onRestore={(e) => restorePriority(priority.id, e)} />)}</div>}</div>}
      </div>
    );
  };

  // Tax Section View
  const TaxView: React.FC = () => {
    return (
      <div className="space-y-6">
        <div><h1 className="text-2xl font-bold text-gray-900 mb-1">Tax Planning</h1><p className="text-gray-600">Planning, filing coordination, and record retention.</p></div>
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
          <Calendar className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <h3 className="font-medium text-gray-500 mb-1">Tax planning coming soon</h3>
          <p className="text-sm text-gray-400">Upload tax documents, track charitable contributions, and manage business expenses here.</p>
        </div>
      </div>
    );
  };

  const FamilyView: React.FC = () => {
    return (
      <div className="space-y-6">
        <div><h1 className="text-2xl font-bold text-gray-900 mb-1">Family & Life Administration</h1><p className="text-gray-600">Tracks major milestones and proactively prompts updates across all domains.</p></div>
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
          <Users className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <h3 className="font-medium text-gray-500 mb-1">Family details not set up yet</h3>
          <p className="text-sm text-gray-400">Add family members, track milestones, and manage college savings here.</p>
        </div>
      </div>
    );
  };

  const CreditView: React.FC = () => {
    return (
      <div className="space-y-6">
        <div><h1 className="text-2xl font-bold text-gray-900 mb-1">Credit & Rewards Optimization</h1><p className="text-gray-600">Maximizes value through smarter card selection and spending alignment.</p></div>
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
          <CreditCard className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <h3 className="font-medium text-gray-500 mb-1">No credit cards added yet</h3>
          <p className="text-sm text-gray-400">Add your credit cards to optimize rewards and track spending.</p>
        </div>
      </div>
    );
  };

  const FinancesView: React.FC = () => {
    return (
      <div className="space-y-6">
        <div><h1 className="text-2xl font-bold text-gray-900 mb-1">Finances & Budget</h1><p className="text-gray-600">Executive-level view of cash flow, commitments, and upcoming decisions.</p></div>
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
          <Wallet className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <h3 className="font-medium text-gray-500 mb-1">Budget tracking not set up yet</h3>
          <p className="text-sm text-gray-400">Connect your accounts or add budget categories to track income, spending, and savings rate.</p>
        </div>
      </div>
    );
  };


  // All Documents View
  const DocumentsView: React.FC = () => {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-1">All Documents</h1>
            <p className="text-gray-600">Your complete document repository</p>
          </div>
          <button onClick={() => setShowDocumentUpload(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg text-white font-medium hover:opacity-90" style={{ backgroundColor: '#C9A24D' }}>
            <Upload className="w-4 h-4" />Upload Document
          </button>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
          <Folder className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <h3 className="font-medium text-gray-500 mb-1">No documents uploaded yet</h3>
          <p className="text-sm text-gray-400">Upload insurance policies, legal documents, warranties, and more.</p>
        </div>
      </div>
    );
  };

  // Profile View
  const ProfileView: React.FC = () => {
    const locationStr = (() => {
      const city = data?.household?.city ?? data?.profile?.city ?? '';
      const state = data?.household?.state ?? data?.profile?.state ?? '';
      return city && state ? `${city}, ${state}` : city || state || '';
    })();
    return (
      <div className="space-y-6">
        <div><h1 className="text-2xl font-bold text-gray-900 mb-1">Profile Settings</h1><p className="text-gray-600">Manage your account, security, and subscription</p></div>
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-yellow-600 to-yellow-500 flex items-center justify-center"><span className="text-3xl font-bold text-white">{userInitials}</span></div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-gray-900">{displayName}</h2>
              <p className="text-gray-600">Command Member</p>
              {locationStr && <p className="text-sm text-gray-500 mt-1">{locationStr}</p>}
              <div className="flex items-center gap-2 mt-2"><span className="px-2.5 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">Pro Plan</span></div>
            </div>
            <div className="flex items-center gap-3">
              <button className="px-4 py-2 rounded-lg border border-gray-200 text-gray-700 font-medium hover:bg-gray-50 flex items-center gap-2"><Edit3 className="w-4 h-4" />Edit Profile</button>
              <button onClick={() => supabase.auth.signOut()} className="px-4 py-2 rounded-lg border border-red-200 text-red-600 font-medium hover:bg-red-50">Sign Out</button>
            </div>
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100"><h2 className="text-lg font-semibold text-gray-900">Subscription & Billing</h2></div>
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div><div className="flex items-center gap-3 mb-1"><h3 className="text-lg font-bold text-gray-900">Pro Plan</h3><span className="px-2.5 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">Active</span></div><p className="text-gray-600">$40/month</p></div>
              <button className="px-4 py-2 rounded-lg border border-gray-200 text-gray-700 font-medium hover:bg-gray-50">Change Plan</button>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm font-medium text-gray-900 mb-2">Pro Plan includes:</p>
              <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                {['Advanced risk scoring', 'Automation features', 'Annual optimization review', 'Priority support'].map((feature, idx) => (
                  <div key={idx} className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500" />{feature}</div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderView = (): React.ReactNode => {
    switch (activeView) {
      case 'dashboard': return <DashboardView />;
      case 'insurance': return <InsuranceView />;
      case 'legal': return <LegalView />;
      case 'home': return <HomeView />;
      case 'finances': return <FinancesView />;
      case 'taxes': return <TaxView />;
      case 'family': return <FamilyView />;
      case 'credit': return <CreditView />;
      case 'documents': return <DocumentsView />;
      case 'profile': return <ProfileView />;
      default: return <DashboardView />;
    }
  };

if (!userId && !loading) {
    return <AuthScreen />;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0F0F10] flex items-center justify-center">
        <div className="text-center">
          <div className="text-[#C9A24D] text-xs tracking-[0.3em] font-medium mb-6">
            HOUSEHOLD OPERATING SYSTEM
          </div>
          <div className="w-8 h-8 border-2 border-[#2a2b2e] border-t-[#C9A24D] rounded-full animate-spin mx-auto" />
        </div>
      </div>
    );
  }
if (isNewUser && userId) {
    return (
      <OnboardingFlow
        userId={userId}
        onComplete={async () => {
          setOnboardingComplete(true);
          await refresh();
        }}
      />
    );
  }
  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 to-neutral-100">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">{renderView()}</main>
      {showDocumentUpload && <DocumentUploadModal />}
      {selectedDocument && <DocumentVersionModal document={selectedDocument} />}
      {showAddContribution && <AddContributionModal />}
      {showAddExpense && <AddExpenseModal />}
      {showUploadTaxDoc && <UploadTaxDocModal />}
      {showWeeklyBrief && <WeeklyBriefModal />}
      <DevPersonaSwitcher />
    </div>
  );
};

export default CommandApp;
