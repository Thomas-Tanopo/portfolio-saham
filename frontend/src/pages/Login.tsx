import { useEffect, useState } from 'react';
import { Card, Form, Input, Button, Typography, message, Spin, AutoComplete } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';

const { Title } = Typography;

const HISTORY_KEY = 'login_username_history';

function loadHistory(): string[] {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); } catch { return []; }
}

function saveHistory(username: string) {
  const list = loadHistory().filter((u) => u !== username);
  list.unshift(username);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(list.slice(0, 5)));
}

export default function Login() {
  const navigate = useNavigate();
  const { token, loading, login } = useAuthStore();
  const [usernameHistory, setUsernameHistory] = useState<string[]>(loadHistory);

  useEffect(() => {
    if (token) navigate('/', { replace: true });
  }, [token, navigate]);

  const onFinish = async (values: { username: string; password: string }) => {
    try {
      await login(values.username, values.password);
      saveHistory(values.username);
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Login gagal. Periksa username dan password.';
      message.error(msg);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      background: '#f0f2f5',
    }}>
      <Card style={{ width: '100%', maxWidth: 400, margin: '0 16px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <Title level={3}>Analysis Portfolio</Title>
          <Typography.Text type="secondary">Silakan login</Typography.Text>
        </div>
        <Form layout="vertical" onFinish={onFinish}>
          <Form.Item name="username" label="Username" rules={[{ required: true, message: 'Masukkan username' }]}>
            <AutoComplete options={usernameHistory.map((u) => ({ value: u }))}>
              <Input prefix={<UserOutlined />} size="large" placeholder="Username" autoComplete="username" />
            </AutoComplete>
          </Form.Item>
          <Form.Item name="password" label="Password" rules={[{ required: true, message: 'Masukkan password' }]}>
            <Input.Password prefix={<LockOutlined />} size="large" placeholder="Password" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block size="large">
              Login
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
