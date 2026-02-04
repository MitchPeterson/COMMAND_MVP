import React, { useState } from 'react';
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
    { id: 'taxes', icon: Calendar, title: 'Taxes', score: 7.5, status: 'good', summary: 'Working with CPA for annual filing. Estimated quarterly payments current.', keyMetrics: [], items: [] },
    { id: 'family', icon: Users, title: 'Family', score: 8.5, status: 'good', summary: 'School registrations current for both children. Emergency contacts up to date.', keyMetrics: [], items: [] }
  ];

  const overallScore = Math.round(householdSections.reduce((sum, section) => sum + section.score, 0) / householdSections.length * 10);

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
                  legal documents, warranties, and more—then file them in the right place.
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
                      <p className="text-sm text-gray-500">Uploaded by {version.uploadedBy} • {version.fileSize}</p>
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
              { id: 'taxes', label: 'Tax', icon: Calendar },
              { id: 'family', label: 'Family', icon: Users }
            ].map(section => {
              const Icon = section.icon;
              return (
                <button
                  key={section.id}
                  onClick={() => { setActiveView(section.id); setSelectedPriority(null); setSelectedPolicy(null); setSelectedLegalDoc(null); setSelectedAsset(null); }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
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
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                activeView === 'profile' ? 'bg-gray-900 ring-2 ring-yellow-500' : 'bg-gradient-to-br from-yellow-600 to-yellow-500 hover:from-yellow-500 hover:to-yellow-400'
              }`}
            >
              <User className="w-5 h-5 text-white" />
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
              { id: 'taxes', label: 'Tax', icon: Calendar },
              { id: 'family', label: 'Family', icon: Users },
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
                will go through probate—costing an estimated $15,000-$40,000 and becoming public record.
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

        {/* Expense Timeline */}
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
                            <p className="text-sm text-gray-500">{asset.brand} {asset.model && `• ${asset.model}`}</p>
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
                    <p className="text-sm text-gray-500">{record.date} {record.provider && `• ${record.provider}`}</p>
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
                        <span>•</span>
                        <span>{doc.type}</span>
                        <span>•</span>
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
            <div className="flex items-center gap-2 mt-2"><span className="px-2.5 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">Pro Plan</span><span className="text-sm text-gray-500">• Household of 4</span></div>
          </div>
          <button className="px-4 py-2 rounded-lg border border-gray-200 text-gray-700 font-medium hover:bg-gray-50 flex items-center gap-2"><Edit3 className="w-4 h-4" />Edit Profile</button>
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
            <div><div className="flex items-center gap-3 mb-1"><h3 className="text-lg font-bold text-gray-900">Pro Plan</h3><span className="px-2.5 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">Active</span></div><p className="text-gray-600">$40/month • Renews February 15, 2026</p></div>
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
                          <div><div className="flex items-center gap-2"><h3 className="font-medium text-gray-900">{policy.name}</h3>{policy.status !== 'active' && <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${policy.status === 'action-needed' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>{policy.status === 'action-needed' ? 'Action Needed' : 'Renewal Soon'}</span>}</div><p className="text-sm text-gray-500">{policy.carrier} • {policy.coverage}</p></div>
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
            <div><p className="text-sm text-gray-400 mb-1">Welcome back, Adam</p><h2 className="text-base font-medium text-gray-300 mb-2">Overall Household Health</h2><div className="flex items-end gap-2"><span className="text-6xl lg:text-7xl font-bold">{overallScore}</span><span className="text-2xl text-gray-400 pb-2">/100</span></div><p className="text-xs text-gray-400 mt-2">{overallScore >= 80 ? 'Excellent - household is well optimized' : overallScore >= 60 ? 'Good - some areas need attention' : 'Needs attention - multiple areas require action'}</p></div>
            <div className="flex-1 lg:max-w-xl"><p className="text-xs text-gray-400 mb-3 lg:text-right">Section Scores</p><div className="flex flex-wrap justify-start lg:justify-end gap-1">{householdSections.map(section => <SectionScoreCard key={section.id} section={section} compact />)}</div></div>
          </div>
        </div>
        <div><h2 className="text-xl font-semibold text-gray-900 mb-3">Priority Actions</h2>{activePriorities.length > 0 ? <div className="grid gap-3">{activePriorities.map(priority => <PriorityCard key={priority.id} priority={priority} onClick={() => setSelectedPriority(priority)} onDismiss={(e) => dismissPriority(priority.id, e)} />)}</div> : <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center"><CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" /><p className="text-green-800 font-medium">All caught up!</p></div>}</div>
        <TimelineSection />
        {dismissedPriorityItems.length > 0 && <div className="border-t border-gray-200 pt-6"><button onClick={() => setShowDismissed(!showDismissed)} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-3">{showDismissed ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}Dismissed Items ({dismissedPriorityItems.length})</button>{showDismissed && <div className="grid gap-3">{dismissedPriorityItems.map(priority => <PriorityCard key={priority.id} priority={priority} onClick={() => setSelectedPriority(priority)} isDismissed onRestore={(e) => restorePriority(priority.id, e)} />)}</div>}</div>}
      </div>
    );
  };

  const PlaceholderView: React.FC<{ title: string; description: string }> = ({ title, description }) => (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold text-gray-900 mb-1">{title}</h1><p className="text-gray-600">{description}</p></div>
      <div className="bg-white border border-gray-200 rounded-xl p-12 text-center"><div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4"><Wrench className="w-8 h-8 text-gray-400" /></div><h2 className="text-lg font-semibold text-gray-900 mb-2">Coming Soon</h2><p className="text-gray-500 max-w-md mx-auto">This section is under development.</p></div>
    </div>
  );

  const renderView = (): React.ReactNode => {
    switch (activeView) {
      case 'dashboard': return <DashboardView />;
      case 'insurance': return <InsuranceView />;
      case 'legal': return <LegalView />;
      case 'home': return <HomeView />;
      case 'taxes': return <PlaceholderView title="Tax Planning" description="Planning, filing coordination, and record retention to streamline filings and optimize strategy." />;
      case 'family': return <PlaceholderView title="Family & Life Administration" description="Ensures life events trigger the right reviews and updates automatically." />;
      case 'documents': return <DocumentsView />;
      case 'profile': return <ProfileView />;
      default: return <DashboardView />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 to-neutral-100">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">{renderView()}</main>
      {showDocumentUpload && <DocumentUploadModal />}
      {selectedDocument && <DocumentVersionModal document={selectedDocument} />}
    </div>
  );
};

export default CommandApp;
