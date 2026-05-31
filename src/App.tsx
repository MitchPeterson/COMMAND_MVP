import React, { useState } from 'react';
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

  if (!data?.household) {
    return <OnboardingFlow userId={userId} onComplete={() => { void refresh(); }} />;
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
      <Sidebar activeView={activeView} onNavigate={setActiveView} />
      <main className="flex-1 bg-cmd-charcoal/90 p-6">{renderView()}</main>
    </div>
  );
}

export default App;
