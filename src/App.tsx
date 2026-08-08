import React, { useCallback, useState } from 'react';
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
import { signOut } from './lib/supabase';
import { WhatsNew } from './components/WhatsNew';

function App() {
  const { data, loading, userId, refresh } = useHousehold();
  const [activeView, setActiveView] = useState<string>('dashboard');
  // Set only when the user explicitly chooses to start onboarding. Everything
  // else about which screen shows is derived from data, never from an effect.
  const [proceedToOnboarding, setProceedToOnboarding] = useState(false);

  const handleOnboardingComplete = useCallback(async () => {
    await refresh();
    setActiveView('dashboard');
  }, [refresh]);

  // Without this, a session that has no household row is a dead end: the only
  // signOut in the app lives in Profile, which is behind the dashboard, which
  // requires a household. Signing out clears userId and returns to AuthScreen.
  const handleSignOut = useCallback(async () => {
    await signOut();
    // Hard reload rather than relying on the SIGNED_OUT event and a refresh().
    // Those only reset the app if the auth listener actually fires; a full
    // re-init cannot leave stale userId/data behind, so the user always lands
    // on AuthScreen.
    window.location.replace('/');
  }, []);

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

  // A session with no household row. Derived straight from data, so there is no
  // render where onboarding wins a race against this and strands the user.
  // `!data?.household` deliberately also covers data === null, which the 8s
  // safety timeout in useHousehold can produce while a load is still in flight.
  if (!data?.household && !proceedToOnboarding) {
    return (
      <div className="min-h-screen bg-cmd-black flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-2xl rounded-3xl border border-gray-800 bg-cmd-charcoal p-10 shadow-xl shadow-black/30">
          <div className="text-cmd-gold text-xs uppercase tracking-[0.3em] font-medium mb-4">
            Returning user
          </div>
          <h1 className="text-3xl font-semibold text-cmd-offwhite mb-4">Welcome back.</h1>
          <p className="text-cmd-muted mb-8">
            You're signed in, but this account has no household set up yet. Continue to
            onboarding to create one, or sign out to use a different account.
          </p>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-end">
            <button
              type="button"
              onClick={handleSignOut}
              className="rounded-2xl border border-gray-700 bg-transparent px-5 py-3 text-sm font-semibold text-cmd-offwhite transition hover:border-cmd-gold hover:text-cmd-gold"
            >
              Sign in as a different user
            </button>
            <button
              type="button"
              onClick={() => setProceedToOnboarding(true)}
              className="rounded-2xl border border-cmd-gold bg-cmd-gold/10 px-5 py-3 text-sm font-semibold text-cmd-gold transition hover:bg-cmd-gold/20"
            >
              Continue to onboarding
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!data?.household) {
    return (
      <OnboardingFlow
        userId={userId}
        onComplete={handleOnboardingComplete}
        onSignOut={handleSignOut}
      />
    );
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
      {/* Shown only when there are unseen releases, and only once signed in with
          a household — a changelog is meaningless before there is an app to use. */}
      <WhatsNew />
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
