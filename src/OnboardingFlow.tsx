import React, { useState } from 'react';
import { supabase } from './lib/supabase';
import {
  ChevronRight,
  ChevronLeft,
  Home,
  DollarSign,
  Users,
  Shield,
  MapPin,
  CheckCircle,
  Circle,
} from 'lucide-react';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
interface OnboardingData {
  // Household
  firstName: string;
  lastName: string;
  spousePartner: 'yes' | 'no' | '';
  spouseFirstName: string;
  city: string;
  state: string;

  // Home
  homeOwnership: 'own' | 'rent' | '';
  homeValue: string;
  yearBuilt: string;
  hvacAge: 'under5' | '5to10' | '10to15' | 'over15' | 'unknown' | '';
  roofAge: 'under5' | '5to10' | '10to15' | 'over15' | 'unknown' | '';

  // Financial
  householdIncome: string;
  netWorth: string;
  emergencyFund: 'under3' | '3to6' | 'over6' | 'none' | '';

  // Family
  numChildren: string;
  agingParents: 'yes' | 'no' | '';
  upcomingLifeEvents: string[];

  // Protection
  hasWill: 'yes' | 'no' | 'outdated' | '';
  hasTrust: 'yes' | 'no' | '';
  hasUmbrella: 'yes' | 'no' | 'unsure' | '';
  lifeInsuranceReview: 'under1yr' | '1to3yr' | 'over3yr' | 'never' | '';
}

interface OnboardingFlowProps {
  userId: string;
  onComplete: () => void;
}

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────
const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA',
  'KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT',
  'VA','WA','WV','WI','WY','DC',
];

const LIFE_EVENTS = [
  'Child starting college',
  'Retirement in next 5 years',
  'Major home renovation',
  'New baby expected',
  'Job change or promotion',
  'Caring for aging parent',
  'Divorce or separation',
  'Inheritance expected',
];

const SECTION_SCORE_DEFAULTS = [
  { section_name: 'advisory', score: 0, status: 'not_started' },
  { section_name: 'insurance', score: 0, status: 'not_started' },
  { section_name: 'legal', score: 0, status: 'not_started' },
  { section_name: 'family', score: 0, status: 'not_started' },
  { section_name: 'home', score: 0, status: 'not_started' },
  { section_name: 'taxes', score: 0, status: 'not_started' },
  { section_name: 'healthcare', score: 0, status: 'not_started' },
  { section_name: 'finances', score: 0, status: 'not_started' },
  { section_name: 'credit', score: 0, status: 'not_started' },
];

// ─────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────

const ProgressBar: React.FC<{ current: number; total: number }> = ({ current, total }) => (
  <div className="flex items-center gap-1.5 mb-8">
    {Array.from({ length: total }).map((_, i) => (
      <div
        key={i}
        className={`h-0.5 flex-1 rounded-full transition-all duration-500 ${
          i < current ? 'bg-[#C9A24D]' : 'bg-[#2a2b2e]'
        }`}
      />
    ))}
  </div>
);

const StepLabel: React.FC<{ icon: React.ReactNode; label: string }> = ({ icon, label }) => (
  <div className="flex items-center gap-2 mb-6">
    <div className="w-7 h-7 rounded-lg bg-[#C9A24D]/10 border border-[#C9A24D]/20 flex items-center justify-center text-[#C9A24D]">
      {icon}
    </div>
    <span className="text-[#808084] text-xs tracking-[0.2em] font-medium uppercase">{label}</span>
  </div>
);

const OptionCard: React.FC<{
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}> = ({ selected, onClick, children }) => (
  <button
    onClick={onClick}
    className={`w-full text-left px-4 py-3.5 rounded-xl border transition-all duration-200 ${
      selected
        ? 'bg-[#C9A24D]/10 border-[#C9A24D]/50 text-[#F6F6F4]'
        : 'bg-[#1C1D20] border-[#2a2b2e] text-[#a0a0a4] hover:border-[#3a3b3e] hover:text-[#F6F6F4]'
    }`}
  >
    <div className="flex items-center justify-between">
      <span className="text-sm font-medium">{children}</span>
      {selected ? (
        <CheckCircle size={16} className="text-[#C9A24D] shrink-0" />
      ) : (
        <Circle size={16} className="text-[#3a3b3e] shrink-0" />
      )}
    </div>
  </button>
);

const MultiSelectCard: React.FC<{
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}> = ({ selected, onClick, children }) => (
  <button
    onClick={onClick}
    className={`w-full text-left px-4 py-3 rounded-xl border transition-all duration-200 ${
      selected
        ? 'bg-[#C9A24D]/10 border-[#C9A24D]/50 text-[#F6F6F4]'
        : 'bg-[#1C1D20] border-[#2a2b2e] text-[#a0a0a4] hover:border-[#3a3b3e] hover:text-[#F6F6F4]'
    }`}
  >
    <div className="flex items-center gap-3">
      <div
        className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
          selected ? 'bg-[#C9A24D] border-[#C9A24D]' : 'border-[#3a3b3e]'
        }`}
      >
        {selected && (
          <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
            <path d="M1 4L3.5 6.5L9 1" stroke="#0F0F10" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </div>
      <span className="text-sm font-medium">{children}</span>
    </div>
  </button>
);

const TextInput: React.FC<{
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  prefix?: string;
}> = ({ placeholder, value, onChange, type = 'text', prefix }) => (
  <div className="relative">
    {prefix && (
      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#808084] text-sm font-medium pointer-events-none">
        {prefix}
      </span>
    )}
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={`w-full bg-[#1C1D20] border border-[#2a2b2e] rounded-xl text-[#F6F6F4] text-sm placeholder-[#4a4b4e] outline-none focus:border-[#C9A24D]/50 transition-colors py-3.5 ${prefix ? 'pl-8 pr-4' : 'px-4'}`}
    />
  </div>
);

const SelectInput: React.FC<{
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
}> = ({ value, onChange, options, placeholder }) => (
  <select
    value={value}
    onChange={(e) => onChange(e.target.value)}
    className="w-full bg-[#1C1D20] border border-[#2a2b2e] rounded-xl text-sm px-4 py-3.5 outline-none focus:border-[#C9A24D]/50 transition-colors appearance-none"
    style={{ color: value ? '#F6F6F4' : '#4a4b4e' }}
  >
    {placeholder && <option value="" disabled>{placeholder}</option>}
    {options.map((o) => (
      <option key={o.value} value={o.value} style={{ color: '#F6F6F4', background: '#1C1D20' }}>
        {o.label}
      </option>
    ))}
  </select>
);

// ─────────────────────────────────────────────
// Setup Loading Screen
// ─────────────────────────────────────────────
const SetupScreen: React.FC<{ firstName: string }> = ({ firstName }) => {
  const steps = [
    'Creating your household profile',
    'Analyzing protection gaps',
    'Calculating financial risk exposure',
    'Identifying quick wins',
    'Building your Command dashboard',
  ];
  const [activeStep, setActiveStep] = React.useState(0);

  React.useEffect(() => {
    const interval = setInterval(() => {
      setActiveStep((s) => (s < steps.length - 1 ? s + 1 : s));
    }, 800);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-[#0F0F10] flex flex-col items-center justify-center px-6">
      {/* Animated ring */}
      <div className="relative w-20 h-20 mb-10">
        <div className="absolute inset-0 rounded-full border-2 border-[#2a2b2e]" />
        <div
          className="absolute inset-0 rounded-full border-2 border-transparent border-t-[#C9A24D] animate-spin"
          style={{ animationDuration: '1.2s' }}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-2.5 h-2.5 rounded-full bg-[#C9A24D]" />
        </div>
      </div>

      <div className="text-[#C9A24D] text-xs tracking-[0.35em] font-medium mb-3">
        COMMAND
      </div>
      <h2 className="text-[#F6F6F4] text-2xl font-semibold mb-1">
        Setting up your household
      </h2>
      <p className="text-[#808084] text-sm mb-12">
        Just a moment{firstName ? `, ${firstName}` : ''}…
      </p>

      <div className="w-full max-w-xs space-y-3">
        {steps.map((step, i) => (
          <div
            key={i}
            className={`flex items-center gap-3 transition-all duration-500 ${
              i <= activeStep ? 'opacity-100' : 'opacity-20'
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-all duration-300 ${
                i < activeStep
                  ? 'bg-[#C9A24D] border-[#C9A24D]'
                  : i === activeStep
                  ? 'border-[#C9A24D]'
                  : 'border-[#3a3b3e]'
              }`}
            >
              {i < activeStep && (
                <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                  <path d="M1 4L3.5 6.5L9 1" stroke="#0F0F10" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
              {i === activeStep && (
                <div className="w-1.5 h-1.5 rounded-full bg-[#C9A24D] animate-pulse" />
              )}
            </div>
            <span
              className={`text-sm ${
                i <= activeStep ? 'text-[#F6F6F4]' : 'text-[#4a4b4e]'
              }`}
            >
              {step}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────
// Main OnboardingFlow Component
// ─────────────────────────────────────────────
export const OnboardingFlow: React.FC<OnboardingFlowProps> = ({ userId, onComplete }) => {
  const TOTAL_STEPS = 6;
  const [step, setStep] = useState(0); // 0 = welcome
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSetup, setShowSetup] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState<OnboardingData>({
    firstName: '',
    lastName: '',
    spousePartner: '',
    spouseFirstName: '',
    city: '',
    state: '',
    homeOwnership: '',
    homeValue: '',
    yearBuilt: '',
    hvacAge: '',
    roofAge: '',
    householdIncome: '',
    netWorth: '',
    emergencyFund: '',
    numChildren: '',
    agingParents: '',
    upcomingLifeEvents: [],
    hasWill: '',
    hasTrust: '',
    hasUmbrella: '',
    lifeInsuranceReview: '',
  });

  const update = (key: keyof OnboardingData, value: any) => {
    setForm((f) => ({ ...f, [key]: value }));
  };

  const toggleLifeEvent = (event: string) => {
    setForm((f) => ({
      ...f,
      upcomingLifeEvents: f.upcomingLifeEvents.includes(event)
        ? f.upcomingLifeEvents.filter((e) => e !== event)
        : [...f.upcomingLifeEvents, event],
    }));
  };

  // ── Submit to Supabase ──────────────────────
  const handleSubmit = async () => {
    setIsSubmitting(true);
    setShowSetup(true);
    setError(null);

    try {
      // 1. Create household record
      const { data: householdData, error: householdError } = await supabase
        .from('households')
        .insert({
          user_id: userId,
          name: `${form.firstName}${form.lastName ? ' ' + form.lastName : ''} Household`,
          health_score: 0,
        })
        .select('id')
        .single();

      if (householdError) throw householdError;
      const householdId = householdData.id;

      // 2. Create household profile
      const incomeNum = form.householdIncome ? parseInt(form.householdIncome.replace(/\D/g, '')) : null;
      const netWorthNum = form.netWorth ? parseInt(form.netWorth.replace(/\D/g, '')) : null;
      const homeValueNum = form.homeValue ? parseInt(form.homeValue.replace(/\D/g, '')) : null;

      await supabase.from('household_profile').insert({
        household_id: householdId,
        primary_first_name: form.firstName,
        primary_last_name: form.lastName,
        spouse_first_name: form.spouseFirstName || null,
        city: form.city || null,
        state: form.state || null,
        home_ownership: form.homeOwnership || null,
        home_value: homeValueNum,
        year_built: form.yearBuilt ? parseInt(form.yearBuilt) : null,
        household_income: incomeNum,
        net_worth: netWorthNum,
        emergency_fund_status: form.emergencyFund || null,
        num_children: form.numChildren ? parseInt(form.numChildren) : 0,
        has_aging_parents: form.agingParents === 'yes',
        upcoming_life_events: form.upcomingLifeEvents,
        has_will: form.hasWill || null,
        has_trust: form.hasTrust || null,
        has_umbrella: form.hasUmbrella || null,
        life_insurance_review: form.lifeInsuranceReview || null,
        hvac_age: form.hvacAge || null,
        roof_age: form.roofAge || null,
      });

      // 3. Auto-create blank section scores
      await supabase.from('section_scores').insert(
        SECTION_SCORE_DEFAULTS.map((s) => ({
          household_id: householdId,
          ...s,
        }))
      );

      // 4. Create initial priority actions based on answers
      const actions: any[] = [];

      if (form.hasWill === 'no') {
        actions.push({
          household_id: householdId,
          title: 'Create a will',
          category: 'Legal',
          severity: 'Critical',
          description: 'You don\'t have a will. Without one, the state decides how your assets are distributed.',
          is_dismissed: false,
        });
      } else if (form.hasWill === 'outdated') {
        actions.push({
          household_id: householdId,
          title: 'Update your will',
          category: 'Legal',
          severity: 'High',
          description: 'Your will may not reflect your current wishes, assets, or family situation.',
          is_dismissed: false,
        });
      }

      if (form.hasUmbrella === 'no') {
        actions.push({
          household_id: householdId,
          title: 'Add umbrella liability insurance',
          category: 'Insurance',
          severity: 'High',
          description: 'You have no umbrella policy. A $1–2M policy costs ~$200–400/year and protects your net worth.',
          is_dismissed: false,
        });
      }

      if (form.lifeInsuranceReview === 'over3yr' || form.lifeInsuranceReview === 'never') {
        actions.push({
          household_id: householdId,
          title: 'Review life insurance coverage',
          category: 'Insurance',
          severity: 'High',
          description: 'Your life insurance hasn\'t been reviewed recently. Coverage gaps are common after major life changes.',
          is_dismissed: false,
        });
      }

      if (form.hvacAge === 'over15') {
        actions.push({
          household_id: householdId,
          title: 'Plan HVAC replacement',
          category: 'Home',
          severity: 'Medium',
          description: 'Your HVAC system is over 15 years old. Average lifespan is 15–20 years — plan ahead to avoid emergency replacement costs.',
          is_dismissed: false,
        });
      }

      if (form.emergencyFund === 'none' || form.emergencyFund === 'under3') {
        actions.push({
          household_id: householdId,
          title: 'Build emergency fund to 3–6 months',
          category: 'Finances',
          severity: 'High',
          description: 'Your emergency fund is below the recommended 3-month minimum. This is a foundational financial risk.',
          is_dismissed: false,
        });
      }

      if (actions.length > 0) {
        await supabase.from('priority_actions').insert(actions);
      }

      // 5. Calculate initial health score (very rough — refine later)
      let score = 50;
      if (form.hasWill === 'yes') score += 8;
      if (form.hasUmbrella === 'yes') score += 8;
      if (form.hasTrust === 'yes') score += 5;
      if (form.emergencyFund === 'over6') score += 8;
      else if (form.emergencyFund === '3to6') score += 4;
      if (form.lifeInsuranceReview === 'under1yr') score += 5;
      score = Math.min(score, 85); // never start at 100

      await supabase.from('households').update({ health_score: score }).eq('id', householdId);

      // 6. Wait for setup animation to breathe
      await new Promise((r) => setTimeout(r, 4800));

      onComplete();
    } catch (err: any) {
      console.error('Onboarding error:', err);
      setError(err.message || 'Something went wrong. Please try again.');
      setShowSetup(false);
      setIsSubmitting(false);
    }
  };

  // ── Navigation ──────────────────────────────
  const canProceed = (): boolean => {
    switch (step) {
      case 1: return form.firstName.trim().length > 0;
      case 2: return form.homeOwnership !== '';
      case 3: return form.householdIncome.trim().length > 0;
      case 4: return true; // family step is optional
      case 5: return form.hasWill !== '' && form.hasUmbrella !== '';
      default: return true;
    }
  };

  const next = () => {
    if (step < TOTAL_STEPS) setStep((s) => s + 1);
    else handleSubmit();
  };

  const back = () => {
    if (step > 1) setStep((s) => s - 1);
  };

  // ── Setup screen overlay ────────────────────
  if (showSetup) {
    return <SetupScreen firstName={form.firstName} />;
  }

  // ── Welcome screen ──────────────────────────
  if (step === 0) {
    return (
      <div className="min-h-screen bg-[#0F0F10] flex flex-col items-center justify-center px-6">
        {/* Background grain */}
        <div
          className="fixed inset-0 pointer-events-none opacity-30"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.15'/%3E%3C/svg%3E")`,
            backgroundSize: '150px 150px',
          }}
        />

        <div className="relative z-10 text-center max-w-sm w-full">
          {/* Logo */}
          <div className="mb-10">
            <img src="/Command_Logo.png" alt="Command" className="h-24 mx-auto" />
          </div>

          {/* Headline */}
          <h1 className="text-[#F6F6F4] text-3xl font-semibold leading-tight mb-4">
            You're in command now.
          </h1>
          <p className="text-[#808084] text-base leading-relaxed mb-10">
            We'll ask a few questions to build your household profile and surface the issues that need your attention most.
          </p>

          {/* Stats chips */}
          <div className="flex items-center justify-center gap-3 mb-12">
            {[
              { label: '6 questions', sub: 'Setup steps' },
              { label: '~4 min', sub: 'Time to complete' },
              { label: '9 areas', sub: 'Assessed' },
            ].map((chip) => (
              <div key={chip.label} className="bg-[#1C1D20] border border-[#2a2b2e] rounded-lg px-3 py-2.5 text-center">
                <div className="text-[#F6F6F4] text-sm font-semibold">{chip.label}</div>
                <div className="text-[#808084] text-xs mt-0.5">{chip.sub}</div>
              </div>
            ))}
          </div>

          <button
            onClick={() => setStep(1)}
            className="w-full bg-[#C9A24D] hover:bg-[#b8913c] text-[#0F0F10] font-semibold rounded-xl py-4 transition-colors flex items-center justify-center gap-2"
          >
            Get started
            <ChevronRight size={18} />
          </button>

          <p className="text-[#4a4b4e] text-xs mt-4">
            You can update any of this later from your profile.
          </p>
        </div>
      </div>
    );
  }

  // ── Step wrapper shell ──────────────────────
  return (
    <div className="min-h-screen bg-[#0F0F10] flex flex-col px-6 py-8">
      <div className="max-w-sm w-full mx-auto flex flex-col flex-1">
        {/* Top: wordmark + step count */}
        <div className="flex items-center justify-between mb-6">
          <div className="text-[#C9A24D] text-xs tracking-[0.35em] font-medium">COMMAND</div>
          <span className="text-[#4a4b4e] text-xs">
            {step} / {TOTAL_STEPS}
          </span>
        </div>

        <ProgressBar current={step} total={TOTAL_STEPS} />

        {/* Content area */}
        <div className="flex-1">

          {/* ── Step 1: Your Household ── */}
          {step === 1 && (
            <div>
              <StepLabel icon={<Users size={14} />} label="Your Household" />
              <h2 className="text-[#F6F6F4] text-2xl font-semibold mb-1">Who's in the household?</h2>
              <p className="text-[#808084] text-sm mb-7">
                This becomes the identity of your Command account.
              </p>

              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <TextInput
                    placeholder="First name"
                    value={form.firstName}
                    onChange={(v) => update('firstName', v)}
                  />
                  <TextInput
                    placeholder="Last name"
                    value={form.lastName}
                    onChange={(v) => update('lastName', v)}
                  />
                </div>

                <div>
                  <label className="text-[#808084] text-xs tracking-wider uppercase mb-2 block">
                    Spouse or partner?
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <OptionCard
                      selected={form.spousePartner === 'yes'}
                      onClick={() => update('spousePartner', 'yes')}
                    >
                      Yes
                    </OptionCard>
                    <OptionCard
                      selected={form.spousePartner === 'no'}
                      onClick={() => { update('spousePartner', 'no'); update('spouseFirstName', ''); }}
                    >
                      No
                    </OptionCard>
                  </div>
                </div>

                {form.spousePartner === 'yes' && (
                  <TextInput
                    placeholder="Spouse / partner first name"
                    value={form.spouseFirstName}
                    onChange={(v) => update('spouseFirstName', v)}
                  />
                )}

                <div>
                  <label className="text-[#808084] text-xs tracking-wider uppercase mb-2 block">
                    Location
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <TextInput
                      placeholder="City"
                      value={form.city}
                      onChange={(v) => update('city', v)}
                    />
                    <SelectInput
                      value={form.state}
                      onChange={(v) => update('state', v)}
                      placeholder="State"
                      options={US_STATES.map((s) => ({ value: s, label: s }))}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Step 2: Your Home ── */}
          {step === 2 && (
            <div>
              <StepLabel icon={<Home size={14} />} label="Your Home" />
              <h2 className="text-[#F6F6F4] text-2xl font-semibold mb-1">Tell us about your home.</h2>
              <p className="text-[#808084] text-sm mb-7">
                We use this to assess maintenance risk and asset exposure.
              </p>

              <div className="space-y-5">
                <div>
                  <label className="text-[#808084] text-xs tracking-wider uppercase mb-2 block">
                    Do you own or rent?
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <OptionCard
                      selected={form.homeOwnership === 'own'}
                      onClick={() => update('homeOwnership', 'own')}
                    >
                      Own
                    </OptionCard>
                    <OptionCard
                      selected={form.homeOwnership === 'rent'}
                      onClick={() => update('homeOwnership', 'rent')}
                    >
                      Rent
                    </OptionCard>
                  </div>
                </div>

                {form.homeOwnership === 'own' && (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[#808084] text-xs tracking-wider uppercase mb-2 block">
                          Estimated home value
                        </label>
                        <TextInput
                          placeholder="e.g. 750000"
                          value={form.homeValue}
                          onChange={(v) => update('homeValue', v)}
                          prefix="$"
                          type="number"
                        />
                      </div>
                      <div>
                        <label className="text-[#808084] text-xs tracking-wider uppercase mb-2 block">
                          Year built
                        </label>
                        <TextInput
                          placeholder="e.g. 1998"
                          value={form.yearBuilt}
                          onChange={(v) => update('yearBuilt', v)}
                          type="number"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[#808084] text-xs tracking-wider uppercase mb-2 block">
                        How old is your HVAC system?
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { value: 'under5', label: 'Under 5 yrs' },
                          { value: '5to10', label: '5–10 yrs' },
                          { value: '10to15', label: '10–15 yrs' },
                          { value: 'over15', label: '15+ yrs' },
                        ].map((opt) => (
                          <OptionCard
                            key={opt.value}
                            selected={form.hvacAge === opt.value}
                            onClick={() => update('hvacAge', opt.value)}
                          >
                            {opt.label}
                          </OptionCard>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="text-[#808084] text-xs tracking-wider uppercase mb-2 block">
                        How old is your roof?
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { value: 'under5', label: 'Under 5 yrs' },
                          { value: '5to10', label: '5–10 yrs' },
                          { value: '10to15', label: '10–15 yrs' },
                          { value: 'over15', label: '15+ yrs' },
                        ].map((opt) => (
                          <OptionCard
                            key={opt.value}
                            selected={form.roofAge === opt.value}
                            onClick={() => update('roofAge', opt.value)}
                          >
                            {opt.label}
                          </OptionCard>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* ── Step 3: Financial Picture ── */}
          {step === 3 && (
            <div>
              <StepLabel icon={<DollarSign size={14} />} label="Financial Picture" />
              <h2 className="text-[#F6F6F4] text-2xl font-semibold mb-1">Your financial overview.</h2>
              <p className="text-[#808084] text-sm mb-7">
                Used to calibrate risk exposure and identify coverage gaps.
              </p>

              <div className="space-y-5">
                <div>
                  <label className="text-[#808084] text-xs tracking-wider uppercase mb-2 block">
                    Household income (annual)
                  </label>
                  <SelectInput
                    value={form.householdIncome}
                    onChange={(v) => update('householdIncome', v)}
                    placeholder="Select range"
                    options={[
                      { value: '75000', label: 'Under $100K' },
                      { value: '150000', label: '$100K – $200K' },
                      { value: '275000', label: '$200K – $350K' },
                      { value: '425000', label: '$350K – $500K' },
                      { value: '600000', label: '$500K – $750K' },
                      { value: '900000', label: '$750K+' },
                    ]}
                  />
                </div>

                <div>
                  <label className="text-[#808084] text-xs tracking-wider uppercase mb-2 block">
                    Estimated net worth
                  </label>
                  <SelectInput
                    value={form.netWorth}
                    onChange={(v) => update('netWorth', v)}
                    placeholder="Select range"
                    options={[
                      { value: '100000', label: 'Under $250K' },
                      { value: '375000', label: '$250K – $500K' },
                      { value: '750000', label: '$500K – $1M' },
                      { value: '1500000', label: '$1M – $2M' },
                      { value: '3000000', label: '$2M – $5M' },
                      { value: '6000000', label: '$5M+' },
                    ]}
                  />
                </div>

                <div>
                  <label className="text-[#808084] text-xs tracking-wider uppercase mb-2 block">
                    Emergency fund status
                  </label>
                  <div className="space-y-2">
                    {[
                      { value: 'none', label: "I don't have one" },
                      { value: 'under3', label: 'Less than 3 months of expenses' },
                      { value: '3to6', label: '3–6 months of expenses' },
                      { value: 'over6', label: '6+ months of expenses' },
                    ].map((opt) => (
                      <OptionCard
                        key={opt.value}
                        selected={form.emergencyFund === opt.value}
                        onClick={() => update('emergencyFund', opt.value)}
                      >
                        {opt.label}
                      </OptionCard>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Step 4: Your Family ── */}
          {step === 4 && (
            <div>
              <StepLabel icon={<Users size={14} />} label="Your Family" />
              <h2 className="text-[#F6F6F4] text-2xl font-semibold mb-1">Family & life events.</h2>
              <p className="text-[#808084] text-sm mb-7">
                Helps us identify life events that affect your financial and legal planning.
              </p>

              <div className="space-y-5">
                <div>
                  <label className="text-[#808084] text-xs tracking-wider uppercase mb-2 block">
                    Number of children
                  </label>
                  <div className="grid grid-cols-5 gap-2">
                    {['0', '1', '2', '3', '4+'].map((n) => (
                      <OptionCard
                        key={n}
                        selected={form.numChildren === n}
                        onClick={() => update('numChildren', n)}
                      >
                        <span className="block text-center w-full">{n}</span>
                      </OptionCard>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-[#808084] text-xs tracking-wider uppercase mb-2 block">
                    Do you have aging parents to care for?
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <OptionCard
                      selected={form.agingParents === 'yes'}
                      onClick={() => update('agingParents', 'yes')}
                    >
                      Yes
                    </OptionCard>
                    <OptionCard
                      selected={form.agingParents === 'no'}
                      onClick={() => update('agingParents', 'no')}
                    >
                      No
                    </OptionCard>
                  </div>
                </div>

                <div>
                  <label className="text-[#808084] text-xs tracking-wider uppercase mb-2 block">
                    Upcoming life events (select all that apply)
                  </label>
                  <div className="space-y-2">
                    {LIFE_EVENTS.map((event) => (
                      <MultiSelectCard
                        key={event}
                        selected={form.upcomingLifeEvents.includes(event)}
                        onClick={() => toggleLifeEvent(event)}
                      >
                        {event}
                      </MultiSelectCard>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Step 5: Protection Gaps ── */}
          {step === 5 && (
            <div>
              <StepLabel icon={<Shield size={14} />} label="Protection Gaps" />
              <h2 className="text-[#F6F6F4] text-2xl font-semibold mb-1">Let's check your coverage.</h2>
              <p className="text-[#808084] text-sm mb-7">
                These four questions reveal the most common and costly blind spots.
              </p>

              <div className="space-y-6">
                <div>
                  <label className="text-[#808084] text-xs tracking-wider uppercase mb-1 block">
                    Do you have a current will?
                  </label>
                  <p className="text-[#4a4b4e] text-xs mb-2">Without one, state law decides who gets your assets</p>
                  <div className="space-y-2">
                    {[
                      { value: 'yes', label: 'Yes, and it\'s current' },
                      { value: 'outdated', label: 'Yes, but it may be outdated' },
                      { value: 'no', label: 'No, I don\'t have one' },
                    ].map((opt) => (
                      <OptionCard
                        key={opt.value}
                        selected={form.hasWill === opt.value}
                        onClick={() => update('hasWill', opt.value)}
                      >
                        {opt.label}
                      </OptionCard>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-[#808084] text-xs tracking-wider uppercase mb-1 block">
                    Do you have a revocable living trust?
                  </label>
                  <p className="text-[#4a4b4e] text-xs mb-2">Avoids probate and protects privacy</p>
                  <div className="grid grid-cols-2 gap-3">
                    <OptionCard
                      selected={form.hasTrust === 'yes'}
                      onClick={() => update('hasTrust', 'yes')}
                    >
                      Yes
                    </OptionCard>
                    <OptionCard
                      selected={form.hasTrust === 'no'}
                      onClick={() => update('hasTrust', 'no')}
                    >
                      No
                    </OptionCard>
                  </div>
                </div>

                <div>
                  <label className="text-[#808084] text-xs tracking-wider uppercase mb-1 block">
                    Do you have umbrella liability insurance?
                  </label>
                  <p className="text-[#4a4b4e] text-xs mb-2">Covers liability beyond home & auto limits</p>
                  <div className="space-y-2">
                    {[
                      { value: 'yes', label: 'Yes, I have an umbrella policy' },
                      { value: 'no', label: 'No, I don\'t' },
                      { value: 'unsure', label: 'I\'m not sure' },
                    ].map((opt) => (
                      <OptionCard
                        key={opt.value}
                        selected={form.hasUmbrella === opt.value}
                        onClick={() => update('hasUmbrella', opt.value)}
                      >
                        {opt.label}
                      </OptionCard>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-[#808084] text-xs tracking-wider uppercase mb-1 block">
                    When did you last review life insurance?
                  </label>
                  <p className="text-[#4a4b4e] text-xs mb-2">Life events often change what you need</p>
                  <div className="space-y-2">
                    {[
                      { value: 'under1yr', label: 'Within the past year' },
                      { value: '1to3yr', label: '1–3 years ago' },
                      { value: 'over3yr', label: 'More than 3 years ago' },
                      { value: 'never', label: 'Never / not sure' },
                    ].map((opt) => (
                      <OptionCard
                        key={opt.value}
                        selected={form.lifeInsuranceReview === opt.value}
                        onClick={() => update('lifeInsuranceReview', opt.value)}
                      >
                        {opt.label}
                      </OptionCard>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Step 6: Confirm ── */}
          {step === 6 && (
            <div>
              <StepLabel icon={<CheckCircle size={14} />} label="Ready" />
              <h2 className="text-[#F6F6F4] text-2xl font-semibold mb-1">You're all set.</h2>
              <p className="text-[#808084] text-sm mb-8">
                Here's a summary of what Command will track from day one.
              </p>

              {/* Summary cards */}
              <div className="space-y-3 mb-8">
                <div className="bg-[#1C1D20] border border-[#2a2b2e] rounded-xl p-4">
                  <div className="text-[#808084] text-xs tracking-wider uppercase mb-2">Household</div>
                  <div className="text-[#F6F6F4] text-sm font-medium">
                    {form.firstName} {form.lastName}
                    {form.spouseFirstName ? ` & ${form.spouseFirstName}` : ''}
                  </div>
                  {form.city && (
                    <div className="text-[#808084] text-xs mt-0.5 flex items-center gap-1">
                      <MapPin size={10} />
                      {form.city}{form.state ? `, ${form.state}` : ''}
                    </div>
                  )}
                </div>

                {/* Risks identified */}
                {(() => {
                  const risks: string[] = [];
                  if (form.hasWill === 'no') risks.push('No will on file');
                  if (form.hasWill === 'outdated') risks.push('Will may be outdated');
                  if (form.hasUmbrella === 'no') risks.push('No umbrella insurance');
                  if (form.hasUmbrella === 'unsure') risks.push('Umbrella coverage unclear');
                  if (form.emergencyFund === 'none' || form.emergencyFund === 'under3') risks.push('Emergency fund below target');
                  if (form.hvacAge === 'over15') risks.push('HVAC system aging');
                  if (form.lifeInsuranceReview === 'over3yr' || form.lifeInsuranceReview === 'never') risks.push('Life insurance not recently reviewed');
                  return risks.length > 0 ? (
                    <div className="bg-[#ef4444]/5 border border-[#ef4444]/15 rounded-xl p-4">
                      <div className="text-[#ef4444] text-xs tracking-wider uppercase mb-2.5">
                        {risks.length} issue{risks.length !== 1 ? 's' : ''} identified
                      </div>
                      <div className="space-y-1.5">
                        {risks.map((r) => (
                          <div key={r} className="flex items-center gap-2">
                            <div className="w-1 h-1 rounded-full bg-[#ef4444] shrink-0" />
                            <span className="text-[#F6F6F4] text-sm">{r}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="bg-[#22c55e]/5 border border-[#22c55e]/15 rounded-xl p-4">
                      <div className="text-[#22c55e] text-xs tracking-wider uppercase mb-1">Strong foundation</div>
                      <p className="text-[#808084] text-sm">No immediate critical gaps identified.</p>
                    </div>
                  );
                })()}

                <div className="bg-[#C9A24D]/5 border border-[#C9A24D]/15 rounded-xl p-4">
                  <div className="text-[#C9A24D] text-xs tracking-wider uppercase mb-1">9 pillars activated</div>
                  <p className="text-[#808084] text-sm">Insurance, legal, home, finances, taxes, healthcare, family, credit, and advisory.</p>
                </div>
              </div>

              {error && (
                <div className="bg-[#ef4444]/10 border border-[#ef4444]/20 rounded-xl p-3 mb-4">
                  <p className="text-[#ef4444] text-sm">{error}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Bottom navigation */}
        <div className={`pt-6 flex gap-3 ${step > 1 ? 'justify-between' : 'justify-end'}`}>
          {step > 1 && (
            <button
              onClick={back}
              disabled={isSubmitting}
              className="flex items-center gap-1.5 text-[#808084] hover:text-[#F6F6F4] transition-colors text-sm font-medium px-4 py-3 rounded-xl border border-[#2a2b2e] hover:border-[#3a3b3e]"
            >
              <ChevronLeft size={16} />
              Back
            </button>
          )}

          <button
            onClick={next}
            disabled={!canProceed() || isSubmitting}
            className={`flex-1 flex items-center justify-center gap-2 font-semibold rounded-xl py-3.5 transition-all ${
              canProceed() && !isSubmitting
                ? 'bg-[#C9A24D] hover:bg-[#b8913c] text-[#0F0F10]'
                : 'bg-[#1C1D20] text-[#4a4b4e] cursor-not-allowed border border-[#2a2b2e]'
            }`}
          >
            {step < TOTAL_STEPS ? (
              <>Continue <ChevronRight size={16} /></>
            ) : isSubmitting ? (
              'Building your Command…'
            ) : (
              <>Build my Command <ChevronRight size={16} /></>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default OnboardingFlow;
