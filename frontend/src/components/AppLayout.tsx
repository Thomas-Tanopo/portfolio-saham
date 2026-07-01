import { useState, useEffect, useMemo } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu, Button, Space, Tooltip, Typography, Drawer, Grid } from 'antd';
import {
  DatabaseOutlined,
  SwapOutlined,
  BarChartOutlined,
  DashboardOutlined,
  UserOutlined,
  StockOutlined,
  ClusterOutlined,
  SafetyOutlined,
  CheckCircleOutlined,
  SunOutlined,
  MoonOutlined,
  LogoutOutlined,
  MenuOutlined,
  FundOutlined,
} from '@ant-design/icons';
import { useThemeStore } from '../stores/themeStore';
import { useAuthStore } from '../stores/authStore';
import '../App.css';

const { Sider, Content, Header } = Layout;
const { Text } = Typography;
const { useBreakpoint } = Grid;

const allMenuItems = [
  { key: '/', icon: <DashboardOutlined />, label: 'Dashboard', modul: null },
  {
    key: '/master-data',
    icon: <DatabaseOutlined />,
    label: 'Master Data',
    modul: null,
    children: [
      { key: '/master-data/user', icon: <UserOutlined />, label: 'User', modul: 'User' },
      { key: '/master-data/sektor', icon: <ClusterOutlined />, label: 'Sektor', modul: 'Sektor' },
      { key: '/master-data/saham', icon: <StockOutlined />, label: 'Saham', modul: 'Saham' },
      { key: '/master-data/role', icon: <SafetyOutlined />, label: 'Role', modul: 'Role' },
      { key: '/master-data/approval-matrix', icon: <CheckCircleOutlined />, label: 'Approval Matrix', modul: 'Approval' },
    ],
  },
  {
    key: '/analysis',
    icon: <FundOutlined />,
    label: 'Transaksi',
    modul: null,
    children: [
      { key: '/transaksi', icon: <SwapOutlined />, label: 'Portfolio Input', modul: 'Transaksi' },
      { key: '/approval', icon: <CheckCircleOutlined />, label: 'Approval', modul: 'Approval' },
    ],
  },
  { key: '/report', icon: <BarChartOutlined />, label: 'Report', modul: 'Report' },
];

function hasAccess(modul: string | null, user: any): boolean {
  if (modul === null) return true;
  return user?.permissions?.some((p: any) => p.modul === modul && p.view) ?? false;
}

function filterMenu(items: any[], user: any): any[] {
  const result: any[] = [];
  for (const item of items) {
    if (item.children) {
      const filtered = filterMenu(item.children, user);
      if (filtered.length > 0) result.push({ ...item, children: filtered });
    } else if (hasAccess(item.modul, user)) {
      result.push(item);
    }
  }
  return result;
}

export default function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { mode, toggle } = useThemeStore();
  const { user, logout } = useAuthStore();

  const menuItems = useMemo(() => filterMenu(allMenuItems, user), [user]);

  const [openKeys, setOpenKeys] = useState<string[]>([]);
  const [siderOpen, setSiderOpen] = useState(false);
  const screens = useBreakpoint();
  const isMobile = !screens.lg;

  useEffect(() => {
    const path = location.pathname;
    const subs = ['/master-data', '/analysis'];
    for (const sub of subs) {
      if (path.startsWith(sub)) {
        setOpenKeys((prev) => (prev.includes(sub) ? prev : [...prev, sub]));
      }
    }
  }, [location.pathname]);

  const selectedKey = location.pathname === '/' ? '/' : location.pathname;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const sidebarContent = (
    <>
      <div className="logo" style={{ cursor: 'pointer', padding: '16px', textAlign: 'center' }}>
        <span>📈</span>
        <span>Analysis Portfolio Tracker</span>
      </div>
      <Menu
        theme="dark"
        mode="inline"
        selectedKeys={[selectedKey]}
        openKeys={openKeys}
        onOpenChange={setOpenKeys}
        items={menuItems}
        onClick={({ key }) => {
          navigate(key);
          if (isMobile) setSiderOpen(false);
        }}
      />
    </>
  );

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {isMobile ? (
        <Drawer
          title={null}
          placement="left"
          open={siderOpen}
          onClose={() => setSiderOpen(false)}
          styles={{ body: { padding: 0 } }}
          width={260}
        >
          <div style={{ background: '#001529', height: '100%' }}>
            {sidebarContent}
          </div>
        </Drawer>
      ) : (
        <Sider
          trigger={null}
          style={{ position: 'sticky', top: 0, height: '100vh' }}
        >
          {sidebarContent}
        </Sider>
      )}
      <Layout>
        <Header
          style={{
            padding: '0 12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            height: 'auto',
            minHeight: 64,
            background: mode === 'dark' ? '#141414' : '#fff',
          }}
        >
          <Space>
            <Button type="text" icon={<MenuOutlined />} onClick={() => setSiderOpen(true)} className="menu-trigger" style={{ fontSize: 18 }} />
            <span style={{ fontSize: 18, fontWeight: 600 }}>
Analysis Portfolio Tracker
            </span>
          </Space>
          <Space wrap="wrap">
            <Text style={{ color: mode === 'dark' ? '#fff' : '#000', fontSize: isMobile ? 13 : 14 }}>
              {user?.nama} ({user?.role})
            </Text>
            <Tooltip title={mode === 'light' ? 'Dark Mode' : 'Light Mode'}>
              <Button
                type="text"
                icon={mode === 'light' ? <MoonOutlined /> : <SunOutlined />}
                onClick={toggle}
                style={{ fontSize: 18 }}
              />
            </Tooltip>
            <Tooltip title="Logout">
              <Button
                type="text"
                icon={<LogoutOutlined />}
                onClick={handleLogout}
                style={{ fontSize: 18 }}
              />
            </Tooltip>
          </Space>
        </Header>
        <Content style={{ margin: isMobile ? 12 : 16 }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
