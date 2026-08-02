import React, { useCallback, useEffect, useState } from 'react';
import { useHousehold } from './useHousehold';
import { AuthScreen } from './AuthScreen';
import { OnboardingFlow } from './OnboardingFlow';
import { Sidebar } from './views/components/Sidebar';
import { DashboardView } from './views/Dashboard';
import { InsuranceView } from './views/Insurance';
import { LegalView } from './views/Legal';
import { HomeView } from './views/Home';
import { FinancesView } from './views/Finances';
import { TaxesView } from './views/Taxes';
import { FamilyView } from './views/Family';
import { CreditView } from './views/Credit';
import { DocumentsView } from './views/Documents';
import { ProfileView } from './views/Profile';

function App() {
  const { data, loading, userId, refresh } = useHousehold();
  const [activeView, setActiveView] = useState<string>('dashboard');
  const [showReturningPrompt, setShowReturningPrompt] = useState(false);
  const [hasPrompted, setHasPrompted] = useState(false);

  const handleOnboardingComplete = useCallback(async () => {
    await refresh();
    setActiveView('dashboard');
  }, [refresh]);

  useEffect(() => {
    if (!loading && userId && data && !data.household && !hasPrompted) {
      setShowReturningPrompt(true);
      setHasPrompted(true);
    }
  }, [loading, userId, data, hasPrompted]);

  if (loading) {
    return (
      <div className="min-h-screen bg-cmd-black flex items-center justify-center">
        <div className="text-cmd-gold text-xs tracking-[0.3em] font-medium">
          HOUSEHOLD OPERATING SYSTEM
        </div>
      </div>
    );
  }

  if (!userId) {
    return <AuthScreen />;
  }

  if (showReturningPrompt) {
    return (
      <div className="min-h-screen bg-cmd-black flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-2xl rounded-3xl border border-gray-800 bg-cmd-charcoal p-10 shadow-xl shadow-black/30">
          <div className="text-cmd-gold text-xs uppercase tracking-[0.3em] font-medium mb-4">
            Returning user
          </div>
          <h1 className="text-3xl font-semibold text-cmd-offwhite mb-4">Welcome back.</h1>
          <p className="text-cmd-muted mb-8">
            We detected an existing login, but no household profile has been created yet.
            Would you like to continue to onboarding or create a new household now?
          </p>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-end">
            <button
              type="button"
              onClick={() => setShowReturningPrompt(false)}
              className="rounded-2xl border border-gray-700 bg-transparent px-5 py-3 text-sm font-semibold text-cmd-offwhite transition hover:border-cmd-gold hover:text-cmd-gold"
            >
              Continue to onboarding
            </button>
            <button
              type="button"
              onClick={() => {
                setShowReturningPrompt(false);
                setActiveView('dashboard');
              }}
              className="rounded-2xl border border-cmd-gold bg-cmd-gold/10 px-5 py-3 text-sm font-semibold text-cmd-gold transition hover:bg-cmd-gold/20"
            >
              Create new household
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!data?.household) {
    return <OnboardingFlow userId={userId} onComplete={handleOnboardingComplete} />;
  }

  const renderView = () => {
    switch (activeView) {
      case 'dashboard':
        return <DashboardView />;
      case 'insurance':
        return <InsuranceView />;
      case 'legal':
        return <LegalView />;
      case 'home':
        return <HomeView />;
      case 'finances':
        return <FinancesView />;
      case 'taxes':
        return <TaxesView />;
      case 'family':
        return <FamilyView />;
      case 'credit':
        return <CreditView />;
      case 'documents':
        return <DocumentsView />;
      case 'profile':
        return <ProfileView />;
      default:
        return <DashboardView />;
    }
  };

  return (
    <div className="min-h-screen flex bg-cmd-black text-cmd-offwhite">
      <Sidebar
        activeView={activeView}
        onNavigate={setActiveView}
        userName={data?.profile?.primary_name ?? data?.profile?.primary_first_name ?? data?.household?.name ?? 'Your account'}
        userLocation={data?.profile ? `${data.profile.city}, ${data.profile.state}` : 'Household'}
      />
      <main className="flex-1 bg-cmd-charcoal/90 p-6">{renderView()}</main>
    </div>
  );
}

export default App;
