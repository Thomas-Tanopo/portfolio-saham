import { useEffect, useState } from 'react';
import { Drawer, Timeline, Tag, Spin, Empty, Typography, Space } from 'antd';
import {
  CheckCircleOutlined, CloseCircleOutlined, InfoCircleOutlined,
  ClockCircleOutlined, StopOutlined, PlusCircleOutlined,
} from '@ant-design/icons';
import api from '../services/api';

const { Text, Paragraph } = Typography;

interface ActivityUser {
  id: number;
  nama: string;
}

interface ActivityEvent {
  type: 'created' | 'pending' | 'approved' | 'rejected' | 'request_info' | 'cancelled';
  timestamp?: string;
  level?: number;
  user?: ActivityUser;
  users?: ActivityUser[];
  pendingUsers?: ActivityUser[];
  catatan?: string;
  description: string;
}

const iconMap: Record<string, React.ReactNode> = {
  created: <PlusCircleOutlined style={{ color: '#52c41a' }} />,
  pending: <ClockCircleOutlined style={{ color: '#faad14' }} />,
  approved: <CheckCircleOutlined style={{ color: '#52c41a' }} />,
  rejected: <CloseCircleOutlined style={{ color: '#ff4d4f' }} />,
  request_info: <InfoCircleOutlined style={{ color: '#1677ff' }} />,
  cancelled: <StopOutlined style={{ color: '#d9d9d9' }} />,
};

const colorMap: Record<string, string> = {
  created: 'green',
  pending: 'orange',
  approved: 'green',
  rejected: 'red',
  request_info: 'blue',
  cancelled: 'gray',
};

function formatDate(dateStr?: string) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('id-ID', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function ApprovalTimeline({
  transaksiId,
  open,
  onClose,
}: {
  transaksiId: number | null;
  open: boolean;
  onClose: () => void;
}) {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !transaksiId) return;
    setLoading(true);
    api.get(`/transaksi/${transaksiId}/activity`)
      .then((res) => setEvents(res.data))
      .catch(() => setEvents([]))
      .finally(() => setLoading(false));
  }, [transaksiId, open]);

  return (
    <Drawer
      title="Activity Log"
      open={open}
      onClose={onClose}
      width={480}
    >
      <Spin spinning={loading}>
        {events.length === 0 && !loading ? (
          <Empty description="Tidak ada aktivitas" />
        ) : (
          <Timeline
            items={events.map((ev, i) => ({
              dot: iconMap[ev.type],
              color: colorMap[ev.type] || 'gray',
              children: (
                <div key={i}>
                  <Space align="center" style={{ marginBottom: 4 }}>
                    <Tag color={colorMap[ev.type]} style={{ margin: 0 }}>
                      {ev.type === 'created' ? 'DIBUAT' :
                       ev.type === 'pending' ? 'PENDING' :
                       ev.type === 'approved' ? 'DISETUJUI' :
                       ev.type === 'rejected' ? 'DITOLAK' :
                       ev.type === 'request_info' ? 'REQ INFO' :
                       ev.type === 'cancelled' ? 'BATAL' : ev.type.toUpperCase()}
                    </Tag>
                    {ev.timestamp && (
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {formatDate(ev.timestamp)}
                      </Text>
                    )}
                  </Space>

                  <div style={{ margin: '2px 0' }}>
                    <Text strong>{ev.description}</Text>
                  </div>

                  {ev.user && (
                    <Text type="secondary" style={{ fontSize: 13 }}>
                      Oleh: {ev.user.nama}
                    </Text>
                  )}

                  {ev.users && ev.users.length > 0 && (
                    <div style={{ marginTop: 2 }}>
                      <Text type="secondary" style={{ fontSize: 13 }}>
                        Approver: {ev.users.map((u) => u.nama).join(', ')}
                      </Text>
                    </div>
                  )}

                  {ev.pendingUsers && ev.pendingUsers.length > 0 && (
                    <div style={{ marginTop: 2 }}>
                      <Text type="warning" style={{ fontSize: 13 }}>
                        ⏳ Menunggu: {ev.pendingUsers.map((u) => u.nama).join(', ')}
                      </Text>
                    </div>
                  )}

                  {ev.catatan && (
                    <Paragraph
                      type="secondary"
                      italic
                      style={{
                        margin: '4px 0 0',
                        fontSize: 13,
                        padding: '4px 8px',
                        background: '#f5f5f5',
                        borderRadius: 4,
                      }}
                    >
                      "{ev.catatan}"
                    </Paragraph>
                  )}
                </div>
              ),
            }))}
          />
        )}
      </Spin>
    </Drawer>
  );
}
