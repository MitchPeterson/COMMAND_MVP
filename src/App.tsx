import React, { useState } from 'react';
import { 
  Home, 
  Shield, 
  FileText, 
  Wrench, 
  Settings, 
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
  UserCheck,
  CreditCard,
  Bell,
  Lock,
  Mail,
  Phone,
  MapPin,
  Edit3,
  Plus,
  ExternalLink,
  AlertTriangle,
  DollarSign,
  FileCheck,
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

const CommandApp: React.FC = () => {
  const [activeView, setActiveView] = useState<string>('dashboard');
  const [selectedPriority, setSelectedPriority] = useState<Priority | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [dismissedPriorities, setDismissedPriorities] = useState<number[]>([]);
  const [showDismissed, setShowDismissed] = useState<boolean>(false);
  const [selectedPolicy, setSelectedPolicy] = useState<InsurancePolicy | null>(null);

  const dismissPriority = (id: number, e: React.MouseEvent): void => {
    e.stopPropagation();
    setDismissedPriorities(prev => [...prev, id]);
  };

  const restorePriority = (id: number, e: React.MouseEvent): void => {
    e.stopPropagation();
    setDismissedPriorities(prev => prev.filter(pId => pId !== id));
  };

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
        {
          title: 'Increase Deductible',
          savings: 240,
          description: 'Increase deductible from $250 to $500',
          impact: 'Your $15K emergency fund easily covers $500. Saves $240/year.',
        },
        {
          title: 'Shop Competing Carriers',
          savings: 450,
          description: 'Get quotes from Progressive, Geico, Liberty Mutual',
          impact: 'Could save $450/year with identical coverage.',
        }
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
        {
          title: 'Establish Living Trust',
          description: 'With $2.8M net worth, a trust avoids probate',
          impact: 'Saves $15K-$40K in estate costs, maintains privacy',
        }
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
        {
          title: 'Start Replacement Fund',
          description: 'Save $450/month for 18 months',
          impact: 'Eliminates financing costs (~$800 saved)',
        }
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
        {
          title: 'Increase to $2M Coverage',
          description: 'Match coverage to net worth',
          impact: 'Additional ~$150/year for significant protection increase.',
        }
      ]
    }
  ];

  const timelineEvents: TimelineEvent[] = [
    {
      id: 1,
      date: 'Feb 2, 2026',
      title: 'Auto Insurance Renewal',
      category: 'Insurance',
      type: 'upcoming',
      icon: Shield,
      status: 'warning'
    },
    {
      id: 2,
      date: 'Feb 15, 2026',
      title: 'Q1 Estimated Tax Payment Due',
      category: 'Taxes',
      type: 'upcoming',
      icon: Calendar,
      status: 'info'
    },
    {
      id: 3,
      date: 'Mar 1, 2026',
      title: 'Home Insurance Renewal',
      category: 'Insurance',
      type: 'upcoming',
      icon: Shield,
      status: 'info'
    },
    {
      id: 4,
      date: 'Apr 15, 2026',
      title: 'Tax Filing Deadline',
      category: 'Taxes',
      type: 'upcoming',
      icon: Calendar,
      status: 'warning'
    },
    {
      id: 5,
      date: 'Jun 30, 2026',
      title: 'HSA Contribution Review',
      category: 'Healthcare',
      type: 'upcoming',
      icon: Heart,
      status: 'info'
    },
    {
      id: 6,
      date: 'Jan 15, 2026',
      title: 'Q4 Estimated Taxes Paid',
      category: 'Taxes',
      type: 'past',
      icon: Calendar,
      status: 'success'
    },
    {
      id: 7,
      date: 'Jan 10, 2026',
      title: 'Annual Financial Review Completed',
      category: 'Advisory',
      type: 'past',
      icon: TrendingUp,
      status: 'success'
    },
    {
      id: 8,
      date: 'Dec 20, 2025',
      title: 'Emergency Contacts Updated',
      category: 'Family',
      type: 'past',
      icon: Users,
      status: 'success'
    },
    {
      id: 9,
      date: 'Dec 1, 2025',
      title: 'Life Insurance Premium Paid',
      category: 'Insurance',
      type: 'past',
      icon: Shield,
      status: 'success'
    }
  ];

  const householdSections: HouseholdSection[] = [
    {
      id: 'insurance',
      icon: Shield,
      title: 'Insurance',
      score: 6.5,
      status: 'needs-attention',
      summary: 'You have 5 active policies with annual premiums of $5,850. Auto renewal is due in 12 days.',
      keyMetrics: [
        { label: 'Total Annual Premium', value: '$5,850', status: 'neutral' },
        { label: 'Potential Savings', value: '$690/year', status: 'good' },
        { label: 'Policies Up to Date', value: '3 of 5', status: 'warning' }
      ],
      items: [
        { label: 'Auto Insurance', value: 'Renewal due Feb 2', status: 'warning' },
        { label: 'Umbrella Coverage', value: 'Needs review - income doubled', status: 'info' },
        { label: 'Life Insurance', value: 'Adequate for current needs', status: 'good' },
        { label: 'Home Insurance', value: 'Active, renewal in 4 months', status: 'good' }
      ]
    },
    {
      id: 'legal',
      icon: FileText,
      title: 'Legal',
      score: 4.0,
      status: 'critical',
      summary: 'Your estate documents are 6 years old. With $2.8M net worth, you should have a revocable living trust in place.',
      keyMetrics: [
        { label: 'Documents Current', value: '0 of 4', status: 'critical' },
        { label: 'Trust Established', value: 'No', status: 'critical' },
        { label: 'Last Updated', value: 'March 2019', status: 'warning' }
      ],
      items: [
        { label: 'Last Will', value: 'Last updated March 2019', status: 'warning' },
        { label: 'Revocable Trust', value: 'Not established', status: 'critical' },
        { label: 'Healthcare Directive', value: 'Outdated (2019)', status: 'warning' },
        { label: 'Power of Attorney', value: 'In place, needs review', status: 'warning' }
      ]
    },
    {
      id: 'home',
      icon: Wrench,
      title: 'Home',
      score: 7.5,
      status: 'good',
      summary: 'Most systems are in good condition. HVAC is 14 years old and approaching replacement.',
      keyMetrics: [
        { label: 'Systems Monitored', value: '6 major', status: 'good' },
        { label: 'Immediate Attention', value: '0 items', status: 'good' },
        { label: 'Plan Ahead (18mo)', value: '1 item', status: 'info' }
      ],
      items: [
        { label: 'HVAC System', value: '14 years old - plan replacement', status: 'warning' },
        { label: 'Roof', value: 'Replaced 2022 - excellent condition', status: 'good' },
        { label: 'Water Heater', value: '8 years old - monitor', status: 'info' },
        { label: 'Major Appliances', value: 'All functioning well', status: 'good' }
      ]
    },
    {
      id: 'taxes',
      icon: Calendar,
      title: 'Taxes',
      score: 7.5,
      status: 'good',
      summary: 'Working with CPA for annual filing. Estimated quarterly payments current.',
      keyMetrics: [
        { label: '2025 Return', value: 'Filed on time', status: 'good' },
        { label: 'Quarterly Estimates', value: 'Current', status: 'good' },
        { label: 'Effective Tax Rate', value: '24%', status: 'neutral' }
      ],
      items: [
        { label: 'Tax Filing', value: '2025 completed, CPA relationship', status: 'good' },
        { label: 'Estimated Payments', value: 'Q1 2026 paid', status: 'good' },
        { label: 'Tax Strategy', value: 'Review loss harvesting opportunities', status: 'info' },
        { label: 'Records', value: 'Organized, cloud storage', status: 'good' }
      ]
    },
    {
      id: 'family',
      icon: Users,
      title: 'Family',
      score: 8.5,
      status: 'good',
      summary: 'School registrations current for both children. Emergency contacts up to date.',
      keyMetrics: [
        { label: 'School Admin', value: 'Current', status: 'good' },
        { label: 'Emergency Contacts', value: 'Updated', status: 'good' },
        { label: 'Beneficiaries', value: 'Review needed', status: 'info' }
      ],
      items: [
        { label: 'School Registrations', value: 'Both children enrolled for 2026', status: 'good' },
        { label: 'Emergency Contacts', value: 'Updated December 2025', status: 'good' },
        { label: 'Family Calendar', value: 'Shared and synchronized', status: 'good' },
        { label: 'Beneficiary Designations', value: 'Review after income change', status: 'info' }
      ]
    }
  ];

  const overallScore = Math.round(
    householdSections.reduce((sum, section) => sum + section.score, 0) / householdSections.length * 10
  );

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

  const Header: React.FC = () => (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <button 
            onClick={() => { setActiveView('dashboard'); setSelectedPriority(null); setSelectedPolicy(null); }}
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
                  onClick={() => {
                    setActiveView(section.id);
                    setSelectedPriority(null);
                    setSelectedPolicy(null);
                  }}
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
              onClick={() => setActiveView('profile')} 
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                activeView === 'profile' 
                  ? 'bg-gray-900 ring-2 ring-command-gold' 
                  : 'bg-gradient-to-br from-yellow-600 to-yellow-500 hover:from-yellow-500 hover:to-yellow-400'
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
      
      {/* Mobile Menu */}
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
              { id: 'profile', label: 'Profile', icon: User }
            ].map(section => {
              const Icon = section.icon;
              return (
                <button
                  key={section.id}
                  onClick={() => {
                    setActiveView(section.id);
                    setSelectedPriority(null);
                    setSelectedPolicy(null);
                    setMobileMenuOpen(false);
                  }}
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

  // Section Score Card for the dashboard header
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
        <span className={`text-xs text-gray-300 text-center leading-tight ${compact ? 'hidden sm:block' : ''}`}>
          {section.title}
        </span>
        <span className={`text-sm font-bold ${getScoreColor(section.score)}`}>
          {section.score}
        </span>
      </button>
    );
  };

  const PriorityCard: React.FC<{ 
    priority: Priority; 
    onClick: () => void; 
    isDismissed?: boolean; 
    onDismiss?: (e: React.MouseEvent) => void; 
    onRestore?: (e: React.MouseEvent) => void 
  }> = ({ priority, onClick, isDismissed = false, onDismiss, onRestore }) => (
    <div 
      onClick={onClick}
      className={`bg-white border rounded-xl p-5 hover:shadow-lg transition-all cursor-pointer ${
        isDismissed ? 'border-gray-200 opacity-70' : 'border-gray-200 hover:border-gray-300'
      }`}
    >
      <div className="flex items-start gap-4">
        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center flex-shrink-0">
          <priority.icon className="w-5 h-5" style={{ color: '#C9A24D' }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3 mb-1.5">
            <h3 className="font-semibold text-gray-900">{priority.title}</h3>
            <span className={`px-2.5 py-0.5 text-xs font-medium rounded-full whitespace-nowrap flex-shrink-0 ${
              priority.impact === 'Critical' ? 'bg-red-100 text-red-800' :
              priority.impact === 'High' ? 'bg-yellow-100 text-yellow-800' :
              'bg-blue-100 text-blue-800'
            }`}>
              {priority.impact}
            </span>
          </div>
          <p className="text-sm text-gray-600 mb-2 line-clamp-2">{priority.description}</p>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 text-xs text-gray-500">
              <div className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {priority.urgency}
              </div>
              {priority.potentialSavings && (
                <div className="font-semibold" style={{ color: '#C9A24D' }}>
                  Save {priority.potentialSavings}
                </div>
              )}
              {priority.estimatedCost && (
                <div className="text-gray-600 font-medium">
                  Est. {priority.estimatedCost}
                </div>
              )}
            </div>
            {!isDismissed && onDismiss && (
              <button
                onClick={onDismiss}
                className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1 transition-colors"
              >
                <XCircle className="w-3.5 h-3.5" />
                Dismiss
              </button>
            )}
            {isDismissed && onRestore && (
              <button
                onClick={onRestore}
                className="text-xs hover:text-yellow-600 flex items-center gap-1 transition-colors"
                style={{ color: '#C9A24D' }}
              >
                <CheckCircle className="w-3.5 h-3.5" />
                Restore
              </button>
            )}
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
          {/* Upcoming */}
          <div>
            <h4 className="text-sm font-medium text-gray-500 mb-3 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              Upcoming
            </h4>
            <div className="space-y-3">
              {upcomingEvents.map(event => {
                const Icon = event.icon;
                return (
                  <div key={event.id} className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      event.status === 'warning' ? 'bg-yellow-100' :
                      event.status === 'critical' ? 'bg-red-100' :
                      'bg-blue-100'
                    }`}>
                      <Icon className={`w-4 h-4 ${
                        event.status === 'warning' ? 'text-yellow-600' :
                        event.status === 'critical' ? 'text-red-600' :
                        'text-blue-600'
                      }`} />
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

          {/* Recent Activity */}
          <div>
            <h4 className="text-sm font-medium text-gray-500 mb-3 flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              Recent Activity
            </h4>
            <div className="space-y-3">
              {pastEvents.map(event => {
                const Icon = event.icon;
                return (
                  <div key={event.id} className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
                      <Icon className="w-4 h-4 text-green-600" />
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
        </div>
      </div>
    );
  };

  const PriorityDetailView: React.FC<{ priority: Priority }> = ({ priority }) => (
    <div className="space-y-6">
      <button
        onClick={() => setSelectedPriority(null)}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
      >
        <ArrowLeft className="w-4 h-4" />
        <span className="text-sm font-medium">Back to Dashboard</span>
      </button>

      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
        <div className="flex items-start gap-4 mb-6">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
            <priority.icon className="w-6 h-6" style={{ color: '#C9A24D' }} />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">{priority.title}</h1>
            <div className="flex items-center gap-3 text-sm text-gray-500">
              <Clock className="w-4 h-4" />
              {priority.urgency}
            </div>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <h3 className="font-semibold text-blue-900 mb-1">Why This Matters</h3>
              <p className="text-sm text-blue-800">{priority.rationale}</p>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recommendations</h3>
          <div className="space-y-4">
            {priority.recommendations.map((rec, index) => (
              <div key={index} className="bg-white border border-gray-200 rounded-xl p-5">
                <h4 className="font-semibold text-gray-900 mb-1">{rec.title}</h4>
                {rec.savings && (
                  <div className="text-sm font-semibold mb-2" style={{ color: '#C9A24D' }}>
                    Save ${rec.savings}/year
                  </div>
                )}
                <p className="text-sm text-gray-600 mb-2">{rec.description}</p>
                <p className="text-sm text-gray-700">{rec.impact}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  // Insurance Section View
  const InsuranceView: React.FC = () => {
    if (selectedPolicy) {
      return <PolicyDetailView policy={selectedPolicy} />;
    }

    const totalAnnualPremium = insurancePolicies.reduce((sum, p) => {
      const annual = p.premiumFrequency === 'monthly' ? p.premium * 12 : 
                     p.premiumFrequency === 'quarterly' ? p.premium * 4 : p.premium;
      return sum + annual;
    }, 0);

    const policiesNeedingAttention = insurancePolicies.filter(p => 
      p.status === 'expiring-soon' || p.status === 'action-needed'
    ).length;

    const policyTypes = [
      { type: 'home', label: 'Home', icon: Building },
      { type: 'auto', label: 'Auto', icon: Car },
      { type: 'umbrella', label: 'Umbrella', icon: Umbrella },
      { type: 'life', label: 'Life', icon: Heart }
    ];

    return (
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Insurance & Risk</h1>
          <p className="text-gray-600">Maintains a living view of coverage across all policies—flagging gaps, overlaps, and life events that should trigger reviews.</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <Shield className="w-5 h-5 text-blue-600" />
              </div>
              <span className="text-sm text-gray-600">Active Policies</span>
            </div>
            <p className="text-3xl font-bold text-gray-900">{insurancePolicies.length}</p>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-green-600" />
              </div>
              <span className="text-sm text-gray-600">Annual Premium</span>
            </div>
            <p className="text-3xl font-bold text-gray-900">${totalAnnualPremium.toLocaleString()}</p>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-yellow-100 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-yellow-600" />
              </div>
              <span className="text-sm text-gray-600">Need Attention</span>
            </div>
            <p className="text-3xl font-bold text-gray-900">{policiesNeedingAttention}</p>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgba(201, 162, 77, 0.2)' }}>
                <TrendingUp className="w-5 h-5" style={{ color: '#C9A24D' }} />
              </div>
              <span className="text-sm text-gray-600">Potential Savings</span>
            </div>
            <p className="text-3xl font-bold" style={{ color: '#C9A24D' }}>$690<span className="text-lg font-normal text-gray-500">/yr</span></p>
          </div>
        </div>

        {/* Policies by Type */}
        {policyTypes.map(({ type, label, icon: TypeIcon }) => {
          const typePolicies = insurancePolicies.filter(p => p.type === type);
          if (typePolicies.length === 0) return null;

          return (
            <div key={type} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
                <TypeIcon className="w-5 h-5" style={{ color: '#C9A24D' }} />
                <h2 className="text-lg font-semibold text-gray-900">{label} Insurance</h2>
                <span className="text-sm text-gray-500">({typePolicies.length} {typePolicies.length === 1 ? 'policy' : 'policies'})</span>
              </div>
              <div className="divide-y divide-gray-100">
                {typePolicies.map(policy => (
                  <PolicyRow key={policy.id} policy={policy} onClick={() => setSelectedPolicy(policy)} />
                ))}
              </div>
            </div>
          );
        })}

        {/* Coverage Gaps Alert */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-5">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-yellow-100 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <h3 className="font-semibold text-yellow-900 mb-1">Coverage Gap Identified</h3>
              <p className="text-sm text-yellow-800 mb-3">
                Your umbrella policy ($1M) may be insufficient for your net worth ($2.8M). In a worst-case liability scenario, 
                you could be personally exposed for $1.8M+ in assets.
              </p>
              <button 
                className="text-sm font-medium text-yellow-800 hover:text-yellow-900 flex items-center gap-1"
                onClick={() => setSelectedPolicy(insurancePolicies.find(p => p.type === 'umbrella') || null)}
              >
                Review Umbrella Policy <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Policy Row Component
  const PolicyRow: React.FC<{ policy: InsurancePolicy; onClick: () => void }> = ({ policy, onClick }) => {
    const Icon = policy.icon;
    const annualPremium = policy.premiumFrequency === 'monthly' ? policy.premium * 12 : 
                          policy.premiumFrequency === 'quarterly' ? policy.premium * 4 : policy.premium;

    return (
      <div 
        onClick={onClick}
        className="px-6 py-4 hover:bg-gray-50 cursor-pointer transition-colors"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              policy.status === 'action-needed' ? 'bg-red-100' :
              policy.status === 'expiring-soon' ? 'bg-yellow-100' :
              'bg-gray-100'
            }`}>
              <Icon className={`w-5 h-5 ${
                policy.status === 'action-needed' ? 'text-red-600' :
                policy.status === 'expiring-soon' ? 'text-yellow-600' :
                'text-gray-600'
              }`} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-medium text-gray-900">{policy.name}</h3>
                {policy.status === 'expiring-soon' && (
                  <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">
                    Renewal Soon
                  </span>
                )}
                {policy.status === 'action-needed' && (
                  <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-800">
                    Action Needed
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-500">{policy.carrier} • {policy.coverage}</p>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-right">
              <p className="font-semibold text-gray-900">${annualPremium.toLocaleString()}/yr</p>
              <p className="text-xs text-gray-500">Renews {policy.renewalDate}</p>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </div>
        </div>
      </div>
    );
  };

  // Policy Detail View
  const PolicyDetailView: React.FC<{ policy: InsurancePolicy }> = ({ policy }) => {
    const Icon = policy.icon;
    const annualPremium = policy.premiumFrequency === 'monthly' ? policy.premium * 12 : 
                          policy.premiumFrequency === 'quarterly' ? policy.premium * 4 : policy.premium;

    return (
      <div className="space-y-6">
        <button
          onClick={() => setSelectedPolicy(null)}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm font-medium">Back to Insurance</span>
        </button>

        {/* Policy Header */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${
                policy.status === 'action-needed' ? 'bg-red-100' :
                policy.status === 'expiring-soon' ? 'bg-yellow-100' :
                'bg-gray-100'
              }`}>
                <Icon className={`w-7 h-7 ${
                  policy.status === 'action-needed' ? 'text-red-600' :
                  policy.status === 'expiring-soon' ? 'text-yellow-600' :
                  'text-gray-600'
                }`} />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{policy.name}</h1>
                <p className="text-gray-600">{policy.carrier}</p>
              </div>
            </div>
            {policy.status !== 'active' && (
              <span className={`px-3 py-1 text-sm font-medium rounded-full ${
                policy.status === 'action-needed' ? 'bg-red-100 text-red-800' :
                'bg-yellow-100 text-yellow-800'
              }`}>
                {policy.status === 'action-needed' ? 'Action Needed' : 'Renewal Soon'}
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-xs text-gray-500 mb-1">Policy Number</p>
              <p className="font-semibold text-gray-900">{policy.policyNumber}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-xs text-gray-500 mb-1">Annual Premium</p>
              <p className="font-semibold text-gray-900">${annualPremium.toLocaleString()}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-xs text-gray-500 mb-1">Deductible</p>
              <p className="font-semibold text-gray-900">${policy.deductible.toLocaleString()}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-xs text-gray-500 mb-1">Renewal Date</p>
              <p className="font-semibold text-gray-900">{policy.renewalDate}</p>
            </div>
          </div>
        </div>

        {/* Coverage Details */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Coverage Details</h2>
          <div className="space-y-3">
            {Object.entries(policy.details).map(([key, value]) => (
              <div key={key} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                <span className="text-gray-600">{key}</span>
                <span className="font-medium text-gray-900">{value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Recommendations */}
        {policy.recommendations && policy.recommendations.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
            <div className="flex items-start gap-3 mb-4">
              <Info className="w-5 h-5 text-blue-600 mt-0.5" />
              <h2 className="text-lg font-semibold text-blue-900">Recommendations</h2>
            </div>
            <div className="space-y-3">
              {policy.recommendations.map((rec, index) => (
                <div key={index} className="flex items-start gap-3">
                  <CheckCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-blue-800">{rec}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button className="flex-1 px-4 py-3 rounded-lg text-white font-medium transition-all hover:opacity-90" style={{ backgroundColor: '#C9A24D' }}>
            <span className="flex items-center justify-center gap-2">
              <FileCheck className="w-5 h-5" />
              Review Policy Document
            </span>
          </button>
          <button className="px-4 py-3 rounded-lg border border-gray-200 text-gray-700 font-medium hover:bg-gray-50 transition-colors">
            <span className="flex items-center justify-center gap-2">
              <ExternalLink className="w-5 h-5" />
              Carrier Portal
            </span>
          </button>
        </div>
      </div>
    );
  };

  // Profile View
  const ProfileView: React.FC = () => {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Profile Settings</h1>
          <p className="text-gray-600">Manage your account, security, and subscription</p>
        </div>

        {/* Profile Header */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-yellow-600 to-yellow-500 flex items-center justify-center">
              <span className="text-3xl font-bold text-white">AB</span>
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-gray-900">Adam Bailey</h2>
              <p className="text-gray-600">Premium Member since January 2024</p>
              <div className="flex items-center gap-2 mt-2">
                <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">
                  Pro Plan
                </span>
                <span className="text-sm text-gray-500">• Household of 4</span>
              </div>
            </div>
            <button className="px-4 py-2 rounded-lg border border-gray-200 text-gray-700 font-medium hover:bg-gray-50 transition-colors flex items-center gap-2">
              <Edit3 className="w-4 h-4" />
              Edit Profile
            </button>
          </div>
        </div>

        {/* Account Information */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900">Account Information</h2>
          </div>
          <div className="divide-y divide-gray-100">
            <div className="px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                  <Mail className="w-5 h-5 text-gray-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Email Address</p>
                  <p className="font-medium text-gray-900">adam.bailey@email.com</p>
                </div>
              </div>
              <button className="text-sm font-medium hover:text-yellow-600" style={{ color: '#C9A24D' }}>Change</button>
            </div>
            <div className="px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                  <Phone className="w-5 h-5 text-gray-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Phone Number</p>
                  <p className="font-medium text-gray-900">(612) 555-0147</p>
                </div>
              </div>
              <button className="text-sm font-medium hover:text-yellow-600" style={{ color: '#C9A24D' }}>Change</button>
            </div>
            <div className="px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-gray-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Address</p>
                  <p className="font-medium text-gray-900">1847 Oakwood Drive, Savage, MN 55378</p>
                </div>
              </div>
              <button className="text-sm font-medium hover:text-yellow-600" style={{ color: '#C9A24D' }}>Change</button>
            </div>
          </div>
        </div>

        {/* Security */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900">Security</h2>
          </div>
          <div className="divide-y divide-gray-100">
            <div className="px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                  <Lock className="w-5 h-5 text-gray-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Password</p>
                  <p className="text-sm text-gray-500">Last changed 3 months ago</p>
                </div>
              </div>
              <button className="text-sm font-medium hover:text-yellow-600" style={{ color: '#C9A24D' }}>Update Password</button>
            </div>
            <div className="px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                  <Shield className="w-5 h-5 text-gray-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Two-Factor Authentication</p>
                  <p className="text-sm text-gray-500">Add an extra layer of security</p>
                </div>
              </div>
              <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">Enabled</span>
            </div>
            <div className="px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                  <UserCheck className="w-5 h-5 text-gray-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Connected Accounts</p>
                  <p className="text-sm text-gray-500">Google, Apple ID</p>
                </div>
              </div>
              <button className="text-sm font-medium hover:text-yellow-600" style={{ color: '#C9A24D' }}>Manage</button>
            </div>
          </div>
        </div>

        {/* Subscription & Billing */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900">Subscription & Billing</h2>
          </div>
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h3 className="text-lg font-bold text-gray-900">Pro Plan</h3>
                  <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">Active</span>
                </div>
                <p className="text-gray-600">$40/month • Renews February 15, 2026</p>
              </div>
              <button className="px-4 py-2 rounded-lg border border-gray-200 text-gray-700 font-medium hover:bg-gray-50 transition-colors">
                Change Plan
              </button>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <p className="text-sm font-medium text-gray-900 mb-2">Pro Plan includes:</p>
              <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  Advanced risk scoring
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  Automation features
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  Annual optimization review
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  Priority support
                </div>
              </div>
            </div>

            <div className="border-t border-gray-200 pt-6">
              <h4 className="font-medium text-gray-900 mb-4">Payment Method</h4>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-8 rounded bg-gray-800 flex items-center justify-center">
                    <CreditCard className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Visa ending in 4242</p>
                    <p className="text-sm text-gray-500">Expires 08/2027</p>
                  </div>
                </div>
                <button className="text-sm font-medium hover:text-yellow-600" style={{ color: '#C9A24D' }}>Update</button>
              </div>
            </div>
          </div>
        </div>

        {/* Notifications */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900">Notifications</h2>
          </div>
          <div className="divide-y divide-gray-100">
            <div className="px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                  <Bell className="w-5 h-5 text-gray-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Email Notifications</p>
                  <p className="text-sm text-gray-500">Receive updates about your household</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" defaultChecked />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-yellow-500"></div>
              </label>
            </div>
            <div className="px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                  <AlertCircle className="w-5 h-5 text-gray-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Priority Alerts</p>
                  <p className="text-sm text-gray-500">Immediate notifications for urgent items</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" defaultChecked />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-yellow-500"></div>
              </label>
            </div>
            <div className="px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-gray-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Weekly Summary</p>
                  <p className="text-sm text-gray-500">Get a weekly digest of your household status</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" defaultChecked />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-yellow-500"></div>
              </label>
            </div>
          </div>
        </div>

        {/* Household Members */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Household Members</h2>
            <button className="text-sm font-medium hover:text-yellow-600 flex items-center gap-1" style={{ color: '#C9A24D' }}>
              <Plus className="w-4 h-4" />
              Add Member
            </button>
          </div>
          <div className="divide-y divide-gray-100">
            <div className="px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-600 to-yellow-500 flex items-center justify-center">
                  <span className="text-sm font-bold text-white">AB</span>
                </div>
                <div>
                  <p className="font-medium text-gray-900">Adam Bailey</p>
                  <p className="text-sm text-gray-500">Owner • adam.bailey@email.com</p>
                </div>
              </div>
              <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-600">You</span>
            </div>
            <div className="px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center">
                  <span className="text-sm font-bold text-white">SB</span>
                </div>
                <div>
                  <p className="font-medium text-gray-900">Sarah Bailey</p>
                  <p className="text-sm text-gray-500">Co-owner • sarah.bailey@email.com</p>
                </div>
              </div>
              <button className="text-sm text-gray-500 hover:text-gray-700">Manage</button>
            </div>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="bg-white border border-red-200 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-red-100">
            <h2 className="text-lg font-semibold text-red-900">Danger Zone</h2>
          </div>
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">Delete Account</p>
                <p className="text-sm text-gray-500">Permanently delete your account and all data</p>
              </div>
              <button className="px-4 py-2 rounded-lg border border-red-200 text-red-600 font-medium hover:bg-red-50 transition-colors">
                Delete Account
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const DashboardView: React.FC = () => {
    if (selectedPriority) {
      return <PriorityDetailView priority={selectedPriority} />;
    }

    const activePriorities = priorities.filter(p => !dismissedPriorities.includes(p.id));
    const dismissedPriorityItems = priorities.filter(p => dismissedPriorities.includes(p.id));

    return (
      <div className="space-y-6">
        {/* Hero Dashboard Header */}
        <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-xl p-6 text-white shadow-lg">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            {/* Left: Overall Score */}
            <div className="flex items-center gap-6">
              <div>
                <p className="text-sm text-gray-400 mb-1">Welcome back, Adam</p>
                <h2 className="text-base font-medium text-gray-300 mb-2">Overall Household Health</h2>
                <div className="flex items-end gap-2">
                  <span className="text-6xl lg:text-7xl font-bold">{overallScore}</span>
                  <span className="text-2xl text-gray-400 pb-2">/100</span>
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  {overallScore >= 80 ? 'Excellent - household is well optimized' :
                   overallScore >= 60 ? 'Good - some areas need attention' :
                   'Needs attention - multiple areas require action'}
                </p>
              </div>
            </div>

            {/* Right: Section Scores Grid */}
            <div className="flex-1 lg:max-w-xl">
              <p className="text-xs text-gray-400 mb-3 lg:text-right">Section Scores</p>
              <div className="flex flex-wrap justify-start lg:justify-end gap-1">
                {householdSections.map(section => (
                  <SectionScoreCard key={section.id} section={section} compact />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Priority Actions */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">Priority Actions</h2>
          {activePriorities.length > 0 ? (
            <div className="grid gap-3">
              {activePriorities.map(priority => (
                <PriorityCard 
                  key={priority.id} 
                  priority={priority} 
                  onClick={() => setSelectedPriority(priority)}
                  onDismiss={(e) => dismissPriority(priority.id, e)}
                />
              ))}
            </div>
          ) : (
            <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
              <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
              <p className="text-green-800 font-medium">All caught up!</p>
              <p className="text-green-600 text-sm">No priority actions at this time.</p>
            </div>
          )}
        </div>

        {/* Timeline */}
        <TimelineSection />

        {/* Dismissed Items */}
        {dismissedPriorityItems.length > 0 && (
          <div className="border-t border-gray-200 pt-6">
            <button
              onClick={() => setShowDismissed(!showDismissed)}
              className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-3"
            >
              {showDismissed ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              Dismissed Items ({dismissedPriorityItems.length})
            </button>
            
            {showDismissed && (
              <div className="grid gap-3">
                {dismissedPriorityItems.map(priority => (
                  <PriorityCard 
                    key={priority.id} 
                    priority={priority} 
                    onClick={() => setSelectedPriority(priority)}
                    isDismissed
                    onRestore={(e) => restorePriority(priority.id, e)}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // Placeholder views for other sections
  const PlaceholderView: React.FC<{ title: string; description: string }> = ({ title, description }) => (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-1">{title}</h1>
        <p className="text-gray-600">{description}</p>
      </div>
      <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
        <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
          <Settings className="w-8 h-8 text-gray-400" />
        </div>
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Coming Soon</h2>
        <p className="text-gray-500 max-w-md mx-auto">
          This section is under development. Check back soon for full functionality.
        </p>
      </div>
    </div>
  );

  const renderView = (): React.ReactNode => {
    switch (activeView) {
      case 'dashboard':
        return <DashboardView />;
      case 'insurance':
        return <InsuranceView />;
      case 'legal':
        return <PlaceholderView title="Legal & Estate" description="Keeps your legal documents current, aligned, and ready when it matters." />;
      case 'home':
        return <PlaceholderView title="Home & Assets" description="Turns reactive maintenance into a proactive, planned system." />;
      case 'taxes':
        return <PlaceholderView title="Tax Planning" description="Planning, filing coordination, and record retention to streamline filings and optimize strategy." />;
      case 'family':
        return <PlaceholderView title="Family & Life Administration" description="Ensures life events trigger the right reviews and updates automatically." />;
      case 'profile':
        return <ProfileView />;
      default:
        return <DashboardView />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 to-neutral-100">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {renderView()}
      </main>
    </div>
  );
};

export default CommandApp;
