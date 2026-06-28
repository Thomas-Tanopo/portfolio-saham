import { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu, Button, Space, Tooltip, Typography } from 'antd';
import {
  DatabaseOutlined,
  SwapOutlined,
  BarChartOutlined,
  DashboardOutlined,
  UserOutlined,
  StockOutlined,
  ClusterOutlined,
  SafetyOutlined,
  SunOutlined,
  MoonOutlined,
  LogoutOutlined,
  MenuOutlined,
} from '@ant-design/icons';
import { useThemeStore } from '../stores/themeStore';
import { useAuthStore } from '../stores/authStore';
import '../App.css';

const { Sider, Content, Header } = Layout;
const { Text } = Typography;

const menuItems = [
  { key: '/', icon: <DashboardOutlined />, label: 'Dashboard' },
  {
    key: '/master-data',
    icon: <DatabaseOutlined />,
    label: 'Master Data',
    children: [
      { key: '/master-data/user', icon: <UserOutlined />, label: 'User' },
      { key: '/master-data/sektor', icon: <ClusterOutlined />, label: 'Sektor' },
      { key: '/master-data/saham', icon: <StockOutlined />, label: 'Saham' },
      { key: '/master-data/role', icon: <SafetyOutlined />, label: 'Role' },
    ],
  },
  { key: '/transaksi', icon: <SwapOutlined />, label: 'Transaksi' },
  { key: '/report', icon: <BarChartOutlined />, label: 'Report' },
];

export default function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { mode, toggle } = useThemeStore();
  const { user, logout } = useAuthStore();

  const [openKeys, setOpenKeys] = useState<string[]>([]);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const path = location.pathname;
    if (path.startsWith('/master-data')) {
      setOpenKeys((prev) => (prev.includes('/master-data') ? prev : [...prev, '/master-data']));
    }
  }, [location.pathname]);

  const selectedKey = location.pathname === '/' ? '/' : location.pathname;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        breakpoint="lg"
        collapsedWidth={0}
        collapsed={collapsed}
        onCollapse={setCollapsed}
        trigger={null}
        style={{ position: 'sticky', top: 0, height: '100vh' }}
      >
        <div className="logo" style={{ cursor: 'pointer' }} onClick={() => setCollapsed(!collapsed)}>
          <span>📈</span>
          <span>Portfolio Tracker</span>
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[selectedKey]}
          openKeys={openKeys}
          onOpenChange={setOpenKeys}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
        />
      </Sider>
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
            <Button type="text" icon={<MenuOutlined />} onClick={() => setCollapsed(!collapsed)} className="menu-trigger" style={{ fontSize: 18 }} />
            <span style={{ fontSize: 18, fontWeight: 600 }}>
              Portfolio Tracker
            </span>
          </Space>
          <Space>
            <Text style={{ color: mode === 'dark' ? '#fff' : '#000' }}>
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
        <Content style={{ margin: 16 }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
