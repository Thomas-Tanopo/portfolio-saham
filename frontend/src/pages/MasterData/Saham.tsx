import { useEffect, useState } from 'react';
import { Card, Table, Button, Tag, Spin, Modal, Form, Input, Select, Space, message, Popconfirm, Tooltip, Checkbox } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import api from '../../services/api';
import { usePermission } from '../../hooks/usePermission';

interface AuditUser { id: number; nama: string }
interface SahamItem {
  key: number; id: number; kode: string; nama: string; sektorId: number; sektor?: { kode: string; nama: string };
  createdAt?: string; updatedAt?: string;
  createdBy?: AuditUser; updatedBy?: AuditUser;
  deletedBy?: AuditUser; deletedAt?: string;
}

const fDate = (d?: string) => {
  if (!d) return '-';
  const dt = new Date(d);
  const dd = String(dt.getDate()).padStart(2, '0');
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  const yy = String(dt.getFullYear()).slice(-2);
  const hh = String(dt.getHours()).padStart(2, '0');
  const min = String(dt.getMinutes()).padStart(2, '0');
  return `${dd}/${mm}/${yy} ${hh}:${min}`;
};

export default function Saham() {
  const [data, setData] = useState<SahamItem[]>([]);
  const [sektors, setSektors] = useState<{ id: number; kode: string; nama: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDeleted, setShowDeleted] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<SahamItem | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();
  const perm = usePermission('Saham');

  const fetch = (showDel?: boolean) => {
    setLoading(true);
    const params = {} as any;
    if (showDel) params.showDeleted = 'true';
    Promise.all([api.get('/saham', { params }), api.get('/sektor')]).then(([resS, resSk]) => {
      setSektors(resSk.data.map((sk: any) => ({ id: sk.id, kode: sk.kode, nama: sk.nama })));
      setData(resS.data.map((s: any) => ({ key: s.id, id: s.id, ...s })));
    }).finally(() => setLoading(false));
  };

  useEffect(() => { fetch(); }, []);

  const toggleShowDeleted = (checked: boolean) => {
    setShowDeleted(checked);
    fetch(checked);
  };

  const openCreate = () => { setEditing(null); form.resetFields(); setModalOpen(true); };
  const openEdit = (record: SahamItem) => { setEditing(record); form.setFieldsValue({ kode: record.kode, nama: record.nama, sektorId: record.sektorId }); setModalOpen(true); };

  const handleOk = async () => {
    const values = await form.validateFields();
    setSubmitting(true);
    try {
      if (editing) { await api.put(`/saham/${editing.id}`, values); message.success('Saham diupdate'); }
      else { await api.post('/saham', values); message.success('Saham dibuat'); }
      setModalOpen(false); fetch(showDeleted);
    } catch { message.error('Gagal menyimpan saham'); } finally { setSubmitting(false); }
  };

  const handleDelete = async (id: number) => {
    try { await api.delete(`/saham/${id}`); message.success('Saham dihapus'); fetch(showDeleted); }
    catch { message.error('Gagal menghapus saham'); }
  };

  const columns: ColumnsType<SahamItem> = [
    { title: 'Kode', dataIndex: 'kode', key: 'kode' },
    { title: 'Nama Saham', dataIndex: 'nama', key: 'nama' },
    { title: 'Sektor', key: 'sektor', render: (_: unknown, r: SahamItem) => r.sektor?.kode || '-' },
    {
      title: 'Dibuat Oleh', key: 'createdBy', width: 120,
      render: (_: unknown, r: SahamItem) => r.createdBy ? <Tooltip title={`ID: ${r.createdBy.id}`}><Tag>{r.createdBy.nama}</Tag></Tooltip> : '-',
    },
    {
      title: 'Tgl Dibuat', key: 'createdAt', width: 150,
      render: (_: unknown, r: SahamItem) => fDate(r.createdAt),
    },
    {
      title: 'Diubah Oleh', key: 'updatedBy', width: 120,
      render: (_: unknown, r: SahamItem) => r.updatedBy ? <Tag color="blue">{r.updatedBy.nama}</Tag> : '-',
    },
    {
      title: 'Tgl Diubah', key: 'updatedAt', width: 150,
      render: (_: unknown, r: SahamItem) => fDate(r.updatedAt),
    },
    {
      title: 'Dihapus Oleh', key: 'deletedBy', width: 120,
      render: (_: unknown, r: SahamItem) => r.deletedBy ? <Tag color="red">{r.deletedBy.nama}</Tag> : '-',
    },
    {
      title: 'Tgl Dihapus', key: 'deletedAt', width: 150,
      render: (_: unknown, r: SahamItem) => fDate(r.deletedAt),
    },
    {
      title: 'Aksi', key: 'aksi',
      render: (_: unknown, r: SahamItem) => (
        <Space>
          {!r.deletedAt && <>{perm.edit && <Button type="link" icon={<EditOutlined />} onClick={() => openEdit(r)} />}
          {perm.delete && <Popconfirm title="Hapus saham?" onConfirm={() => handleDelete(r.id)}>
            <Button type="link" danger icon={<DeleteOutlined />} />
          </Popconfirm>}</>}
          {r.deletedAt && <Tag color="red">Deleted</Tag>}
        </Space>
      ),
    },
  ];

  return (
    <>
      <Card title="Master Data Saham" extra={perm.create && <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>Tambah Saham</Button>}>
        <Space style={{ marginBottom: 16 }}>
          <Checkbox checked={showDeleted} onChange={(e) => toggleShowDeleted(e.target.checked)}>
            Tampilkan data yang sudah dihapus
          </Checkbox>
        </Space>
        <Spin spinning={loading}>
          <Table columns={columns} dataSource={data} pagination={false} scroll={{ x: 'max-content' }} rowClassName={(r) => r.deletedAt ? 'deleted-row' : ''} />
        </Spin>
      </Card>
      <Modal title={editing ? 'Edit Saham' : 'Tambah Saham'} open={modalOpen} onOk={handleOk} onCancel={() => setModalOpen(false)} confirmLoading={submitting}>
        <Form form={form} layout="vertical">
          <Form.Item name="kode" label="Kode" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="nama" label="Nama Saham" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="sektorId" label="Sektor" rules={[{ required: true }]}>
            <Select options={sektors.map((sk) => ({ value: sk.id, label: `${sk.kode} - ${sk.nama}` }))} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
