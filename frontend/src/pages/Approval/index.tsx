import { useEffect, useState } from 'react';
import { Card, Table, Tag, Button, Modal, Form, Input, Space, message, Spin, Image } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined, InfoCircleOutlined, PaperClipOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import api from '../../services/api';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

interface ApprovalItem {
  id: number; transaksiId: number; releaseLevel: number; status: string; catatan?: string;
  createdAt: string;
  transaksi: {
    id: number; userId: number; sahamId: number; tipe: string; jumlah: number; harga: number;
    tanggal: string; buktiPendukung?: string; status: string; remarks?: string;
    saham: { kode: string; nama: string };
    user: { id: number; nama: string };
    createdBy: { id: number; nama: string };
  };
}

export default function Approval() {
  const [data, setData] = useState<ApprovalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [currentAction, setCurrentAction] = useState<'approved' | 'rejected' | 'request_info'>('approved');
  const [currentId, setCurrentId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();

  const fetch = () => {
    setLoading(true);
    api.get('/approval/pending').then((res) => {
      setData(res.data);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { fetch(); }, []);

  const openAction = (id: number, action: 'approved' | 'rejected' | 'request_info') => {
    setCurrentId(id);
    setCurrentAction(action);
    form.resetFields();
    setModalOpen(true);
  };

  const handleOk = async () => {
    if (!currentId) return;
    const values = await form.validateFields();
    setSubmitting(true);
    try {
      await api.post(`/approval/${currentId}/process`, { action: currentAction, catatan: values.catatan });
      const labels: Record<string, string> = { approved: 'Disetujui', rejected: 'Ditolak', request_info: 'Request info dikirim' };
      message.success(labels[currentAction]);
      setModalOpen(false); fetch();
    } catch { message.error('Gagal memproses'); } finally { setSubmitting(false); }
  };

  const columns: ColumnsType<ApprovalItem> = [
    { title: 'Tgl Transaksi', dataIndex: ['transaksi', 'tanggal'], key: 'tanggal', render: (v: string) => new Date(v).toLocaleDateString('id-ID') },
    { title: 'Saham', dataIndex: ['transaksi', 'saham', 'kode'], key: 'kode' },
    { title: 'Tipe', dataIndex: ['transaksi', 'tipe'], key: 'tipe', render: (t: string) => <Tag color={t === 'beli' ? 'blue' : 'orange'}>{t.toUpperCase()}</Tag> },
    { title: 'Jumlah', dataIndex: ['transaksi', 'jumlah'], key: 'jumlah', render: (v: number) => v?.toLocaleString('id-ID') },
    { title: 'Harga', dataIndex: ['transaksi', 'harga'], key: 'harga', render: (v: number) => `Rp ${v?.toLocaleString('id-ID')}` },
    { title: 'Total', key: 'total', render: (_: unknown, r: ApprovalItem) => {
      const total = (r.transaksi?.jumlah || 0) * (r.transaksi?.harga || 0);
      return `Rp ${total.toLocaleString('id-ID')}`;
    }},
    { title: 'Dibuat Oleh', dataIndex: ['transaksi', 'createdBy', 'nama'], key: 'creator' },
    { title: 'Bukti', dataIndex: ['transaksi', 'buktiPendukung'], key: 'bukti', render: (v: string) => v ? <Image width={60} src={`${API_URL.replace('/api', '')}/uploads/${v}`} /> : '-' },
    { title: 'Remarks', dataIndex: ['transaksi', 'remarks'], key: 'remarks', render: (r: string) => r || '-' },
    { title: 'Level', dataIndex: 'releaseLevel', key: 'level' },
    { title: 'Aksi', key: 'aksi', width: 220, render: (_: unknown, r: ApprovalItem) => (
      <Space>
        <Button type="primary" icon={<CheckCircleOutlined />} onClick={() => openAction(r.transaksi.id, 'approved')}>Setuju</Button>
        <Button danger icon={<CloseCircleOutlined />} onClick={() => openAction(r.transaksi.id, 'rejected')}>Tolak</Button>
        <Button icon={<InfoCircleOutlined />} onClick={() => openAction(r.transaksi.id, 'request_info')}>Request Info</Button>
      </Space>
    )},
  ];

  return (
    <Spin spinning={loading}>
      <Card title="Approval Pending">
        <Table columns={columns} dataSource={data} pagination={false} scroll={{ x: 'max-content' }} rowKey="id" />
      </Card>
      <Modal
        title={currentAction === 'approved' ? 'Setujui Transaksi' : currentAction === 'rejected' ? 'Tolak Transaksi' : 'Request Info'}
        open={modalOpen} onOk={handleOk} onCancel={() => setModalOpen(false)} confirmLoading={submitting}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="catatan" label="Catatan"><Input.TextArea rows={3} /></Form.Item>
        </Form>
      </Modal>
    </Spin>
  );
}
