import React, { useState } from 'react';
import { supabase } from './lib/supabase';
import { useHousehold } from './useHousehold';
import { AuthScreen } from './AuthScreen';
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
  Mail,
  Phone,
  MapPin,
  Edit3,
  Plus,
  AlertTriangle,
  DollarSign,
  Upload,
  File,
  Folder,
  History,
  Download,
  Eye,
  Search,
  Filter,
  Zap,
  Thermometer,
  Droplets,
  Refrigerator,
  Flame,
  ScrollText,
  Scale,
  Briefcase,
  FileSignature,
  ClipboardList,
  CircleDot,
  CreditCard,
  Wallet,
  GraduationCap,
  ShoppingCart,
  Utensils,
  Tv,
  Sparkles,
  Target,
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

interface BudgetCategory {
  category: string;
  icon: LucideIcon;
  budgeted: number;
  actual: number;
  color: string;
}

const CommandApp: React.FC = () => {
  const { data, loading, userId } = useHousehold();
  const [activeView, setActiveView] = useState<string>('dashboard');
  const [selectedPriority, setSelectedPriority] = useState<Priority | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [dismissedPriorities, setDismissedPriorities] = useState<number[]>([]);
  const [showDismissed, setShowDismissed] = useState<boolean>(false);
  const [selectedPolicy, setSelectedPolicy] = useState<InsurancePolicy | null>(null);
  const [selectedLegalDoc, setSelectedLegalDoc] = useState<LegalDocument | null>(null);
  const [selectedAsset, setSelectedAsset] = useState<HomeAsset | null>(null);
  const [showDocumentUpload, setShowDocumentUpload] = useState<boolean>(false);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [dismissedTaxRecs, setDismissedTaxRecs] = useState<string[]>([]);
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
  const attorney: Attorney = {
    name: 'Jennifer Morrison',
    firm: 'Morrison & Associates Law',
    specialty: 'Estate Planning & Trust Law',
    phone: '(612) 555-8200',
    email: 'jmorrison@morrisonlaw.com',
    address: '450 Nicollet Mall, Suite 1200, Minneapolis, MN 55402',
    lastContact: 'March 2019'
  };

  // Legal Documents Data
  const legalDocuments: LegalDocument[] = [
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
  const homeAssets: HomeAsset[] = [
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
  const allDocuments: Document[] = [
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
  const taxDocuments: TaxDocument[] = [
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

  const [charitableContributions, setCharitableContributions] = useState<CharitableContribution[]>([
    { id: 'cc-1', organization: 'United Way', date: 'Dec 15, 2025', amount: 5000, type: 'cash', acknowledged: true, taxDeductible: true },
    { id: 'cc-2', organization: 'St. Jude Children\'s Hospital', date: 'Nov 20, 2025', amount: 2500, type: 'cash', acknowledged: true, taxDeductible: true },
    { id: 'cc-3', organization: 'Local Food Shelf', date: 'Oct 5, 2025', amount: 1000, type: 'cash', acknowledged: true, taxDeductible: true },
    { id: 'cc-4', organization: 'Alma Mater University', date: 'Sep 1, 2025', amount: 10000, type: 'stock', acknowledged: true, taxDeductible: true },
    { id: 'cc-5', organization: 'Habitat for Humanity', date: 'Aug 15, 2025', amount: 500, type: 'goods', acknowledged: false, taxDeductible: true }
  ]);

  const [businessExpenses, setBusinessExpenses] = useState<BusinessExpense[]>([
    { id: 'be-1', category: 'Home Office', description: 'Dedicated office space (150 sq ft)', amount: 1800, date: '2025', deductible: true, receipt: true },
    { id: 'be-2', category: 'Software', description: 'Adobe Creative Suite, Zoom Pro', amount: 850, date: '2025', deductible: true, receipt: true },
    { id: 'be-3', category: 'Professional Development', description: 'Industry conference & courses', amount: 2200, date: '2025', deductible: true, receipt: true },
    { id: 'be-4', category: 'Equipment', description: 'Computer upgrade, monitor', amount: 1500, date: '2025', deductible: true, receipt: true },
    { id: 'be-5', category: 'Internet/Phone', description: 'Business portion (40%)', amount: 720, date: '2025', deductible: true, receipt: true },
    { id: 'be-6', category: 'Professional Services', description: 'Legal consultation, accounting', amount: 1200, date: '2025', deductible: true, receipt: true },
    { id: 'be-7', category: 'Travel', description: 'Client meetings, mileage', amount: 1850, date: '2025', deductible: true, receipt: true }
  ]);

  const taxRecommendations: TaxRecommendation[] = [
    { id: 'tr-1', title: 'Maximize 401(k) Contributions', description: 'You contributed $20,500 in 2025. The limit is $23,000. Consider increasing to capture additional $2,500 in tax-deferred savings.', potentialSavings: 875, priority: 'high', deadline: 'Dec 31, 2026' },
    { id: 'tr-2', title: 'Consider Backdoor Roth IRA', description: 'Your income exceeds Roth IRA limits. A backdoor Roth conversion could provide tax-free growth.', potentialSavings: 0, priority: 'medium' },
    { id: 'tr-3', title: 'Harvest Investment Losses', description: 'You have $12,000 in unrealized losses that could offset gains and reduce tax liability.', potentialSavings: 2400, priority: 'high', deadline: 'Dec 31, 2026' },
    { id: 'tr-4', title: 'HSA Contribution Room', description: 'You contributed $5,000 to your HSA. Family limit is $8,300. Additional contributions reduce taxable income.', potentialSavings: 1155, priority: 'medium' },
    { id: 'tr-5', title: 'Bunch Charitable Contributions', description: 'Consider "bunching" 2 years of donations into one year to exceed standard deduction threshold.', potentialSavings: 1500, priority: 'low' },
    { id: 'tr-6', title: 'Review Estimated Tax Payments', description: 'Your consulting income requires quarterly estimates. Ensure Q1 2026 payment is adequate to avoid penalties.', priority: 'high', deadline: 'Apr 15, 2026' }
  ];

  const taxLawUpdates: TaxLawUpdate[] = [
    { id: 'tl-1', title: 'SALT Deduction Cap Extended', effectiveDate: '2025', impact: 'negative', summary: 'The $10,000 cap on state and local tax (SALT) deductions continues through 2025. This affects your property tax and state income tax deductions.', actionRequired: false },
    { id: 'tl-2', title: 'Standard Deduction Increase', effectiveDate: '2025', impact: 'positive', summary: 'Standard deduction for married filing jointly increased to $29,200. Compare against your itemized deductions to optimize.', actionRequired: true },
    { id: 'tl-3', title: '1099-K Reporting Threshold', effectiveDate: '2025', impact: 'neutral', summary: 'Payment platforms must report transactions over $5,000 (down from $20,000). May receive additional 1099-K forms.', actionRequired: false },
    { id: 'tl-4', title: 'Clean Vehicle Tax Credit', effectiveDate: '2025', impact: 'positive', summary: 'If purchasing an electric vehicle, credits up to $7,500 are available. Your Tesla may have qualified for the used EV credit.', actionRequired: true }
  ];

  const cpaTaxProfessional = {
    name: 'Michael Chen, CPA',
    firm: 'Chen & Associates Tax Advisors',
    phone: '(612) 555-3400',
    email: 'mchen@chentax.com',
    address: '2800 Southtown Dr, Suite 300, Bloomington, MN 55431',
    lastFiling: 'April 2025'
  };

  // Family & Life Administration Data
  const familyMembers: FamilyMember[] = [
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

  const agingParents = [
    { name: 'Robert Bailey', relationship: 'Father', age: 72, location: 'Rochester, MN', healthStatus: 'Good', lastVisit: 'Jan 2026', notes: 'Annual checkup scheduled for March' },
    { name: 'Linda Bailey', relationship: 'Mother', age: 70, location: 'Rochester, MN', healthStatus: 'Good', lastVisit: 'Jan 2026', notes: 'Considering downsizing in 2-3 years' },
    { name: 'Margaret Thompson', relationship: 'Mother-in-law', age: 68, location: 'Minneapolis, MN', healthStatus: 'Fair', lastVisit: 'Dec 2025', notes: 'Managing arthritis, may need additional support' }
  ];

  const collegePlans: CollegePlan[] = [
    { childName: 'Emma Bailey', targetYear: 2031, estimatedCost: 200000, currentSavings: 45000, monthlyContribution: 800, accountType: '529 Plan', onTrack: true },
    { childName: 'Jack Bailey', targetYear: 2034, estimatedCost: 220000, currentSavings: 28000, monthlyContribution: 600, accountType: '529 Plan', onTrack: true }
  ];

  const upcomingLifeEvents = [
    { id: 'le-1', event: 'Emma turns 13', date: 'Sep 10, 2026', impact: 'Consider teen auto insurance rider', category: 'insurance' },
    { id: 'le-2', event: 'Adam turns 45', date: 'May 15, 2026', impact: 'Life insurance rate review, estate plan check', category: 'legal' },
    { id: 'le-3', event: 'Emma starts high school', date: 'Sep 2027', impact: 'College planning acceleration, extracurricular budget', category: 'financial' },
    { id: 'le-4', event: 'Emma gets drivers license', date: 'Sep 2029', impact: 'Auto insurance adjustment (+$1,200/yr est.)', category: 'insurance' },
    { id: 'le-5', event: 'Emma starts college', date: 'Aug 2031', impact: '529 distributions begin, health insurance decision', category: 'financial' }
  ];

  // Credit & Rewards Data
  const creditCards: CreditCard[] = [
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

  const spendingOptimization: SpendingCategory[] = [
    { category: 'Groceries', monthlyAvg: 1200, bestCard: 'Blue Cash Preferred', currentCard: 'Blue Cash Preferred', potentialRewards: 72, actualRewards: 72, optimized: true },
    { category: 'Dining', monthlyAvg: 600, bestCard: 'Sapphire Reserve', currentCard: 'Sapphire Reserve', potentialRewards: 54, actualRewards: 54, optimized: true },
    { category: 'Gas', monthlyAvg: 350, bestCard: 'Blue Cash Preferred', currentCard: 'Freedom Unlimited', potentialRewards: 21, actualRewards: 5.25, optimized: false },
    { category: 'Travel', monthlyAvg: 400, bestCard: 'Sapphire Reserve', currentCard: 'Sapphire Reserve', potentialRewards: 36, actualRewards: 36, optimized: true },
    { category: 'Online Shopping', monthlyAvg: 800, bestCard: 'Freedom Unlimited', currentCard: 'Various', potentialRewards: 12, actualRewards: 8, optimized: false },
    { category: 'Subscriptions', monthlyAvg: 250, bestCard: 'Blue Cash Preferred', currentCard: 'Sapphire Reserve', potentialRewards: 15, actualRewards: 2.50, optimized: false }
  ];

  const creditRecommendations = [
    { id: 'cr-1', title: 'Use Blue Cash Preferred for Gas', description: 'Switch gas purchases from Freedom to Blue Cash for 6% vs 1.5% back', monthlySavings: 15.75, priority: 'high' },
    { id: 'cr-2', title: 'Consolidate Online Shopping', description: 'Use Freedom Unlimited for all online purchases to maximize 1.5% cashback', monthlySavings: 4, priority: 'medium' },
    { id: 'cr-3', title: 'Move Streaming to Blue Cash', description: 'Transfer streaming services to Blue Cash Preferred for 6% vs 1%', monthlySavings: 12.50, priority: 'medium' },
    { id: 'cr-4', title: 'Redeem Points Before Devaluation', description: 'Chase points historically devalue. Consider booking travel or transferring to partners.', priority: 'low' }
  ];

  // Finances & Budget Data
  const monthlyBudget: BudgetCategory[] = [
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

  const financialSummary = {
    monthlyIncome: 27083, // $325k / 12
    totalBudgeted: 11350,
    totalActual: 11600,
    savingsRate: 26, // percentage
    emergencyFund: 45000,
    emergencyFundTarget: 50000,
    monthsOfExpenses: 3.9
  };

  const upcomingObligations = [
    { id: 'ob-1', description: 'Q1 Estimated Tax Payment', amount: 12500, dueDate: 'Apr 15, 2026', type: 'tax' },
    { id: 'ob-2', description: 'Property Tax (1st half)', amount: 4100, dueDate: 'May 15, 2026', type: 'tax' },
    { id: 'ob-3', description: 'Emma Summer Camp Deposit', amount: 1500, dueDate: 'Mar 1, 2026', type: 'family' },
    { id: 'ob-4', description: 'Annual Life Insurance Premium', amount: 1020, dueDate: 'Dec 1, 2026', type: 'insurance' },
    { id: 'ob-5', description: 'Car Registration Renewal', amount: 450, dueDate: 'Jun 30, 2026', type: 'auto' }
  ];

  const financialRecommendations = [
    { id: 'fr-1', title: 'Top off Emergency Fund', description: 'Add $5,000 to reach 4-month expense target', priority: 'medium' },
    { id: 'fr-2', title: 'Review Dining Budget', description: 'Consistently over budget by 20%. Consider adjusting to $700/month.', priority: 'low' },
    { id: 'fr-3', title: 'Entertainment Overspend', description: 'Over budget 3 of last 4 months. Review subscriptions.', priority: 'low' }
  ];

  // Insurance Policies Data
  const insurancePolicies: InsurancePolicy[] = [
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

  const timelineEvents: TimelineEvent[] = [
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

  const getConditionColor = (condition: string): string => {
    switch (condition) {
      case 'excellent': return 'text-green-600 bg-green-100';
      case 'good': return 'text-blue-600 bg-blue-100';
      case 'fair': return 'text-yellow-600 bg-yellow-100';
      case 'poor': return 'text-orange-600 bg-orange-100';
      case 'replace-soon': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusColor = (status: string): string => {
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
      setCharitableContributions((prev: CharitableContribution[]) => [newItem, ...prev]);
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
      setBusinessExpenses((prev: BusinessExpense[]) => [newItem, ...prev]);
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
        setCharitableContributions((prev: CharitableContribution[]) => [...toAdd, ...prev]);
      } else {
        const toAdd: BusinessExpense[] = [...selectedItems].map(i => ({
          id: 'be-' + Date.now() + '-' + i,
          ...mockParsedExpenses[i],
          deductible: true
        }));
        setBusinessExpenses((prev: BusinessExpense[]) => [...toAdd, ...prev]);
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
              {activePersona.initials}
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
    const upcomingEvents = timelineEvents.filter(e => e.type === 'upcoming').slice(0, 5);
    const pastEvents = timelineEvents.filter(e => e.type === 'past').slice(0, 4);
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Timeline</h3>
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-medium text-gray-500 mb-3 flex items-center gap-2"><AlertCircle className="w-4 h-4" />Upcoming</h4>
            <div className="space-y-3">
              {upcomingEvents.map(event => {
                const Icon = event.icon;
                return (
                  <div key={event.id} className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${event.status === 'warning' ? 'bg-yellow-100' : event.status === 'critical' ? 'bg-red-100' : 'bg-blue-100'}`}>
                      <Icon className={`w-4 h-4 ${event.status === 'warning' ? 'text-yellow-600' : event.status === 'critical' ? 'text-red-600' : 'text-blue-600'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{event.title}</p>
                      <p className="text-xs text-gray-500">{event.date}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <div>
            <h4 className="text-sm font-medium text-gray-500 mb-3 flex items-center gap-2"><CheckCircle className="w-4 h-4" />Recent Activity</h4>
            <div className="space-y-3">
              {pastEvents.map(event => {
                const Icon = event.icon;
                return (
                  <div key={event.id} className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0"><Icon className="w-4 h-4 text-green-600" /></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{event.title}</p>
                      <p className="text-xs text-gray-500">{event.date}</p>
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
    if (selectedLegalDoc) {
      return <LegalDocDetailView doc={selectedLegalDoc} />;
    }

    const currentDocs = legalDocuments.filter(d => d.status === 'current').length;
    const needsReview = legalDocuments.filter(d => d.status === 'needs-review' || d.status === 'outdated').length;
    const notEstablished = legalDocuments.filter(d => d.status === 'not-established').length;

    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Legal & Estate</h1>
          <p className="text-gray-600">Keeps your legal documents current, aligned, and ready when it matters.</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center"><FileText className="w-5 h-5 text-blue-600" /></div>
              <span className="text-sm text-gray-600">Total Documents</span>
            </div>
            <p className="text-3xl font-bold text-gray-900">{legalDocuments.length}</p>
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

        {/* Attorney Contact */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-xl bg-gray-100 flex items-center justify-center">
                <Briefcase className="w-7 h-7 text-gray-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">{attorney.name}</h2>
                <p className="text-gray-600">{attorney.firm}</p>
                <p className="text-sm text-gray-500">{attorney.specialty}</p>
                <div className="flex items-center gap-4 mt-3 text-sm">
                  <a href={`tel:${attorney.phone}`} className="flex items-center gap-1 text-gray-600 hover:text-gray-900">
                    <Phone className="w-4 h-4" />{attorney.phone}
                  </a>
                  <a href={`mailto:${attorney.email}`} className="flex items-center gap-1 hover:text-yellow-600" style={{ color: '#C9A24D' }}>
                    <Mail className="w-4 h-4" />{attorney.email}
                  </a>
                </div>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">Last Contact</p>
              <p className="font-medium text-orange-600">{attorney.lastContact}</p>
            </div>
          </div>
        </div>

        {/* Documents List */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Estate Documents</h2>
            <button 
              onClick={() => setShowDocumentUpload(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-gray-100"
              style={{ color: '#C9A24D' }}
            >
              <Plus className="w-4 h-4" />Add Document
            </button>
          </div>
          <div className="divide-y divide-gray-100">
            {legalDocuments.map(doc => {
              const Icon = doc.icon;
              return (
                <div 
                  key={doc.id}
                  onClick={() => setSelectedLegalDoc(doc)}
                  className="px-6 py-4 hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${getStatusColor(doc.status).split(' ')[1]}`}>
                        <Icon className={`w-5 h-5 ${getStatusColor(doc.status).split(' ')[0]}`} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium text-gray-900">{doc.name}</h3>
                          <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getStatusColor(doc.status)}`}>
                            {doc.status === 'not-established' ? 'Not Established' : doc.status === 'needs-review' ? 'Needs Review' : doc.status === 'outdated' ? 'Outdated' : 'Current'}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500">Last updated: {doc.lastUpdated}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {doc.recommendations.length > 0 && (
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                          {doc.recommendations.length} recommendation{doc.recommendations.length > 1 ? 's' : ''}
                        </span>
                      )}
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Priority Alert */}
        <div className="bg-red-50 border border-red-200 rounded-xl p-5">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h3 className="font-semibold text-red-900 mb-1">Revocable Trust Needed</h3>
              <p className="text-sm text-red-800 mb-3">
                With a net worth of $2.8M, you should establish a revocable living trust. Without one, your estate 
                will go through probateâ€”costing an estimated $15,000-$40,000 and becoming public record.
              </p>
              <button className="text-sm font-medium text-red-800 hover:text-red-900 flex items-center gap-1">
                Schedule Attorney Consultation <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Legal Document Detail View
  const LegalDocDetailView: React.FC<{ doc: LegalDocument }> = ({ doc }) => {
    const Icon = doc.icon;
    return (
      <div className="space-y-6">
        <button onClick={() => setSelectedLegalDoc(null)} className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
          <ArrowLeft className="w-4 h-4" /><span className="text-sm font-medium">Back to Legal</span>
        </button>

        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${getStatusColor(doc.status).split(' ')[1]}`}>
                <Icon className={`w-7 h-7 ${getStatusColor(doc.status).split(' ')[0]}`} />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{doc.name}</h1>
                <p className="text-gray-600">Last updated: {doc.lastUpdated}</p>
              </div>
            </div>
            <span className={`px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(doc.status)}`}>
              {doc.status === 'not-established' ? 'Not Established' : doc.status === 'needs-review' ? 'Needs Review' : doc.status === 'outdated' ? 'Outdated' : 'Current'}
            </span>
          </div>

          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <h3 className="font-medium text-gray-900 mb-2">Summary</h3>
            <p className="text-sm text-gray-700">{doc.summary}</p>
          </div>

          {doc.recommendations.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3 mb-3">
                <Info className="w-5 h-5 text-blue-600 mt-0.5" />
                <h3 className="font-semibold text-blue-900">Recommendations</h3>
              </div>
              <div className="space-y-2 ml-8">
                {doc.recommendations.map((rec, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-blue-800">{rec}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Document Files */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Documents</h2>
            <button onClick={() => setShowDocumentUpload(true)} className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-gray-100" style={{ color: '#C9A24D' }}>
              <Upload className="w-4 h-4" />Upload
            </button>
          </div>
          {doc.documents.length === 0 ? (
            <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-lg">
              <File className="w-10 h-10 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-500">No documents uploaded</p>
              <button onClick={() => setShowDocumentUpload(true)} className="text-sm font-medium mt-2" style={{ color: '#C9A24D' }}>Upload a document</button>
            </div>
          ) : (
            <div className="space-y-2">{/* Document list would go here */}</div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button className="flex-1 px-4 py-3 rounded-lg text-white font-medium hover:opacity-90" style={{ backgroundColor: '#C9A24D' }}>
            <span className="flex items-center justify-center gap-2"><Edit3 className="w-5 h-5" />Schedule Review with Attorney</span>
          </button>
          <button className="px-4 py-3 rounded-lg border border-gray-200 text-gray-700 font-medium hover:bg-gray-50">
            <span className="flex items-center justify-center gap-2"><Download className="w-5 h-5" />Download All</span>
          </button>
        </div>
      </div>
    );
  };

  // Home Section View
  const HomeView: React.FC = () => {
    if (selectedAsset) {
      return <AssetDetailView asset={selectedAsset} />;
    }

    const totalReplacementValue = homeAssets.reduce((sum, a) => sum + a.estimatedReplacementCost, 0);
    const needsAttention = homeAssets.filter(a => a.condition === 'fair' || a.condition === 'poor' || a.condition === 'replace-soon').length;

    // Calculate planned expenses by year
    const plannedExpenses: { year: number; items: { name: string; cost: number }[] }[] = [];
    homeAssets.forEach(asset => {
      const yearsRemaining = asset.expectedLifespan - asset.currentAge;
      const replacementYear = 2026 + yearsRemaining;
      const existing = plannedExpenses.find(p => p.year === replacementYear);
      if (existing) {
        existing.items.push({ name: asset.name, cost: asset.estimatedReplacementCost });
      } else {
        plannedExpenses.push({ year: replacementYear, items: [{ name: asset.name, cost: asset.estimatedReplacementCost }] });
      }
    });
    plannedExpenses.sort((a, b) => a.year - b.year);

    const assetCategories = [
      { id: 'hvac', label: 'HVAC', icon: Thermometer },
      { id: 'roof', label: 'Roof & Structure', icon: Building },
      { id: 'plumbing', label: 'Plumbing', icon: Droplets },
      { id: 'appliance', label: 'Appliances', icon: Refrigerator },
      { id: 'exterior', label: 'Exterior', icon: Home }
    ];

    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Home & Assets</h1>
          <p className="text-gray-600">Turns reactive maintenance into a proactive, planned system.</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center"><Wrench className="w-5 h-5 text-blue-600" /></div>
              <span className="text-sm text-gray-600">Assets Tracked</span>
            </div>
            <p className="text-3xl font-bold text-gray-900">{homeAssets.length}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center"><DollarSign className="w-5 h-5 text-green-600" /></div>
              <span className="text-sm text-gray-600">Replacement Value</span>
            </div>
            <p className="text-3xl font-bold text-gray-900">${totalReplacementValue.toLocaleString()}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-yellow-100 flex items-center justify-center"><AlertTriangle className="w-5 h-5 text-yellow-600" /></div>
              <span className="text-sm text-gray-600">Needs Attention</span>
            </div>
            <p className="text-3xl font-bold text-gray-900">{needsAttention}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgba(201, 162, 77, 0.2)' }}>
                <Calendar className="w-5 h-5" style={{ color: '#C9A24D' }} />
              </div>
              <span className="text-sm text-gray-600">Next Major Expense</span>
            </div>
            <p className="text-lg font-bold text-gray-900">HVAC - 2028</p>
            <p className="text-sm text-gray-500">Est. $8,500</p>
          </div>
        </div>

        {/* Assets by Category */}
        {assetCategories.map(category => {
          const categoryAssets = homeAssets.filter(a => a.category === category.id);
          if (categoryAssets.length === 0) return null;
          const CategoryIcon = category.icon;

          return (
            <div key={category.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
                <CategoryIcon className="w-5 h-5" style={{ color: '#C9A24D' }} />
                <h2 className="text-lg font-semibold text-gray-900">{category.label}</h2>
                <span className="text-sm text-gray-500">({categoryAssets.length})</span>
              </div>
              <div className="divide-y divide-gray-100">
                {categoryAssets.map(asset => {
                  const Icon = asset.icon;
                  const percentLife = Math.round((asset.currentAge / asset.expectedLifespan) * 100);
                  return (
                    <div key={asset.id} onClick={() => setSelectedAsset(asset)} className="px-6 py-4 hover:bg-gray-50 cursor-pointer transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${getConditionColor(asset.condition).split(' ')[1]}`}>
                            <Icon className={`w-5 h-5 ${getConditionColor(asset.condition).split(' ')[0]}`} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-medium text-gray-900">{asset.name}</h3>
                              <span className={`px-2 py-0.5 text-xs font-medium rounded-full capitalize ${getConditionColor(asset.condition)}`}>{asset.condition.replace('-', ' ')}</span>
                            </div>
                            <p className="text-sm text-gray-500">{asset.brand} {asset.model && `â€¢ ${asset.model}`}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-6">
                          <div className="text-right">
                            <div className="flex items-center gap-2">
                              <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div className={`h-full rounded-full ${percentLife >= 80 ? 'bg-red-500' : percentLife >= 60 ? 'bg-yellow-500' : 'bg-green-500'}`} style={{ width: `${Math.min(percentLife, 100)}%` }} />
                              </div>
                              <span className="text-xs text-gray-500">{asset.currentAge}/{asset.expectedLifespan} yrs</span>
                            </div>
                            <p className="text-sm text-gray-600 mt-1">Replace ~${asset.estimatedReplacementCost.toLocaleString()}</p>
                          </div>
                          <ChevronRight className="w-5 h-5 text-gray-400" />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* Add Asset Button */}
        <button onClick={() => setShowDocumentUpload(true)} className="w-full py-4 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 hover:border-yellow-500 hover:text-yellow-600 transition-colors flex items-center justify-center gap-2">
          <Plus className="w-5 h-5" />Add New Asset
        </button>

        {/* Expense Timeline - Now at bottom */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Planned Replacement Timeline</h2>
          <div className="space-y-4">
            {plannedExpenses.slice(0, 5).map(period => (
              <div key={period.year} className="flex items-start gap-4">
                <div className="w-16 text-center">
                  <span className={`text-lg font-bold ${period.year <= 2028 ? 'text-yellow-600' : 'text-gray-400'}`}>{period.year}</span>
                </div>
                <div className="flex-1">
                  <div className="flex flex-wrap gap-2">
                    {period.items.map((item, idx) => (
                      <div key={idx} className={`px-3 py-2 rounded-lg text-sm ${period.year <= 2028 ? 'bg-yellow-50 border border-yellow-200' : 'bg-gray-50 border border-gray-200'}`}>
                        <span className="font-medium text-gray-900">{item.name}</span>
                        <span className="text-gray-500 ml-2">${item.cost.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-semibold text-gray-900">
                    ${period.items.reduce((sum, i) => sum + i.cost, 0).toLocaleString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // Asset Detail View
  const AssetDetailView: React.FC<{ asset: HomeAsset }> = ({ asset }) => {
    const Icon = asset.icon;
    const percentLife = Math.round((asset.currentAge / asset.expectedLifespan) * 100);

    return (
      <div className="space-y-6">
        <button onClick={() => setSelectedAsset(null)} className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
          <ArrowLeft className="w-4 h-4" /><span className="text-sm font-medium">Back to Home</span>
        </button>

        {/* Asset Header */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${getConditionColor(asset.condition).split(' ')[1]}`}>
                <Icon className={`w-7 h-7 ${getConditionColor(asset.condition).split(' ')[0]}`} />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{asset.name}</h1>
                <p className="text-gray-600">{asset.brand} {asset.model}</p>
              </div>
            </div>
            <span className={`px-3 py-1 text-sm font-medium rounded-full capitalize ${getConditionColor(asset.condition)}`}>{asset.condition.replace('-', ' ')}</span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-xs text-gray-500 mb-1">Installed</p>
              <p className="font-semibold text-gray-900">{asset.installDate}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-xs text-gray-500 mb-1">Age / Lifespan</p>
              <p className="font-semibold text-gray-900">{asset.currentAge} / {asset.expectedLifespan} years</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-xs text-gray-500 mb-1">Est. Replacement</p>
              <p className="font-semibold text-gray-900">${asset.estimatedReplacementCost.toLocaleString()}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-xs text-gray-500 mb-1">Warranty</p>
              <p className={`font-semibold ${asset.warrantyExpires && new Date(asset.warrantyExpires) < new Date() ? 'text-red-600' : 'text-gray-900'}`}>
                {asset.warrantyExpires || 'N/A'}
              </p>
            </div>
          </div>

          {/* Life Progress Bar */}
          <div className="mt-6">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-gray-600">Estimated Life Remaining</span>
              <span className="font-medium text-gray-900">{asset.expectedLifespan - asset.currentAge} years</span>
            </div>
            <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
              <div className={`h-full rounded-full ${percentLife >= 80 ? 'bg-red-500' : percentLife >= 60 ? 'bg-yellow-500' : 'bg-green-500'}`} style={{ width: `${Math.min(percentLife, 100)}%` }} />
            </div>
          </div>
        </div>

        {/* Maintenance History */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Maintenance History</h2>
            <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-gray-100" style={{ color: '#C9A24D' }}>
              <Plus className="w-4 h-4" />Add Record
            </button>
          </div>
          {asset.maintenanceHistory.length === 0 ? (
            <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-lg">
              <Wrench className="w-10 h-10 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-500">No maintenance records</p>
            </div>
          ) : (
            <div className="space-y-3">
              {asset.maintenanceHistory.map(record => (
                <div key={record.id} className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    record.type === 'repair' ? 'bg-orange-100' : record.type === 'replacement' ? 'bg-red-100' : record.type === 'inspection' ? 'bg-blue-100' : 'bg-green-100'
                  }`}>
                    <Wrench className={`w-4 h-4 ${
                      record.type === 'repair' ? 'text-orange-600' : record.type === 'replacement' ? 'text-red-600' : record.type === 'inspection' ? 'text-blue-600' : 'text-green-600'
                    }`} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">{record.description}</span>
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full capitalize ${
                        record.type === 'repair' ? 'bg-orange-100 text-orange-800' : record.type === 'replacement' ? 'bg-red-100 text-red-800' : record.type === 'inspection' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                      }`}>{record.type}</span>
                    </div>
                    <p className="text-sm text-gray-500">{record.date} {record.provider && `â€¢ ${record.provider}`}</p>
                    {record.notes && <p className="text-sm text-gray-600 mt-1">{record.notes}</p>}
                  </div>
                  <div className="text-right">
                    <span className="font-semibold text-gray-900">${record.cost}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Documents */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Documents</h2>
            <button onClick={() => setShowDocumentUpload(true)} className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-gray-100" style={{ color: '#C9A24D' }}>
              <Upload className="w-4 h-4" />Upload
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button className="p-4 border-2 border-dashed border-gray-200 rounded-lg hover:border-yellow-500 transition-colors text-center">
              <FileText className="w-6 h-6 text-gray-400 mx-auto mb-2" />
              <p className="text-sm font-medium text-gray-600">Warranty</p>
            </button>
            <button className="p-4 border-2 border-dashed border-gray-200 rounded-lg hover:border-yellow-500 transition-colors text-center">
              <FileText className="w-6 h-6 text-gray-400 mx-auto mb-2" />
              <p className="text-sm font-medium text-gray-600">Invoice</p>
            </button>
            <button className="p-4 border-2 border-dashed border-gray-200 rounded-lg hover:border-yellow-500 transition-colors text-center">
              <FileText className="w-6 h-6 text-gray-400 mx-auto mb-2" />
              <p className="text-sm font-medium text-gray-600">Manual</p>
            </button>
          </div>
        </div>

        {/* Recommendation */}
        {(asset.condition === 'fair' || asset.condition === 'poor' || asset.condition === 'replace-soon') && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-5">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-yellow-100 flex items-center justify-center flex-shrink-0">
                <Info className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <h3 className="font-semibold text-yellow-900 mb-1">Planning Recommendation</h3>
                <p className="text-sm text-yellow-800">
                  Based on the age and condition of this {asset.name.toLowerCase()}, we recommend starting a replacement fund. 
                  Saving ${Math.round(asset.estimatedReplacementCost / ((asset.expectedLifespan - asset.currentAge) * 12))}/month 
                  would fully fund the replacement by the expected end of life.
                </p>
              </div>
            </div>
          </div>
        )}
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
            <p className="text-gray-600">Your complete document repository with version history</p>
          </div>
          <button onClick={() => setShowDocumentUpload(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg text-white font-medium hover:opacity-90" style={{ backgroundColor: '#C9A24D' }}>
            <Upload className="w-4 h-4" />Upload Document
          </button>
        </div>

        {/* Search and Filter */}
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input type="text" placeholder="Search documents..." className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-yellow-500 focus:border-transparent" />
          </div>
          <button className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 hover:bg-gray-50">
            <Filter className="w-4 h-4 text-gray-500" />
            <span className="text-gray-700">Filter</span>
          </button>
        </div>

        {/* Documents List */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="divide-y divide-gray-100">
            {allDocuments.map(doc => (
              <div key={doc.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${getStatusColor(doc.status).split(' ')[1]}`}>
                      <doc.icon className={`w-5 h-5 ${getStatusColor(doc.status).split(' ')[0]}`} />
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">{doc.name}</h3>
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <span className="capitalize">{doc.category}</span>
                        <span>â€¢</span>
                        <span>{doc.type}</span>
                        <span>â€¢</span>
                        <span>Modified {doc.lastModified}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {doc.versions.length > 1 && (
                      <button onClick={() => setSelectedDocument(doc)} className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium text-gray-500 hover:bg-gray-100">
                        <History className="w-3.5 h-3.5" />
                        {doc.versions.length} versions
                      </button>
                    )}
                    <button className="p-2 hover:bg-gray-100 rounded-lg"><Eye className="w-4 h-4 text-gray-500" /></button>
                    <button className="p-2 hover:bg-gray-100 rounded-lg"><Download className="w-4 h-4 text-gray-500" /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // Profile View (simplified for brevity)
  const ProfileView: React.FC = () => (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold text-gray-900 mb-1">Profile Settings</h1><p className="text-gray-600">Manage your account, security, and subscription</p></div>
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="flex items-center gap-6">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-yellow-600 to-yellow-500 flex items-center justify-center"><span className="text-3xl font-bold text-white">AB</span></div>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-gray-900">Adam Bailey</h2>
            <p className="text-gray-600">Premium Member since January 2024</p>
            <div className="flex items-center gap-2 mt-2"><span className="px-2.5 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">Pro Plan</span><span className="text-sm text-gray-500">â€¢ Household of 4</span></div>
          </div>
          <div className="flex items-center gap-3">
  <button className="px-4 py-2 rounded-lg border border-gray-200 text-gray-700 font-medium hover:bg-gray-50 flex items-center gap-2"><Edit3 className="w-4 h-4" />Edit Profile</button>
  <button
    onClick={() => supabase.auth.signOut()}
    className="px-4 py-2 rounded-lg border border-red-200 text-red-600 font-medium hover:bg-red-50"
  >Sign Out</button>
</div>
        </div>
      </div>
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100"><h2 className="text-lg font-semibold text-gray-900">Account Information</h2></div>
        <div className="divide-y divide-gray-100">
          {[{ icon: Mail, label: 'Email Address', value: 'adam.bailey@email.com' }, { icon: Phone, label: 'Phone Number', value: '(612) 555-0147' }, { icon: MapPin, label: 'Address', value: '1847 Oakwood Drive, Savage, MN 55378' }].map((item, idx) => (
            <div key={idx} className="px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-4"><div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center"><item.icon className="w-5 h-5 text-gray-600" /></div><div><p className="text-sm text-gray-500">{item.label}</p><p className="font-medium text-gray-900">{item.value}</p></div></div>
              <button className="text-sm font-medium hover:text-yellow-600" style={{ color: '#C9A24D' }}>Change</button>
            </div>
          ))}
        </div>
      </div>
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100"><h2 className="text-lg font-semibold text-gray-900">Subscription & Billing</h2></div>
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div><div className="flex items-center gap-3 mb-1"><h3 className="text-lg font-bold text-gray-900">Pro Plan</h3><span className="px-2.5 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">Active</span></div><p className="text-gray-600">$40/month â€¢ Renews February 15, 2026</p></div>
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

  const PriorityDetailView: React.FC<{ priority: Priority }> = ({ priority }) => (
    <div className="space-y-6">
      <button onClick={() => setSelectedPriority(null)} className="flex items-center gap-2 text-gray-600 hover:text-gray-900"><ArrowLeft className="w-4 h-4" /><span className="text-sm font-medium">Back to Dashboard</span></button>
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
        <div className="flex items-start gap-4 mb-6">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center"><priority.icon className="w-6 h-6" style={{ color: '#C9A24D' }} /></div>
          <div className="flex-1"><h1 className="text-2xl font-bold text-gray-900 mb-2">{priority.title}</h1><div className="flex items-center gap-3 text-sm text-gray-500"><Clock className="w-4 h-4" />{priority.urgency}</div></div>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6"><div className="flex items-start gap-3"><Info className="w-5 h-5 text-blue-600 mt-0.5" /><div><h3 className="font-semibold text-blue-900 mb-1">Why This Matters</h3><p className="text-sm text-blue-800">{priority.rationale}</p></div></div></div>
        <div><h3 className="text-lg font-semibold text-gray-900 mb-4">Recommendations</h3><div className="space-y-4">{priority.recommendations.map((rec, index) => (<div key={index} className="bg-white border border-gray-200 rounded-xl p-5"><h4 className="font-semibold text-gray-900 mb-1">{rec.title}</h4>{rec.savings && <div className="text-sm font-semibold mb-2" style={{ color: '#C9A24D' }}>Save ${rec.savings}/year</div>}<p className="text-sm text-gray-600 mb-2">{rec.description}</p><p className="text-sm text-gray-700">{rec.impact}</p></div>))}</div></div>
      </div>
    </div>
  );

  // Insurance View (simplified)
  const InsuranceView: React.FC = () => {
    if (selectedPolicy) {
      const Icon = selectedPolicy.icon;
      const annualPremium = selectedPolicy.premiumFrequency === 'monthly' ? selectedPolicy.premium * 12 : selectedPolicy.premiumFrequency === 'quarterly' ? selectedPolicy.premium * 4 : selectedPolicy.premium;
      return (
        <div className="space-y-6">
          <button onClick={() => setSelectedPolicy(null)} className="flex items-center gap-2 text-gray-600 hover:text-gray-900"><ArrowLeft className="w-4 h-4" /><span className="text-sm font-medium">Back to Insurance</span></button>
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-4"><div className={`w-14 h-14 rounded-xl flex items-center justify-center ${selectedPolicy.status === 'action-needed' ? 'bg-red-100' : selectedPolicy.status === 'expiring-soon' ? 'bg-yellow-100' : 'bg-gray-100'}`}><Icon className={`w-7 h-7 ${selectedPolicy.status === 'action-needed' ? 'text-red-600' : selectedPolicy.status === 'expiring-soon' ? 'text-yellow-600' : 'text-gray-600'}`} /></div><div><h1 className="text-2xl font-bold text-gray-900">{selectedPolicy.name}</h1><p className="text-gray-600">{selectedPolicy.carrier}</p></div></div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[{ label: 'Policy Number', value: selectedPolicy.policyNumber }, { label: 'Annual Premium', value: `$${annualPremium.toLocaleString()}` }, { label: 'Deductible', value: `$${selectedPolicy.deductible.toLocaleString()}` }, { label: 'Renewal Date', value: selectedPolicy.renewalDate }].map((item, idx) => (
                <div key={idx} className="bg-gray-50 rounded-lg p-4"><p className="text-xs text-gray-500 mb-1">{item.label}</p><p className="font-semibold text-gray-900">{item.value}</p></div>
              ))}
            </div>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-6"><h2 className="text-lg font-semibold text-gray-900 mb-4">Coverage Details</h2><div className="space-y-3">{Object.entries(selectedPolicy.details).map(([key, value]) => (<div key={key} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"><span className="text-gray-600">{key}</span><span className="font-medium text-gray-900">{value}</span></div>))}</div></div>
          {selectedPolicy.recommendations && selectedPolicy.recommendations.length > 0 && (<div className="bg-blue-50 border border-blue-200 rounded-xl p-6"><div className="flex items-start gap-3 mb-4"><Info className="w-5 h-5 text-blue-600 mt-0.5" /><h2 className="text-lg font-semibold text-blue-900">Recommendations</h2></div><div className="space-y-3">{selectedPolicy.recommendations.map((rec, index) => (<div key={index} className="flex items-start gap-3"><CheckCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" /><p className="text-sm text-blue-800">{rec}</p></div>))}</div></div>)}
        </div>
      );
    }

    const totalAnnualPremium = insurancePolicies.reduce((sum, p) => { const annual = p.premiumFrequency === 'monthly' ? p.premium * 12 : p.premiumFrequency === 'quarterly' ? p.premium * 4 : p.premium; return sum + annual; }, 0);
    const policyTypes = [{ type: 'home', label: 'Home', icon: Building }, { type: 'auto', label: 'Auto', icon: Car }, { type: 'umbrella', label: 'Umbrella', icon: Umbrella }, { type: 'life', label: 'Life', icon: Heart }];

    return (
      <div className="space-y-6">
        <div><h1 className="text-2xl font-bold text-gray-900 mb-1">Insurance & Risk</h1><p className="text-gray-600">Maintains a living view of coverage across all policies.</p></div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white border border-gray-200 rounded-xl p-5"><div className="flex items-center gap-3 mb-3"><div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center"><Shield className="w-5 h-5 text-blue-600" /></div><span className="text-sm text-gray-600">Active Policies</span></div><p className="text-3xl font-bold text-gray-900">{insurancePolicies.length}</p></div>
          <div className="bg-white border border-gray-200 rounded-xl p-5"><div className="flex items-center gap-3 mb-3"><div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center"><DollarSign className="w-5 h-5 text-green-600" /></div><span className="text-sm text-gray-600">Annual Premium</span></div><p className="text-3xl font-bold text-gray-900">${totalAnnualPremium.toLocaleString()}</p></div>
          <div className="bg-white border border-gray-200 rounded-xl p-5"><div className="flex items-center gap-3 mb-3"><div className="w-10 h-10 rounded-lg bg-yellow-100 flex items-center justify-center"><AlertTriangle className="w-5 h-5 text-yellow-600" /></div><span className="text-sm text-gray-600">Need Attention</span></div><p className="text-3xl font-bold text-gray-900">{insurancePolicies.filter(p => p.status === 'expiring-soon' || p.status === 'action-needed').length}</p></div>
          <div className="bg-white border border-gray-200 rounded-xl p-5"><div className="flex items-center gap-3 mb-3"><div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgba(201, 162, 77, 0.2)' }}><TrendingUp className="w-5 h-5" style={{ color: '#C9A24D' }} /></div><span className="text-sm text-gray-600">Potential Savings</span></div><p className="text-3xl font-bold" style={{ color: '#C9A24D' }}>$690<span className="text-lg font-normal text-gray-500">/yr</span></p></div>
        </div>
        {policyTypes.map(({ type, label, icon: TypeIcon }) => {
          const typePolicies = insurancePolicies.filter(p => p.type === type);
          if (typePolicies.length === 0) return null;
          return (
            <div key={type} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3"><TypeIcon className="w-5 h-5" style={{ color: '#C9A24D' }} /><h2 className="text-lg font-semibold text-gray-900">{label} Insurance</h2></div>
              <div className="divide-y divide-gray-100">
                {typePolicies.map(policy => {
                  const Icon = policy.icon;
                  const annualPremium = policy.premiumFrequency === 'monthly' ? policy.premium * 12 : policy.premiumFrequency === 'quarterly' ? policy.premium * 4 : policy.premium;
                  return (
                    <div key={policy.id} onClick={() => setSelectedPolicy(policy)} className="px-6 py-4 hover:bg-gray-50 cursor-pointer transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${policy.status === 'action-needed' ? 'bg-red-100' : policy.status === 'expiring-soon' ? 'bg-yellow-100' : 'bg-gray-100'}`}><Icon className={`w-5 h-5 ${policy.status === 'action-needed' ? 'text-red-600' : policy.status === 'expiring-soon' ? 'text-yellow-600' : 'text-gray-600'}`} /></div>
                          <div><div className="flex items-center gap-2"><h3 className="font-medium text-gray-900">{policy.name}</h3>{policy.status !== 'active' && <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${policy.status === 'action-needed' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>{policy.status === 'action-needed' ? 'Action Needed' : 'Renewal Soon'}</span>}</div><p className="text-sm text-gray-500">{policy.carrier} â€¢ {policy.coverage}</p></div>
                        </div>
                        <div className="flex items-center gap-6"><div className="text-right"><p className="font-semibold text-gray-900">${annualPremium.toLocaleString()}/yr</p><p className="text-xs text-gray-500">Renews {policy.renewalDate}</p></div><ChevronRight className="w-5 h-5 text-gray-400" /></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const DashboardView: React.FC = () => {
    if (selectedPriority) return <PriorityDetailView priority={selectedPriority} />;
    const activePriorities = priorities.filter(p => !dismissedPriorities.includes(p.id));
    const dismissedPriorityItems = priorities.filter(p => dismissedPriorities.includes(p.id));

    return (
      <div className="space-y-6">
        <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-xl p-6 text-white shadow-lg">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div><p className="text-sm text-gray-400 mb-1">Welcome back, {activePersona.name.split(' ')[0]}</p><h2 className="text-base font-medium text-gray-300 mb-2">Overall Household Health</h2><div className="flex items-end gap-2"><span className="text-6xl lg:text-7xl font-bold">{data?.household?.health_score ?? activePersona.score}</span><span className="text-2xl text-gray-400 pb-2">/100</span></div><p className="text-xs text-gray-400 mt-2">{activePersona.score >= 80 ? 'Excellent - household is well optimized' : activePersona.score >= 60 ? 'Good - some areas need attention' : 'Needs attention - multiple areas require action'}</p></div>
            <div className="flex-1 lg:max-w-xl"><p className="text-xs text-gray-400 mb-3 lg:text-right">Section Scores</p><div className="flex flex-wrap justify-start lg:justify-end gap-1">{householdSections.map(section => <SectionScoreCard key={section.id} section={section} compact />)}</div></div>
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
    const totalIncome = taxDocuments.filter(d => ['w2', '1099'].includes(d.type) && d.amount).reduce((sum, d) => sum + (d.amount || 0), 0);
    const totalContributions = charitableContributions.reduce((sum, c) => sum + c.amount, 0);
    const totalBusinessExpenses = businessExpenses.reduce((sum, e) => sum + e.amount, 0);
    const potentialSavings = taxRecommendations.reduce((sum, r) => sum + (r.potentialSavings || 0), 0);
    const pendingDocs = taxDocuments.filter(d => d.status === 'pending').length;

    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Tax Planning</h1>
          <p className="text-gray-600">Planning, filing coordination, and record retention to streamline filings and optimize strategy.</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Gross Income — links to Finances to update income */}
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center"><DollarSign className="w-5 h-5 text-blue-600" /></div>
              <span className="text-sm text-gray-600">2025 Gross Income</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">${totalIncome.toLocaleString()}</p>
            <button
              onClick={() => setActiveView('finances')}
              className="mt-2 text-xs font-medium hover:underline"
              style={{ color: '#C9A24D' }}
            >
              Update income →
            </button>
          </div>
          {/* Charitable Giving — scrolls to contributions section */}
          <button
            className="bg-white border border-gray-200 rounded-xl p-5 text-left hover:border-green-300 hover:shadow-sm transition-all cursor-pointer"
            onClick={() => document.getElementById('charitable-contributions')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center"><Heart className="w-5 h-5 text-green-600" /></div>
              <span className="text-sm text-gray-600">Charitable Giving</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">${totalContributions.toLocaleString()}</p>
            <p className="mt-2 text-xs text-gray-400">Click to add / upload contributions</p>
          </button>
          {/* Business Expenses — scrolls to expenses section */}
          <button
            className="bg-white border border-gray-200 rounded-xl p-5 text-left hover:border-purple-300 hover:shadow-sm transition-all cursor-pointer"
            onClick={() => document.getElementById('business-expenses')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center"><Briefcase className="w-5 h-5 text-purple-600" /></div>
              <span className="text-sm text-gray-600">Business Expenses</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">${totalBusinessExpenses.toLocaleString()}</p>
            <p className="mt-2 text-xs text-gray-400">Click to add / upload expenses</p>
          </button>
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgba(201, 162, 77, 0.2)' }}>
                <TrendingUp className="w-5 h-5" style={{ color: '#C9A24D' }} />
              </div>
              <span className="text-sm text-gray-600">Potential Savings</span>
            </div>
            <p className="text-2xl font-bold" style={{ color: '#C9A24D' }}>${potentialSavings.toLocaleString()}</p>
          </div>
        </div>

        {/* CPA Contact */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-xl bg-gray-100 flex items-center justify-center">
                <Briefcase className="w-7 h-7 text-gray-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">{cpaTaxProfessional.name}</h2>
                <p className="text-gray-600">{cpaTaxProfessional.firm}</p>
                <div className="flex items-center gap-4 mt-3 text-sm">
                  <a href={`tel:${cpaTaxProfessional.phone}`} className="flex items-center gap-1 text-gray-600 hover:text-gray-900">
                    <Phone className="w-4 h-4" />{cpaTaxProfessional.phone}
                  </a>
                  <a href={`mailto:${cpaTaxProfessional.email}`} className="flex items-center gap-1 hover:text-yellow-600" style={{ color: '#C9A24D' }}>
                    <Mail className="w-4 h-4" />{cpaTaxProfessional.email}
                  </a>
                </div>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">Last Filing</p>
              <p className="font-medium text-green-600">{cpaTaxProfessional.lastFiling}</p>
            </div>
          </div>
        </div>

        {/* Tax Recommendations */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Tax Optimization Recommendations</h2>
            <span className="text-sm text-gray-500">{taxRecommendations.filter(r => !dismissedTaxRecs.includes(r.id)).length} opportunities</span>
          </div>
          <div className="divide-y divide-gray-100">
            {taxRecommendations.filter(rec => !dismissedTaxRecs.includes(rec.id)).map(rec => (
              <div key={rec.id} className="px-6 py-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${rec.priority === 'high' ? 'bg-red-100' : rec.priority === 'medium' ? 'bg-yellow-100' : 'bg-blue-100'}`}>
                      <TrendingUp className={`w-5 h-5 ${rec.priority === 'high' ? 'text-red-600' : rec.priority === 'medium' ? 'text-yellow-600' : 'text-blue-600'}`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-gray-900">{rec.title}</h3>
                        <span className={`px-2 py-0.5 text-xs font-medium rounded-full capitalize ${rec.priority === 'high' ? 'bg-red-100 text-red-800' : rec.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' : 'bg-blue-100 text-blue-800'}`}>{rec.priority}</span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{rec.description}</p>
                      {rec.deadline && <p className="text-xs text-gray-500 mt-1">Deadline: {rec.deadline}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 ml-4 flex-shrink-0">
                    {rec.potentialSavings && rec.potentialSavings > 0 && (
                      <p className="font-semibold" style={{ color: '#C9A24D' }}>Save ${rec.potentialSavings.toLocaleString()}</p>
                    )}
                    <button
                      onClick={() => setDismissedTaxRecs(prev => [...prev, rec.id])}
                      className="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                      title="Dismiss"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {taxRecommendations.every(r => dismissedTaxRecs.includes(r.id)) && (
              <div className="px-6 py-8 text-center text-gray-400 text-sm">
                All recommendations dismissed.{' '}
                <button onClick={() => setDismissedTaxRecs([])} className="underline hover:text-gray-600">Restore all</button>
              </div>
            )}
          </div>
        </div>

        {/* Tax Law Updates */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900">Tax Law Updates for 2025</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {taxLawUpdates.map(update => (
              <div key={update.id} className="px-6 py-4">
                <div className="flex items-start gap-4">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${update.impact === 'positive' ? 'bg-green-100' : update.impact === 'negative' ? 'bg-red-100' : 'bg-gray-100'}`}>
                    <AlertCircle className={`w-5 h-5 ${update.impact === 'positive' ? 'text-green-600' : update.impact === 'negative' ? 'text-red-600' : 'text-gray-600'}`} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-gray-900">{update.title}</h3>
                      {update.actionRequired && <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">Action Required</span>}
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{update.summary}</p>
                    <p className="text-xs text-gray-500 mt-1">Effective: {update.effectiveDate}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Tax Documents */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Tax Documents</h2>
              {pendingDocs > 0 && <p className="text-sm text-yellow-600">{pendingDocs} document(s) still pending</p>}
            </div>
            <button onClick={() => setShowDocumentUpload(true)} className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-gray-100" style={{ color: '#C9A24D' }}>
              <Upload className="w-4 h-4" />Upload Document
            </button>
          </div>
          <div className="divide-y divide-gray-100">
            {taxDocuments.map(doc => (
              <div key={doc.id} className="px-6 py-3 hover:bg-gray-50 cursor-pointer">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${doc.status === 'pending' ? 'bg-yellow-100' : doc.status === 'received' ? 'bg-green-100' : doc.status === 'filed' ? 'bg-blue-100' : 'bg-gray-100'}`}>
                      <FileText className={`w-4 h-4 ${doc.status === 'pending' ? 'text-yellow-600' : doc.status === 'received' ? 'text-green-600' : doc.status === 'filed' ? 'text-blue-600' : 'text-gray-600'}`} />
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900 text-sm">{doc.name}</h3>
                      <p className="text-xs text-gray-500">{doc.source || doc.year}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {doc.amount && <span className="text-sm font-medium text-gray-900">${doc.amount.toLocaleString()}</span>}
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full capitalize ${doc.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : doc.status === 'received' ? 'bg-green-100 text-green-800' : doc.status === 'filed' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}>{doc.status}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Charitable Contributions */}
        <div id="charitable-contributions" className="bg-white border border-gray-200 rounded-xl overflow-hidden scroll-mt-6">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Charitable Contributions</h2>
              <p className="text-sm text-gray-500">Tax Year 2025 • {charitableContributions.length} donations</p>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => setShowAddContribution(true)} className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-gray-700">
                <Plus className="w-3.5 h-3.5" /> Add Entry
              </button>
              <button onClick={() => setShowUploadTaxDoc('contributions')} className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg text-white transition-colors" style={{ backgroundColor: '#C9A24D' }}>
                <Upload className="w-3.5 h-3.5" /> Upload Doc
              </button>
            </div>
          </div>
          <div className="divide-y divide-gray-100">
            {charitableContributions.map(contrib => (
              <div key={contrib.id} className="px-6 py-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
                      <Heart className="w-4 h-4 text-green-600" />
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900 text-sm">{contrib.organization}</h3>
                      <p className="text-xs text-gray-500">{contrib.date} â€¢ {contrib.type}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-medium text-gray-900">${contrib.amount.toLocaleString()}</span>
                    {contrib.acknowledged ? (
                      <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-800">Acknowledged</span>
                    ) : (
                      <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">Needs Receipt</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 1099 Business Expenses */}
        <div id="business-expenses" className="bg-white border border-gray-200 rounded-xl overflow-hidden scroll-mt-6">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Consulting Business Expenses (1099)</h2>
              <p className="text-sm text-gray-500">Side business deductions for Schedule C</p>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => setShowAddExpense(true)} className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-gray-700">
                <Plus className="w-3.5 h-3.5" /> Add Entry
              </button>
              <button onClick={() => setShowUploadTaxDoc('expenses')} className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg text-white transition-colors" style={{ backgroundColor: '#C9A24D' }}>
                <Upload className="w-3.5 h-3.5" /> Upload Doc
              </button>
            </div>
          </div>
          <div className="divide-y divide-gray-100">
            {businessExpenses.map(expense => (
              <div key={expense.id} className="px-6 py-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
                      <Briefcase className="w-4 h-4 text-purple-600" />
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900 text-sm">{expense.category}</h3>
                      <p className="text-xs text-gray-500">{expense.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-medium text-gray-900">${expense.amount.toLocaleString()}</span>
                    {expense.receipt ? (
                      <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-800">Receipt</span>
                    ) : (
                      <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-800">No Receipt</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Estimated Tax Savings (24% bracket)</span>
              <span className="font-semibold" style={{ color: '#C9A24D' }}>${Math.round(totalBusinessExpenses * 0.24).toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Key Deadlines */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-5">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-yellow-100 flex items-center justify-center flex-shrink-0">
              <Calendar className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <h3 className="font-semibold text-yellow-900 mb-2">Upcoming Tax Deadlines</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="font-medium text-yellow-900">Q1 Estimated Payment</p>
                  <p className="text-yellow-700">April 15, 2026</p>
                </div>
                <div>
                  <p className="font-medium text-yellow-900">Tax Filing Deadline</p>
                  <p className="text-yellow-700">April 15, 2026</p>
                </div>
                <div>
                  <p className="font-medium text-yellow-900">Extension Deadline</p>
                  <p className="text-yellow-700">October 15, 2026</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Family & Life Administration View
  const FamilyView: React.FC = () => {
    const totalCollegeSavings = collegePlans.reduce((sum, p) => sum + p.currentSavings, 0);
    const totalCollegeTarget = collegePlans.reduce((sum, p) => sum + p.estimatedCost, 0);

    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Family & Life Administration</h1>
          <p className="text-gray-600">Tracks major milestones and proactively prompts updates across all domains.</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center"><Users className="w-5 h-5 text-blue-600" /></div>
              <span className="text-sm text-gray-600">Family Members</span>
            </div>
            <p className="text-3xl font-bold text-gray-900">{familyMembers.length}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center"><Heart className="w-5 h-5 text-purple-600" /></div>
              <span className="text-sm text-gray-600">Aging Parents</span>
            </div>
            <p className="text-3xl font-bold text-gray-900">{agingParents.length}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center"><GraduationCap className="w-5 h-5 text-green-600" /></div>
              <span className="text-sm text-gray-600">College Savings</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">${totalCollegeSavings.toLocaleString()}</p>
            <p className="text-xs text-gray-500">of ${totalCollegeTarget.toLocaleString()} goal</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgba(201, 162, 77, 0.2)' }}>
                <Calendar className="w-5 h-5" style={{ color: '#C9A24D' }} />
              </div>
              <span className="text-sm text-gray-600">Upcoming Events</span>
            </div>
            <p className="text-3xl font-bold text-gray-900">{upcomingLifeEvents.length}</p>
          </div>
        </div>

        {/* Family Members */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900">Household Members</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {familyMembers.map(member => (
              <div key={member.id} className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                      <span className="text-lg font-bold text-gray-600">{member.name.split(' ').map(n => n[0]).join('')}</span>
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">{member.name}</h3>
                      <p className="text-sm text-gray-500">{member.relationship} â€¢ Age {member.age}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    {member.milestones.filter(m => m.type === 'upcoming').length > 0 && (
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                        {member.milestones.filter(m => m.type === 'upcoming').length} upcoming
                      </span>
                    )}
                  </div>
                </div>
                {member.milestones.filter(m => m.type === 'upcoming').length > 0 && (
                  <div className="mt-3 ml-16 space-y-2">
                    {member.milestones.filter(m => m.type === 'upcoming').slice(0, 2).map(milestone => (
                      <div key={milestone.id} className="flex items-center gap-2 text-sm">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-600">{milestone.title}</span>
                        <span className="text-gray-400">â€¢</span>
                        <span className="text-gray-500">{milestone.date}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* College Planning */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <GraduationCap className="w-5 h-5" style={{ color: '#C9A24D' }} />
              College Financial Planning
            </h2>
          </div>
          <div className="divide-y divide-gray-100">
            {collegePlans.map((plan, idx) => {
              const progress = Math.round((plan.currentSavings / plan.estimatedCost) * 100);
              const yearsUntil = plan.targetYear - 2026;
              return (
                <div key={idx} className="px-6 py-5">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-medium text-gray-900">{plan.childName}</h3>
                      <p className="text-sm text-gray-500">Target: {plan.targetYear} ({yearsUntil} years)</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-500">{plan.accountType}</p>
                      {plan.onTrack ? (
                        <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-800">On Track</span>
                      ) : (
                        <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">Review Needed</span>
                      )}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Progress</span>
                      <span className="font-medium text-gray-900">${plan.currentSavings.toLocaleString()} of ${plan.estimatedCost.toLocaleString()}</span>
                    </div>
                    <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${progress}%`, backgroundColor: '#C9A24D' }} />
                    </div>
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>{progress}% funded</span>
                      <span>Contributing ${plan.monthlyContribution}/month</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Aging Parents */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900">Aging Parents</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {agingParents.map((parent, idx) => (
              <div key={idx} className="px-6 py-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                      <Heart className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">{parent.name}</h3>
                      <p className="text-sm text-gray-500">{parent.relationship} â€¢ Age {parent.age} â€¢ {parent.location}</p>
                      <p className="text-sm text-gray-600 mt-1">{parent.notes}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${parent.healthStatus === 'Good' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                      {parent.healthStatus}
                    </span>
                    <p className="text-xs text-gray-500 mt-1">Last visit: {parent.lastVisit}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Life Events Timeline */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Upcoming Life Events & Impacts</h2>
          <div className="space-y-4">
            {upcomingLifeEvents.map(event => (
              <div key={event.id} className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgba(201, 162, 77, 0.2)' }}>
                  <Calendar className="w-5 h-5" style={{ color: '#C9A24D' }} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-gray-900">{event.event}</h3>
                    <span className="text-sm text-gray-500">{event.date}</span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{event.impact}</p>
                  <span className={`inline-block mt-2 px-2 py-0.5 text-xs font-medium rounded-full capitalize ${
                    event.category === 'insurance' ? 'bg-blue-100 text-blue-800' : 
                    event.category === 'legal' ? 'bg-purple-100 text-purple-800' : 
                    event.category === 'financial' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  }`}>{event.category}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // Credit & Rewards View
  const CreditView: React.FC = () => {
    const totalCreditLimit = creditCards.reduce((sum, c) => sum + c.creditLimit, 0);
    const totalBalance = creditCards.reduce((sum, c) => sum + c.currentBalance, 0);
    const totalRewardsValue = creditCards.reduce((sum, c) => sum + (c.rewardsType.includes('points') ? c.rewardsBalance * 0.015 : c.rewardsBalance), 0);
    const utilizationRate = Math.round((totalBalance / totalCreditLimit) * 100);
    const monthlyOptimizationSavings = creditRecommendations.reduce((sum, r) => sum + (r.monthlySavings || 0), 0);

    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Credit & Rewards Optimization</h1>
          <p className="text-gray-600">Maximizes value through smarter card selection and spending alignment.</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center"><CreditCard className="w-5 h-5 text-blue-600" /></div>
              <span className="text-sm text-gray-600">Active Cards</span>
            </div>
            <p className="text-3xl font-bold text-gray-900">{creditCards.length}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center"><Sparkles className="w-5 h-5 text-green-600" /></div>
              <span className="text-sm text-gray-600">Rewards Value</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">${Math.round(totalRewardsValue).toLocaleString()}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${utilizationRate < 30 ? 'bg-green-100' : utilizationRate < 50 ? 'bg-yellow-100' : 'bg-red-100'}`}>
                <Target className={`w-5 h-5 ${utilizationRate < 30 ? 'text-green-600' : utilizationRate < 50 ? 'text-yellow-600' : 'text-red-600'}`} />
              </div>
              <span className="text-sm text-gray-600">Utilization</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{utilizationRate}%</p>
            <p className="text-xs text-gray-500">of ${totalCreditLimit.toLocaleString()}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgba(201, 162, 77, 0.2)' }}>
                <TrendingUp className="w-5 h-5" style={{ color: '#C9A24D' }} />
              </div>
              <span className="text-sm text-gray-600">Monthly Opportunity</span>
            </div>
            <p className="text-2xl font-bold" style={{ color: '#C9A24D' }}>+${monthlyOptimizationSavings.toFixed(0)}</p>
          </div>
        </div>

        {/* Credit Cards */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900">Your Credit Cards</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {creditCards.map(card => (
              <div key={card.id} className="px-6 py-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-8 rounded flex items-center justify-center text-white text-xs font-bold ${
                      card.issuer === 'Chase' ? 'bg-blue-600' : card.issuer === 'Amex' ? 'bg-blue-800' : 'bg-gray-600'
                    }`}>
                      {card.issuer.substring(0, 4).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-gray-900">{card.name}</h3>
                        {card.annualFee > 0 && <span className="text-xs text-gray-500">${card.annualFee}/yr</span>}
                      </div>
                      <p className="text-sm text-gray-500">{card.rewardsRate}</p>
                      <div className="flex items-center gap-2 mt-1">
                        {card.bestFor.slice(0, 3).map((use, idx) => (
                          <span key={idx} className="px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-600">{use}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">${card.currentBalance.toLocaleString()}</p>
                    <p className="text-xs text-gray-500">of ${card.creditLimit.toLocaleString()}</p>
                    <p className="text-xs mt-1" style={{ color: '#C9A24D' }}>
                      {card.rewardsType.includes('points') ? `${card.rewardsBalance.toLocaleString()} pts` : `$${card.rewardsBalance}`}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Spending Optimization */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900">Spending Optimization</h2>
            <p className="text-sm text-gray-500">Are you using the right card for each category?</p>
          </div>
          <div className="divide-y divide-gray-100">
            {spendingOptimization.map((cat, idx) => (
              <div key={idx} className="px-6 py-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${cat.optimized ? 'bg-green-100' : 'bg-yellow-100'}`}>
                      {cat.optimized ? <CheckCircle className="w-4 h-4 text-green-600" /> : <AlertTriangle className="w-4 h-4 text-yellow-600" />}
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900 text-sm">{cat.category}</h3>
                      <p className="text-xs text-gray-500">${cat.monthlyAvg}/mo avg</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">{cat.bestCard}</p>
                    {!cat.optimized && (
                      <p className="text-xs text-green-600">+${(cat.potentialRewards - cat.actualRewards).toFixed(2)}/mo potential</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recommendations */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900">Optimization Recommendations</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {creditRecommendations.map(rec => (
              <div key={rec.id} className="px-6 py-4">
                <div className="flex items-start gap-4">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${rec.priority === 'high' ? 'bg-green-100' : rec.priority === 'medium' ? 'bg-blue-100' : 'bg-gray-100'}`}>
                    <Zap className={`w-5 h-5 ${rec.priority === 'high' ? 'text-green-600' : rec.priority === 'medium' ? 'text-blue-600' : 'text-gray-600'}`} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-gray-900">{rec.title}</h3>
                      {rec.monthlySavings && <span className="text-sm font-medium" style={{ color: '#C9A24D' }}>+${rec.monthlySavings}/mo</span>}
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{rec.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // Finances & Budget View
  const FinancesView: React.FC = () => {
    const totalBudgeted = monthlyBudget.reduce((sum, b) => sum + b.budgeted, 0);
    const totalActual = monthlyBudget.reduce((sum, b) => sum + b.actual, 0);
    const variance = totalBudgeted - totalActual;
    const maxBudget = Math.max(...monthlyBudget.map(b => Math.max(b.budgeted, b.actual)));

    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Finances & Budget</h1>
          <p className="text-gray-600">Executive-level view of cash flow, commitments, and upcoming decisions.</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center"><DollarSign className="w-5 h-5 text-blue-600" /></div>
              <span className="text-sm text-gray-600">Monthly Income</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">${financialSummary.monthlyIncome.toLocaleString()}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${variance >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
                {variance >= 0 ? <TrendingUp className="w-5 h-5 text-green-600" /> : <TrendingDown className="w-5 h-5 text-red-600" />}
              </div>
              <span className="text-sm text-gray-600">Budget Variance</span>
            </div>
            <p className={`text-2xl font-bold ${variance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {variance >= 0 ? '+' : ''}{variance < 0 ? '-' : ''}${Math.abs(variance).toLocaleString()}
            </p>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center"><PiggyBank className="w-5 h-5 text-green-600" /></div>
              <span className="text-sm text-gray-600">Savings Rate</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{financialSummary.savingsRate}%</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgba(201, 162, 77, 0.2)' }}>
                <Shield className="w-5 h-5" style={{ color: '#C9A24D' }} />
              </div>
              <span className="text-sm text-gray-600">Emergency Fund</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{financialSummary.monthsOfExpenses.toFixed(1)} mo</p>
            <p className="text-xs text-gray-500">${financialSummary.emergencyFund.toLocaleString()}</p>
          </div>
        </div>

        {/* Budget vs Actual Chart */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Budget vs. Actual - January 2026</h2>
              <p className="text-sm text-gray-500">Spending by category</p>
            </div>
            <div className="flex items-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#C9A24D' }}></div>
                <span className="text-gray-600">Budget</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-gray-400"></div>
                <span className="text-gray-600">Actual</span>
              </div>
            </div>
          </div>
          
          {/* Chart */}
          <div className="space-y-4">
            {monthlyBudget.map((item, idx) => {
              const budgetWidth = (item.budgeted / maxBudget) * 100;
              const actualWidth = (item.actual / maxBudget) * 100;
              const isOver = item.actual > item.budgeted;
              const Icon = item.icon;
              return (
                <div key={idx} className="group">
                  <div className="flex items-center gap-4 mb-2">
                    <div className="w-28 flex items-center gap-2">
                      <Icon className="w-4 h-4 text-gray-500" />
                      <span className="text-sm font-medium text-gray-700">{item.category}</span>
                    </div>
                    <div className="flex-1">
                      <div className="relative h-8">
                        {/* Budget bar (background) */}
                        <div 
                          className="absolute top-1 h-3 rounded-full opacity-30"
                          style={{ width: `${budgetWidth}%`, backgroundColor: item.color }}
                        />
                        {/* Actual bar (foreground) */}
                        <div 
                          className={`absolute top-1 h-3 rounded-full transition-all ${isOver ? 'ring-2 ring-red-300' : ''}`}
                          style={{ width: `${actualWidth}%`, backgroundColor: item.color }}
                        />
                        {/* Budget marker line */}
                        <div 
                          className="absolute top-0 h-5 w-0.5 bg-gray-800"
                          style={{ left: `${budgetWidth}%` }}
                        />
                      </div>
                    </div>
                    <div className="w-32 text-right">
                      <span className={`text-sm font-medium ${isOver ? 'text-red-600' : 'text-gray-900'}`}>
                        ${item.actual.toLocaleString()}
                      </span>
                      <span className="text-sm text-gray-400"> / ${item.budgeted.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Totals */}
          <div className="mt-6 pt-4 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-gray-900">Total</span>
              <div className="text-right">
                <span className={`font-semibold ${totalActual > totalBudgeted ? 'text-red-600' : 'text-gray-900'}`}>
                  ${totalActual.toLocaleString()}
                </span>
                <span className="text-gray-400"> / ${totalBudgeted.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Upcoming Obligations */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900">Upcoming Obligations</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {upcomingObligations.map(ob => (
              <div key={ob.id} className="px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    ob.type === 'tax' ? 'bg-purple-100' : ob.type === 'insurance' ? 'bg-blue-100' : ob.type === 'family' ? 'bg-pink-100' : 'bg-gray-100'
                  }`}>
                    <Calendar className={`w-5 h-5 ${
                      ob.type === 'tax' ? 'text-purple-600' : ob.type === 'insurance' ? 'text-blue-600' : ob.type === 'family' ? 'text-pink-600' : 'text-gray-600'
                    }`} />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">{ob.description}</h3>
                    <p className="text-sm text-gray-500">Due: {ob.dueDate}</p>
                  </div>
                </div>
                <span className="font-semibold text-gray-900">${ob.amount.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Recommendations */}
        {financialRecommendations.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                <Info className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-blue-900 mb-2">Recommendations</h3>
                <div className="space-y-2">
                  {financialRecommendations.map(rec => (
                    <div key={rec.id} className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <span className="text-sm font-medium text-blue-900">{rec.title}:</span>
                        <span className="text-sm text-blue-800 ml-1">{rec.description}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
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
