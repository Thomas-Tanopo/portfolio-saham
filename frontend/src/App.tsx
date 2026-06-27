import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider, theme, Spin } from 'antd';
import { useThemeStore } from './stores/themeStore';
import { useAuthStore } from './stores/authStore';
import AppLayout from './components/AppLayout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import MasterData from './pages/MasterData';
import User from './pages/MasterData/User';
import Saham from './pages/MasterData/Saham';
import Sektor from './pages/MasterData/Sektor';
import Role from './pages/MasterData/Role';
import Transaksi from './pages/Transaksi';
import Report from './pages/Report';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { token, loading } = useAuthStore();
  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <Spin size="large" />
      </div>
    );
  }
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function App() {
  const mode = useThemeStore((s) => s.mode);
  const loadFromStorage = useAuthStore((s) => s.loadFromStorage);

  useEffect(() => {
    loadFromStorage();
  }, [loadFromStorage]);

  return (
    <ConfigProvider
      theme={{
        algorithm: mode === 'dark' ? theme.darkAlgorithm : theme.defaultAlgorithm,
        token: {
          colorPrimary: '#1677ff',
        },
      }}
    >
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }>
          <Route path="/" element={<Dashboard />} />
          <Route path="/master-data" element={<MasterData />} />
          <Route path="/master-data/user" element={<User />} />
          <Route path="/master-data/saham" element={<Saham />} />
          <Route path="/master-data/sektor" element={<Sektor />} />
          <Route path="/master-data/role" element={<Role />} />
          <Route path="/transaksi" element={<Transaksi />} />
          <Route path="/report" element={<Report />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ConfigProvider>
  );
}

export default App;
