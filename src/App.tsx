import React, { useState } from 'react';
import { 
  Home, 
  Shield, 
  FileText, 
  DollarSign, 
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
  Heart, 
  Calendar, 
  Users, 
  TrendingUp,
  XCircle,
  CheckCircle,
  AlertCircle,
  ChevronUp,
  LucideIcon
} from 'lucide-react';

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

const CommandApp: React.FC = () => {
  const [activeView, setActiveView] = useState<string>('dashboard');
  const [selectedPriority, setSelectedPriority] = useState<Priority | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [dismissedPriorities, setDismissedPriorities] = useState<number[]>([]);
  const [showDismissed, setShowDismissed] = useState<boolean>(false);

  const toggleSection = (id: string): void => {
    setExpandedSections(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const dismissPriority = (id: number, e: React.MouseEvent): void => {
    e.stopPropagation();
    setDismissedPriorities(prev => [...prev, id]);
  };

  const restorePriority = (id: number, e: React.MouseEvent): void => {
    e.stopPropagation();
    setDismissedPriorities(prev => prev.filter(pId => pId !== id));
  };

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
      title: 'Insurance & Risk',
      score: 6.5,
      status: 'needs-attention',
      summary: 'You have 4 active policies with annual premiums of $5,850. Auto renewal is due in 12 days. We\'ve identified $450 in potential savings through rate shopping and $240 through deductible optimization.',
      keyMetrics: [
        { label: 'Total Annual Premium', value: '$5,850', status: 'neutral' },
        { label: 'Potential Savings', value: '$690/year', status: 'good' },
        { label: 'Policies Up to Date', value: '3 of 4', status: 'warning' }
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
      title: 'Legal & Estate',
      score: 4.0,
      status: 'critical',
      summary: 'Your estate documents are 6 years old. With $2.8M net worth, you should have a revocable living trust in place. Healthcare Directive and Power of Attorney need updating to reflect current family situation.',
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
      title: 'Home & Assets',
      score: 7.5,
      status: 'good',
      summary: 'Most systems are in good condition. HVAC is 14 years old and approaching replacement. Roof was replaced 3 years ago and is in excellent condition. Water heater will need attention in 2-3 years.',
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
      id: 'financial',
      icon: DollarSign,
      title: 'Finances',
      score: 8.0,
      status: 'good',
      summary: 'Strong emergency fund ($15K = 3 months expenses), healthy retirement contributions (18% of income). Net worth $2.8M with good debt-to-income ratio. Consider increasing 529 contributions as children approach college age.',
      keyMetrics: [
        { label: 'Net Worth', value: '$2.8M', status: 'good' },
        { label: 'Emergency Fund', value: '3 months', status: 'good' },
        { label: 'Retirement on Track', value: 'Yes', status: 'good' }
      ],
      items: [
        { label: 'Emergency Fund', value: '$15,000 (3 months expenses)', status: 'good' },
        { label: 'Retirement Savings', value: '18% of income', status: 'good' },
        { label: '529 College Savings', value: 'Consider increasing contributions', status: 'info' },
        { label: 'Debt Management', value: 'Mortgage only, healthy ratio', status: 'good' }
      ]
    },
    {
      id: 'healthcare',
      icon: Heart,
      title: 'Healthcare',
      score: 7.0,
      status: 'good',
      summary: 'Family is enrolled in comprehensive employer health plan. All routine checkups are current. Consider HSA contributions for tax advantages. Dental and vision coverage active.',
      keyMetrics: [
        { label: 'Coverage Active', value: 'Yes', status: 'good' },
        { label: 'Deductible Progress', value: '$800 of $3,000', status: 'neutral' },
        { label: 'HSA Balance', value: '$4,200', status: 'info' }
      ],
      items: [
        { label: 'Health Insurance', value: 'Employer plan, comprehensive', status: 'good' },
        { label: 'Annual Checkups', value: 'All family members current', status: 'good' },
        { label: 'HSA Contributions', value: 'Consider maximizing', status: 'info' },
        { label: 'Dental & Vision', value: 'Active coverage', status: 'good' }
      ]
    },
    {
      id: 'taxes',
      icon: Calendar,
      title: 'Taxes',
      score: 7.5,
      status: 'good',
      summary: 'Working with CPA for annual filing. Estimated quarterly payments current. Consider tax-loss harvesting in investment accounts. Review charitable giving strategy for deduction optimization.',
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
      summary: 'School registrations current for both children. Emergency contacts up to date. Family calendar synchronized. Consider updating beneficiary designations after recent life changes.',
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
    },
    {
      id: 'advisory',
      icon: TrendingUp,
      title: 'Advisory',
      score: 6.0,
      status: 'needs-attention',
      summary: 'You work with 4 advisors (CPA, financial advisor, insurance agent, attorney). No centralized system for coordinating advice. Consider scheduling annual alignment meeting with key advisors.',
      keyMetrics: [
        { label: 'Active Advisors', value: '4 professionals', status: 'neutral' },
        { label: 'Last Coordination', value: 'Never', status: 'warning' },
        { label: 'Advice Conflicts', value: '0 identified', status: 'good' }
      ],
      items: [
        { label: 'CPA', value: 'Annual relationship, good', status: 'good' },
        { label: 'Financial Advisor', value: 'Quarterly meetings', status: 'good' },
        { label: 'Insurance Agent', value: 'Ad-hoc contact only', status: 'info' },
        { label: 'Estate Attorney', value: 'No contact since 2019', status: 'warning' }
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

  const getScoreBgColor = (score: number): string => {
    if (score >= 8) return 'bg-green-500/20';
    if (score >= 6) return 'bg-yellow-500/20';
    return 'bg-red-500/20';
  };

  const getScoreRingColor = (score: number): string => {
    if (score >= 8) return 'border-green-500';
    if (score >= 6) return 'border-yellow-500';
    return 'border-red-500';
  };

  // Logo Component
  const CommandLogo: React.FC<{ className?: string }> = ({ className = "w-8 h-8" }) => (
    <svg viewBox="0 0 100 100" className={className}>
      {/* Center hub */}
      <circle cx="50" cy="50" r="12" fill="#C9A24D" />
      <circle cx="50" cy="50" r="8" fill="#F5C842" />
      
      {/* Outer ring */}
      <circle cx="50" cy="50" r="38" fill="none" stroke="#C9A24D" strokeWidth="4" />
      
      {/* Spokes and nodes */}
      {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => {
        const rad = (angle * Math.PI) / 180;
        const x = 50 + 38 * Math.cos(rad);
        const y = 50 + 38 * Math.sin(rad);
        return (
          <g key={i}>
            <line x1="50" y1="50" x2={x} y2={y} stroke="#1C1D20" strokeWidth="2" />
            <circle cx={x} cy={y} r="7" fill="#C9A24D" />
            <circle cx={x} cy={y} r="4" fill="#F5C842" />
          </g>
        );
      })}
    </svg>
  );

  const Header: React.FC = () => (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-2">
            <CommandLogo className="w-9 h-9" />
            <span className="font-bold text-xl tracking-tight">COMMAND</span>
          </div>

          <nav className="hidden lg:flex items-center gap-1">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: Home },
              { id: 'insurance', label: 'Insurance', icon: Shield },
              { id: 'legal', label: 'Legal', icon: FileText },
              { id: 'home', label: 'Home', icon: Wrench },
              { id: 'financial', label: 'Financial', icon: DollarSign }
            ].map(section => {
              const Icon = section.icon;
              return (
                <button
                  key={section.id}
                  onClick={() => {
                    setActiveView(section.id);
                    setSelectedPriority(null);
                  }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm ${
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
            <button onClick={() => setActiveView('settings')} className="p-2 hover:bg-gray-100 rounded-lg">
              <Settings className="w-5 h-5 text-gray-600" />
            </button>
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-600 to-yellow-500 flex items-center justify-center">
              <User className="w-5 h-5 text-white" />
            </div>
          </div>

          <button className="lg:hidden" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>
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
          {section.title.split(' ')[0]}
        </span>
        <span className={`text-sm font-bold ${getScoreColor(section.score)}`}>
          {section.score}
        </span>
      </button>
    );
  };

  const PriorityCard: React.FC<{ priority: Priority; onClick: () => void; isDismissed?: boolean; onDismiss?: (e: React.MouseEvent) => void; onRestore?: (e: React.MouseEvent) => void }> = ({ 
    priority, 
    onClick, 
    isDismissed = false,
    onDismiss,
    onRestore 
  }) => (
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
                className="text-xs text-command-gold hover:text-yellow-600 flex items-center gap-1 transition-colors"
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

  const SectionCard: React.FC<{ section: HouseholdSection }> = ({ section }) => {
    const isExpanded = expandedSections[section.id];
    
    return (
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
                <section.icon className="w-6 h-6" style={{ color: '#C9A24D' }} />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 text-lg">{section.title}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-3xl font-bold ${getScoreColor(section.score)}`}>
                    {section.score}
                  </span>
                  <span className="text-sm text-gray-500">/10</span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={() => toggleSection(section.id)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                {isExpanded ? (
                  <ChevronDown className="w-5 h-5 text-gray-600" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-gray-600" />
                )}
              </button>
              <button
                onClick={() => setActiveView(section.id)}
                className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-all hover:opacity-90"
                style={{ backgroundColor: '#C9A24D' }}
              >
                View Details
              </button>
            </div>
          </div>

          {isExpanded && (
            <div className="mt-4 pt-4 border-t border-gray-200 space-y-4">
              <p className="text-sm text-gray-600">{section.summary}</p>
              
              <div className="grid grid-cols-3 gap-4">
                {section.keyMetrics.map((metric, idx) => (
                  <div key={idx} className={`${getScoreBgColor(metric.status === 'good' ? 9 : metric.status === 'warning' ? 6 : 4)} rounded-lg p-3`}>
                    <div className="text-xs text-gray-600 mb-1">{metric.label}</div>
                    <div className="text-sm font-semibold text-gray-900">{metric.value}</div>
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                {section.items.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between text-sm py-2 border-b border-gray-100 last:border-0">
                    <span className="text-gray-700">{item.label}</span>
                    <span className={`font-medium ${
                      item.status === 'critical' ? 'text-red-600' :
                      item.status === 'warning' ? 'text-yellow-600' :
                      item.status === 'good' ? 'text-green-600' :
                      'text-blue-600'
                    }`}>
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
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
            <div className="flex-1 lg:max-w-2xl">
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

        {/* Household Sections */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">Household Sections</h2>
          <div className="grid grid-cols-1 gap-4">
            {householdSections.map(section => (
              <SectionCard key={section.id} section={section} />
            ))}
          </div>
        </div>

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

  const HomeView: React.FC = () => (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Home & Asset Maintenance</h1>
        <p className="text-gray-600">Track and maintain your home systems</p>
      </div>
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <p className="text-gray-600">Detailed home management view coming soon...</p>
      </div>
    </div>
  );

  const renderView = (): React.ReactNode => {
    if (activeView === 'dashboard') return <DashboardView />;
    if (activeView === 'home') return <HomeView />;
    
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="text-xl font-semibold text-gray-900 mb-2">Coming Soon</div>
          <p className="text-sm text-gray-500">This section is under development</p>
        </div>
      </div>
    );
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
