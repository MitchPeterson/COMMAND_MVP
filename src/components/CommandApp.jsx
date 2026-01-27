import React, { useState } from 'react';
import { Home, Clock, Shield, FolderLock, ChevronRight, AlertCircle, CheckCircle, FileText, User, TrendingUp, Users, Heart, Building2, Calculator, ClipboardList } from 'lucide-react';

const CommandApp = () => {
  const [activeScreen, setActiveScreen] = useState('home');

  const householdHealth = 73;
  const priorities = [
    { 
      id: 1, 
      text: "New child detected: Update will, life insurance, and beneficiaries", 
      domain: "Multiple Areas", 
      urgency: "high",
      connectedDomains: ["Legal & Estate", "Insurance & Risk", "Advisory Coordination"],
      impact: "Birth of Emma (Jan 2026) requires coordinated updates across legal documents, insurance coverage, and financial planning."
    },
    { 
      id: 2, 
      text: "Better auto policy available based on recent changes", 
      domain: "Insurance & Risk", 
      urgency: "medium",
      action: "Command can shop and switch this for you",
      impact: "Your improved credit score and bundling opportunity could save $840/year with better coverage."
    },
    { 
      id: 3, 
      text: "Umbrella policy expires in 45 days", 
      domain: "Insurance & Risk", 
      urgency: "high",
      impact: "Current $1M coverage insufficient for $2.8M in combined assets after investment property purchase."
    }
  ];

  const nextAction = {
    title: "Review umbrella coverage",
    reason: "Your liability exposure increased when you purchased the investment property in March 2025. Current $1M umbrella may be insufficient given combined asset value of $2.8M."
  };

  const domains = [
    { 
      name: "Advisory Coordination", 
      status: "review", 
      score: 68,
      description: "Aligns advice, decisions, and data into a single, coordinated strategy.",
      icon: TrendingUp
    },
    { 
      name: "Insurance & Risk", 
      status: "good", 
      score: 85,
      description: "Ensures you're properly covered, continuously optimized, and never exposed.",
      icon: Shield
    },
    { 
      name: "Legal & Estate", 
      status: "review", 
      score: 72,
      description: "Keeps your legal documents current, aligned, and ready when it matters.",
      icon: FileText
    },
    { 
      name: "Finances & Budget Planning", 
      status: "good", 
      score: 81,
      description: "Provides clarity on spending, obligations, and major financial decisions.",
      icon: Calculator
    },
    { 
      name: "Family & Life Administration", 
      status: "good", 
      score: 78,
      description: "Ensures life events trigger the right reviews and updates automatically.",
      icon: Users
    },
    { 
      name: "Healthcare & Coverage", 
      status: "review", 
      score: 65,
      description: "Keeps coverage, benefits, and care decisions aligned and up to date.",
      icon: Heart
    },
    { 
      name: "Home & Asset Maintenance", 
      status: "good", 
      score: 76,
      description: "Turns reactive maintenance into a proactive, planned system.",
      icon: Building2
    },
    { 
      name: "Tax Planning", 
      status: "good", 
      score: 82,
      description: "Planning, filing coordination, and record retention to streamline filings.",
      icon: ClipboardList
    }
  ];

  const timeline = [
    {
      date: "2025-03-15",
      type: "Asset Acquisition",
      title: "Purchased investment property",
      domain: "Home & Asset Maintenance",
      description: "Single-family rental, 1847 Oakwood Dr",
      documents: ["Purchase Agreement", "Title Insurance"]
    },
    {
      date: "2024-11-20",
      type: "Policy Update",
      title: "Auto insurance renewal",
      domain: "Insurance & Risk",
      description: "Added 2024 Model Y, increased liability to $500k",
      documents: ["Policy Declaration"]
    },
    {
      date: "2024-08-10",
      type: "Legal Update",
      title: "Updated will and healthcare directives",
      domain: "Legal & Estate",
      description: "Added investment property to estate plan",
      documents: ["Last Will", "Healthcare POA", "Financial POA"]
    },
    {
      date: "2024-06-01",
      type: "Coverage Change",
      title: "Increased home insurance dwelling coverage",
      domain: "Insurance & Risk",
      description: "Adjusted for construction cost inflation",
      documents: ["Policy Amendment"]
    }
  ];

  const assets = [
    {
      name: "Primary Residence",
      type: "Home",
      value: "$875,000",
      coverage: "Covered",
      details: "Dwelling: $950k, Personal Property: $200k, Liability: $300k",
      gap: null
    },
    {
      name: "Investment Property",
      type: "Home",
      value: "$425,000",
      coverage: "Covered",
      details: "Landlord policy, Dwelling: $450k, Liability: $500k",
      gap: null
    },
    {
      name: "2024 Tesla Model Y",
      type: "Auto",
      value: "$52,000",
      coverage: "Covered",
      details: "Comprehensive, $500k liability",
      gap: null
    },
    {
      name: "2021 Honda Accord",
      type: "Auto",
      value: "$28,000",
      coverage: "Covered",
      details: "Comprehensive, $500k liability",
      gap: null
    },
    {
      name: "Overall Liability",
      type: "Umbrella",
      value: "Combined assets: $2.8M",
      coverage: "Review",
      details: "Current umbrella: $1M",
      gap: "You are likely underinsured on umbrella coverage given your assets. Consider increasing to $2M-3M given investment property exposure and combined net worth."
    }
  ];

  const documents = [
    { name: "Home Insurance Policy", category: "Insurance", date: "2024-06-01" },
    { name: "Investment Property Policy", category: "Insurance", date: "2025-03-15" },
    { name: "Auto Insurance Declarations", category: "Insurance", date: "2024-11-20" },
    { name: "Umbrella Policy", category: "Insurance", date: "2023-04-12" },
    { name: "Last Will and Testament", category: "Legal", date: "2024-08-10" },
    { name: "Healthcare Power of Attorney", category: "Legal", date: "2024-08-10" },
    { name: "Financial Power of Attorney", category: "Legal", date: "2024-08-10" },
    { name: "Primary Home Deed", category: "Legal", date: "2019-07-22" },
    { name: "Investment Property Deed", category: "Legal", date: "2025-03-15" },
    { name: "Vehicle Titles", category: "Legal", date: "2024-11-20" }
  ];

  const advisors = [
    { name: "Sarah Chen", role: "Insurance Agent", firm: "State Farm", phone: "(555) 234-5678" },
    { name: "Michael Torres", role: "Estate Attorney", firm: "Torres & Associates", phone: "(555) 345-6789" },
    { name: "Jennifer Park", role: "CPA", firm: "Park Accounting", phone: "(555) 456-7890" }
  ];

  const Logo = () => (
    <svg width="32" height="32" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="50" r="12" fill="#C9A24D" stroke="#C9A24D" strokeWidth="3"/>
      <circle cx="50" cy="50" r="28" stroke="#C9A24D" strokeWidth="2" fill="none"/>
      {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => {
        const radian = (angle * Math.PI) / 180;
        const x = 50 + 28 * Math.cos(radian);
        const y = 50 + 28 * Math.sin(radian);
        const outerX = 50 + 45 * Math.cos(radian);
        const outerY = 50 + 45 * Math.sin(radian);
        return (
          <g key={i}>
            <line x1={x} y1={y} x2={outerX} y2={outerY} stroke="#C9A24D" strokeWidth="2"/>
            <circle cx={outerX} cy={outerY} r="6" fill="#C9A24D"/>
          </g>
        );
      })}
    </svg>
  );

  const getStatusColor = (status) => {
    const colors = {
      good: '#4ADE80',
      review: '#FBBF24',
      critical: '#EF4444'
    };
    return colors[status] || '#9CA3AF';
  };

  const getHealthColor = (score) => {
    if (score >= 80) return '#4ADE80';
    if (score >= 60) return '#FBBF24';
    return '#EF4444';
  };

  const renderHome = () => (
    <div className="space-y-8">
      <div className="bg-gradient-to-br from-[#1C1D20] to-[#0F0F10] rounded-lg p-8 border border-[#2A2B2E]">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h2 className="text-2xl font-semibold text-[#F6F6F4] mb-2 tracking-tight">Household Health Score</h2>
            <p className="text-gray-400">Overall system health across all domains</p>
            
            <div className="mt-6 flex gap-6">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#4ADE80]"></div>
                <span className="text-sm text-gray-400">Good (80+)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#FBBF24]"></div>
                <span className="text-sm text-gray-400">Review (60-79)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#EF4444]"></div>
                <span className="text-sm text-gray-400">Critical (<60)</span>
              </div>
            </div>
          </div>
          
          <div className="text-center">
            <div className="relative inline-block">
              <svg width="160" height="160" viewBox="0 0 160 160">
                <circle
                  cx="80"
                  cy="80"
                  r="70"
                  fill="none"
                  stroke="#2A2B2E"
                  strokeWidth="12"
                />
                <circle
                  cx="80"
                  cy="80"
                  r="70"
                  fill="none"
                  stroke={getHealthColor(householdHealth)}
                  strokeWidth="12"
                  strokeDasharray={`${(householdHealth / 100) * 440} 440`}
                  strokeLinecap="round"
                  transform="rotate(-90 80 80)"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <div>
                  <div className="text-5xl font-bold" style={{ color: getHealthColor(householdHealth) }}>
                    {householdHealth}
                  </div>
                  <div className="text-xs text-gray-500 uppercase tracking-wider mt-1">
                    {householdHealth >= 80 ? 'Good' : householdHealth >= 60 ? 'Review' : 'Critical'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-[#1C1D20] rounded-lg p-8 border border-[#2A2B2E]">
        <h2 className="text-xl font-semibold text-[#F6F6F4] mb-6 tracking-tight">Next Best Action</h2>
        <div className="border-l-4 border-[#C9A24D] pl-6 py-4 bg-gradient-to-r from-[#C9A24D]/10 to-transparent">
          <h3 className="font-semibold text-[#F6F6F4] mb-3 text-lg">{nextAction.title}</h3>
          <p className="text-gray-400 leading-relaxed">{nextAction.reason}</p>
        </div>
      </div>

      <div className="bg-[#1C1D20] rounded-lg p-8 border border-[#2A2B2E]">
        <h2 className="text-xl font-semibold text-[#F6F6F4] mb-6 tracking-tight">Priority Items</h2>
        <div className="space-y-4">
          {priorities.map(priority => (
            <div key={priority.id} className="p-5 bg-[#0F0F10] rounded-lg border border-[#2A2B2E] hover:border-[#C9A24D]/30 transition-all">
              <div className="flex items-start gap-4 mb-3">
                <div className={`w-3 h-3 rounded-full mt-2 flex-shrink-0 ${priority.urgency === 'high' ? 'bg-[#EF4444]' : 'bg-[#FBBF24]'}`} />
                <div className="flex-1">
                  <p className="text-[#F6F6F4] leading-relaxed font-medium mb-2">{priority.text}</p>
                  
                  {priority.connectedDomains && (
                    <div className="flex gap-2 flex-wrap mb-3">
                      {priority.connectedDomains.map((domain, idx) => (
                        <span key={idx} className="px-2 py-1 bg-[#C9A24D]/10 border border-[#C9A24D]/30 rounded text-xs text-[#C9A24D] uppercase tracking-wider">
                          {domain}
                        </span>
                      ))}
                    </div>
                  )}
                  
                  <p className="text-sm text-gray-400 leading-relaxed mb-2">{priority.impact}</p>
                  
                  {priority.action && (
                    <button className="mt-3 px-4 py-2 bg-[#C9A24D] text-[#0F0F10] rounded font-semibold text-sm hover:bg-[#B8934D] transition-colors">
                      {priority.action}
                    </button>
                  )}
                  
                  <div className="text-sm text-gray-500 uppercase tracking-wider mt-3">{priority.domain}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {domains.map(domain => {
          const Icon = domain.icon;
          const statusColor = getStatusColor(domain.status);
          return (
            <div key={domain.name} className="bg-[#1C1D20] rounded-lg p-6 border border-[#2A2B2E] hover:border-[#C9A24D]/50 transition-all">
              <div className="flex items-start justify-between mb-4">
                <div className="p-2 rounded-lg" style={{ backgroundColor: `${statusColor}20` }}>
                  <Icon className="w-5 h-5" style={{ color: statusColor }} />
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold" style={{ color: statusColor }}>{domain.score}</div>
                  <div className="text-xs uppercase tracking-wider mt-1" style={{ color: statusColor }}>
                    {domain.status}
                  </div>
                </div>
              </div>
              <h3 className="font-semibold text-[#F6F6F4] tracking-tight mb-2">{domain.name}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{domain.description}</p>
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderTimeline = () => (
    <div className="space-y-8">
      <div className="bg-gradient-to-br from-[#1C1D20] to-[#0F0F10] rounded-lg p-8 border border-[#2A2B2E]">
        <h2 className="text-2xl font-semibold text-[#F6F6F4] mb-2 tracking-tight">Household Timeline</h2>
        <p className="text-gray-400">Your household's memory. Every decision, documented.</p>
      </div>

      <div className="space-y-6">
        {timeline.map((event, idx) => (
          <div key={idx} className="bg-[#1C1D20] rounded-lg p-8 border border-[#2A2B2E] hover:border-[#C9A24D]/50 transition-all">
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="text-sm text-gray-500 mb-2 uppercase tracking-wider">{new Date(event.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</div>
                <h3 className="text-lg font-semibold text-[#F6F6F4] tracking-tight">{event.title}</h3>
                <div className="text-sm text-[#C9A24D] mt-2 uppercase tracking-wider">{event.domain}</div>
              </div>
              <div className="px-4 py-2 bg-gradient-to-r from-[#C9A24D]/20 to-transparent rounded text-xs text-[#C9A24D] uppercase tracking-wider border border-[#C9A24D]/30">
                {event.type}
              </div>
            </div>
            <p className="text-gray-400 mb-4 leading-relaxed">{event.description}</p>
            <div className="flex gap-3 flex-wrap">
              {event.documents.map((doc, didx) => (
                <div key={didx} className="flex items-center gap-2 px-3 py-2 bg-[#2A2B2E] rounded text-xs text-gray-400 border border-[#2A2B2E] hover:border-[#C9A24D]/30 transition-all">
                  <FileText className="w-3 h-3" />
                  {doc}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderAssets = () => (
    <div className="space-y-8">
      <div className="bg-gradient-to-br from-[#1C1D20] to-[#0F0F10] rounded-lg p-8 border border-[#2A2B2E]">
        <h2 className="text-2xl font-semibold text-[#F6F6F4] mb-2 tracking-tight">Assets & Coverage</h2>
        <p className="text-gray-400">What you own, what protects it, and where attention is needed.</p>
      </div>

      <div className="space-y-6">
        {assets.map((asset, idx) => (
          <div key={idx} className="bg-[#1C1D20] rounded-lg p-8 border border-[#2A2B2E] hover:border-[#C9A24D]/50 transition-all">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-[#F6F6F4] tracking-tight">{asset.name}</h3>
                <div className="text-sm text-gray-500 mt-2 uppercase tracking-wider">{asset.type} · {asset.value}</div>
              </div>
              <div className={`flex items-center gap-2 px-4 py-2 rounded ${asset.coverage === 'Covered' ? 'bg-[#4ADE80]/20 text-[#4ADE80]' : 'bg-[#FBBF24]/20 text-[#FBBF24]'}`}> 
                {asset.coverage === 'Covered' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                <span className="font-semibold uppercase tracking-wider text-sm">{asset.coverage}</span>
              </div>
            </div>
            <p className="text-gray-400 mb-2">{asset.details}</p>
            {asset.gap && (
              <div className="border-l-4 border-[#FBBF24] pl-6 py-4 mt-4 bg-gradient-to-r from-[#FBBF24]/10 to-transparent">
                <p className="text-[#F6F6F4] leading-relaxed">{asset.gap}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  const renderVault = () => (
    <div className="space-y-8">
      <div className="bg-gradient-to-br from-[#1C1D20] to-[#0F0F10] rounded-lg p-8 border border-[#2A2B2E]">
        <h2 className="text-2xl font-semibold text-[#F6F6F4] mb-2 tracking-tight">Command Vault</h2>
        <p className="text-gray-400">Your household's source of truth. Everything important, organized.</p>
      </div>

      <div className="bg-[#1C1D20] rounded-lg p-8 border border-[#2A2B2E]">
        <h3 className="text-lg font-semibold text-[#F6F6F4] mb-6 tracking-tight">Documents</h3>
        <div className="space-y-2">
          {documents.map((doc, idx) => (
            <div key={idx} className="flex items-center justify-between p-4 border-b border-[#2A2B2E] last:border-0 hover:bg-[#2A2B2E] transition-colors rounded">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-[#C9A24D]/10 rounded">
                  <FileText className="w-5 h-5 text-[#C9A24D]" />
                </div>
                <div>
                  <div className="text-[#F6F6F4] font-medium">{doc.name}</div>
                  <div className="text-xs text-gray-500 mt-1 uppercase tracking-wider">{doc.category}</div>
                </div>
              </div>
              <div className="text-sm text-gray-500">{new Date(doc.date).toLocaleDateString()}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-[#1C1D20] rounded-lg p-8 border border-[#2A2B2E]">
        <h3 className="text-lg font-semibold text-[#F6F6F4] mb-6 tracking-tight">Trusted Advisors</h3>
        <div className="space-y-4">
          {advisors.map((advisor, idx) => (
            <div key={idx} className="flex items-start gap-4 p-5 border border-[#2A2B2E] rounded hover:border-[#C9A24D]/50 transition-all">
              <div className="p-2 bg-[#C9A24D]/10 rounded">
                <User className="w-5 h-5 text-[#C9A24D]" />
              </div>
              <div className="flex-1">
                <div className="text-[#F6F6F4] font-semibold">{advisor.name}</div>
                <div className="text-sm text-gray-400 mt-1">{advisor.role} · {advisor.firm}</div>
                <div className="text-sm text-gray-500 mt-2">{advisor.phone}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0F0F10]" style={{ fontFamily: 'Inter, -apple-system, system-ui, sans-serif' }}>
      <div className="bg-gradient-to-r from-[#1C1D20] to-[#0F0F10] border-b border-[#2A2B2E] px-8 py-6">
        <div className="max-w-7xl mx-auto flex items-center gap-4">
          <Logo />
          <div>
            <h1 className="text-2xl font-bold text-[#F6F6F4] tracking-tight" style={{ letterSpacing: '-0.02em' }}>COMMAND</h1>
            <p className="text-xs text-gray-500 uppercase tracking-widest mt-1" style={{ letterSpacing: '0.12em' }}>Command Your Household</p>
          </div>
        </div>
      </div>

      <div className="bg-[#1C1D20] border-b border-[#2A2B2E]">
        <div className="max-w-7xl mx-auto px-8">
          <div className="flex gap-1">
            {[
              { id: 'home', label: 'Home', icon: Home },
              { id: 'timeline', label: 'Timeline', icon: Clock },
              { id: 'assets', label: 'Assets & Coverage', icon: Shield },
              { id: 'vault', label: 'Vault', icon: FolderLock }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveScreen(tab.id)}
                className={`flex items-center gap-3 px-6 py-4 border-b-2 transition-all tracking-tight ${
                  activeScreen === tab.id
                    ? 'border-[#C9A24D] text-[#C9A24D]'
                    : 'border-transparent text-gray-500 hover:text-gray-400'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-8 py-12">
        {activeScreen === 'home' && renderHome()}
        {activeScreen === 'timeline' && renderTimeline()}
        {activeScreen === 'assets' && renderAssets()}
        {activeScreen === 'vault' && renderVault()}
      </div>
    </div>
  );
};

export default CommandApp;