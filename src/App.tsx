import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { RetiredTypeMigrationPrompt } from './components/settings/RetiredTypeMigrationPrompt';
import { Layout } from './components/layout/Layout';
import { DashboardPage } from './pages/DashboardPage';
import { SleepPage } from './pages/SleepPage';
import { SocialPage } from './pages/SocialPage';
import { InsightsPage } from './pages/InsightsPage';
import { SettingsPage } from './pages/SettingsPage';

export default function App() {
  return (
    <AppProvider>
      <RetiredTypeMigrationPrompt />
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/sleep" element={<SleepPage />} />
            <Route path="/social" element={<SocialPage />} />
            <Route path="/insights" element={<InsightsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AppProvider>
  );
}
