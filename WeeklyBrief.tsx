import React, { useState } from 'react';
import {
  AlertTriangle,
  TrendingDown,
  Target,
  ChevronDown,
  ChevronUp,
  X,
  Clock,
  Shield,
  DollarSign,
  FileText,
  ArrowRight,
  Info
} from 'lucide-react';

interface BriefSection {
  id: string;
  type: 'risk' | 'leakage' | 'action';
  title: string;
  summary: string;
  whyItMatters: string;
  category: string;
  isAssumption?: boolean;
  assumptionNote?: string;
  actionLabel?: string;
  potentialImpact?: string;
}

interface WeeklyBriefProps {
  onDismiss: () => void;
  onNavigate: (view: string) => void;
  userName?: string;
  briefData?: {
    risk: BriefSection;
    leakage: BriefSection;
    action: BriefSection;
  };
}

// Default brief data based on Adam Bailey's household situation
const defaultBriefData = {
  risk: {
    id: 'risk-1',
    type: 'risk' as const,
    title: 'Umbrella coverage gap',
    summary: 'Your $1M umbrella policy may leave $1.8M+ of your net worth exposed in a worst-case liability scenario.',
    whyItMatters: 'With a net worth of $2.8M and a household income of $325K, financial advisors typically recommend umbrella coverage of 2-3x your net worth. A serious auto accident or liability claim could exceed your current coverage and put your family\'s assets at risk.',
    category: 'Insurance',
    potentialImpact: 'Up to $1.8M exposure'
  },
  leakage: {
    id: 'leakage-1',
    type: 'leakage' as const,
    title: 'Auto insurance overpayment',
    summary: 'Your auto insurance premium is approximately 18% above market rate for comparable coverage.',
    whyItMatters: 'You\'re currently paying $2,400/year with State Farm. Based on your driving history and vehicle profile, competing carriers could offer the same coverage for $1,950-$2,100/year. This represents $300-$450 in annual savings without changing your coverage.',
    category: 'Insurance',
    potentialImpact: 'Save $300-$450/year'
  },
  action: {
    id: 'action-1',
    type: 'action' as const,
    title: 'Review auto insurance before Feb 2 renewal',
    summary: 'Get competing quotes before your policy renews in 12 days to capture potential savings.',
    whyItMatters: 'Your renewal is approaching quickly. Shopping quotes now gives you time to compare options without rushing. Even if you stay with State Farm, having competitive quotes gives you leverage to negotiate.',
    category: 'Insurance',
    actionLabel: 'Start Insurance Review',
    potentialImpact: '12 days until renewal'
  }
};

const WeeklyBrief: React.FC<WeeklyBriefProps> = ({
  onDismiss,
  onNavigate,
  userName = 'Adam',
  briefData = defaultBriefData
}) => {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId);
      } else {
        newSet.add(sectionId);
      }
      return newSet;
    });
  };

  const getSectionIcon = (type: string) => {
    switch (type) {
      case 'risk':
        return AlertTriangle;
      case 'leakage':
        return TrendingDown;
      case 'action':
        return Target;
      default:
        return Info;
    }
  };

  const getSectionColors = (type: string) => {
    switch (type) {
      case 'risk':
        return {
          bg: 'bg-red-50',
          border: 'border-red-200',
          iconBg: 'bg-red-100',
          iconColor: 'text-red-600',
          headerText: 'text-red-900',
          label: 'Risk',
          labelBg: 'bg-red-100',
          labelText: 'text-red-700'
        };
      case 'leakage':
        return {
          bg: 'bg-amber-50',
          border: 'border-amber-200',
          iconBg: 'bg-amber-100',
          iconColor: 'text-amber-600',
          headerText: 'text-amber-900',
          label: 'Leakage',
          labelBg: 'bg-amber-100',
          labelText: 'text-amber-700'
        };
      case 'action':
        return {
          bg: 'bg-blue-50',
          border: 'border-blue-200',
          iconBg: 'bg-blue-100',
          iconColor: 'text-blue-600',
          headerText: 'text-blue-900',
          label: 'Recommended Action',
          labelBg: 'bg-blue-100',
          labelText: 'text-blue-700'
        };
      default:
        return {
          bg: 'bg-gray-50',
          border: 'border-gray-200',
          iconBg: 'bg-gray-100',
          iconColor: 'text-gray-600',
          headerText: 'text-gray-900',
          label: 'Info',
          labelBg: 'bg-gray-100',
          labelText: 'text-gray-700'
        };
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case 'insurance':
        return Shield;
      case 'legal':
        return FileText;
      case 'finances':
        return DollarSign;
      default:
        return Info;
    }
  };

  const renderSection = (section: BriefSection) => {
    const colors = getSectionColors(section.type);
    const Icon = getSectionIcon(section.type);
    const CategoryIcon = getCategoryIcon(section.category);
    const isExpanded = expandedSections.has(section.id);

    return (
      <div
        key={section.id}
        className={`${colors.bg} ${colors.border} border rounded-xl overflow-hidden transition-all duration-200`}
      >
        <div className="p-5">
          {/* Header */}
          <div className="flex items-start gap-4">
            <div className={`w-10 h-10 rounded-lg ${colors.iconBg} flex items-center justify-center flex-shrink-0`}>
              <Icon className={`w-5 h-5 ${colors.iconColor}`} />
            </div>
            <div className="flex-1 min-w-0">
              {/* Label and Category */}
              <div className="flex items-center gap-2 mb-2">
                <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${colors.labelBg} ${colors.labelText}`}>
                  {colors.label}
                </span>
                <span className="flex items-center gap-1 text-xs text-gray-500">
                  <CategoryIcon className="w-3 h-3" />
                  {section.category}
                </span>
                {section.potentialImpact && (
                  <span className="text-xs font-medium" style={{ color: '#C9A24D' }}>
                    {section.potentialImpact}
                  </span>
                )}
              </div>

              {/* Title */}
              <h3 className={`font-semibold ${colors.headerText} mb-2`}>
                {section.title}
              </h3>

              {/* Summary */}
              <p className="text-sm text-gray-700 leading-relaxed">
                {section.summary}
              </p>

              {/* Assumption Note */}
              {section.isAssumption && section.assumptionNote && (
                <p className="text-xs text-gray-500 mt-2 italic">
                  Note: {section.assumptionNote}
                </p>
              )}

              {/* Why It Matters - Expandable */}
              <button
                onClick={() => toggleSection(section.id)}
                className="flex items-center gap-1 mt-3 text-sm text-gray-600 hover:text-gray-900 transition-colors"
              >
                {isExpanded ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
                <span className="font-medium">Why this matters</span>
              </button>

              {isExpanded && (
                <div className="mt-3 pt-3 border-t border-gray-200/50">
                  <p className="text-sm text-gray-600 leading-relaxed">
                    {section.whyItMatters}
                  </p>
                </div>
              )}

              {/* Action Button (only for action type) */}
              {section.type === 'action' && section.actionLabel && (
                <button
                  onClick={() => onNavigate('insurance')}
                  className="mt-4 flex items-center gap-2 px-4 py-2 rounded-lg text-white font-medium text-sm hover:opacity-90 transition-opacity"
                  style={{ backgroundColor: '#C9A24D' }}
                >
                  {section.actionLabel}
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Get current date for display
  const today = new Date();
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay());
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-2xl">
        {/* Header Card */}
        <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-t-2xl p-6 text-white">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 text-gray-400 text-sm mb-2">
                <Clock className="w-4 h-4" />
                <span>Week of {formatDate(weekStart)} – {formatDate(weekEnd)}</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold mb-1">This Week's Command Brief</h1>
              <p className="text-gray-400">Good morning, {userName}. Here's what needs your attention.</p>
            </div>
            <button
              onClick={onDismiss}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              title="Review later"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>
        </div>

        {/* Brief Sections */}
        <div className="bg-white border-x border-b border-gray-200 rounded-b-2xl shadow-lg">
          <div className="p-4 sm:p-6 space-y-4">
            {renderSection(briefData.risk)}
            {renderSection(briefData.leakage)}
            {renderSection(briefData.action)}
          </div>

          {/* Footer */}
          <div className="px-4 sm:px-6 pb-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-gray-100">
              <button
                onClick={onDismiss}
                className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 transition-colors"
              >
                <Clock className="w-4 h-4" />
                Review later
              </button>
              <button
                onClick={() => onNavigate('dashboard')}
                className="w-full sm:w-auto px-6 py-2.5 rounded-lg bg-gray-900 text-white font-medium text-sm hover:bg-gray-800 transition-colors"
              >
                Go to Dashboard
              </button>
            </div>
          </div>
        </div>

        {/* Info Note */}
        <p className="text-center text-xs text-gray-400 mt-4">
          This brief updates weekly based on your household data and priorities.
        </p>
      </div>
    </div>
  );
};

export default WeeklyBrief;
