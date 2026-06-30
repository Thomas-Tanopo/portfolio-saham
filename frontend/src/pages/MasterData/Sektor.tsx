import { useEffect, useState } from 'react';
import { Card, Table, Button, Spin, Modal, Form, Input, Space, message, Popconfirm, Tooltip, Tag, Checkbox } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import api from '../../services/api';
import { usePermission } from '../../hooks/usePermission';

interface AuditUser { id: number; nama: string }
interface SektorItem {
  key: number; id: number; kode: string; nama: string; deskripsi: string;
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

export default function Sektor() {
  const [data, setData] = useState<SektorItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDeleted, setShowDeleted] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<SektorItem | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();
  const perm = usePermission('Sektor');

  const fetch = (showDel?: boolean) => {
    setLoading(true);
    const params = showDel ? { showDeleted: 'true' } : {};
    api.get('/sektor', { params }).then((res) => {
      setData(res.data.map((s: any) => ({ key: s.id, id: s.id, ...s })));
    }).finally(() => setLoading(false));
  };

  useEffect(() => { fetch(); }, []);

  const toggleShowDeleted = (checked: boolean) => {
    setShowDeleted(checked);
    fetch(checked);
  };

  const openCreate = () => { setEditing(null); form.resetFields(); setModalOpen(true); };
  const openEdit = (record: SektorItem) => { setEditing(record); form.setFieldsValue(record); setModalOpen(true); };

  const handleOk = async () => {
    const values = await form.validateFields();
    setSubmitting(true);
    try {
      if (editing) { await api.put(`/sektor/${editing.id}`, values); message.success('Sektor diupdate'); }
      else { await api.post('/sektor', values); message.success('Sektor dibuat'); }
      setModalOpen(false); fetch(showDeleted);
    } catch { message.error('Gagal menyimpan sektor'); } finally { setSubmitting(false); }
  };

  const handleDelete = async (id: number) => {
    try { await api.delete(`/sektor/${id}`); message.success('Sektor dihapus'); fetch(showDeleted); }
    catch { message.error('Gagal menghapus sektor'); }
  };

  const columns: ColumnsType<SektorItem> = [
    { title: 'Kode', dataIndex: 'kode', key: 'kode' },
    { title: 'Nama Sektor', dataIndex: 'nama', key: 'nama' },
    { title: 'Deskripsi', dataIndex: 'deskripsi', key: 'deskripsi' },
    {
      title: 'Dibuat Oleh', key: 'createdBy', width: 120,
      render: (_: unknown, r: SektorItem) => r.createdBy ? <Tooltip title={`ID: ${r.createdBy.id}`}><Tag>{r.createdBy.nama}</Tag></Tooltip> : '-',
    },
    {
      title: 'Tgl Dibuat', key: 'createdAt', width: 150,
      render: (_: unknown, r: SektorItem) => fDate(r.createdAt),
    },
    {
      title: 'Diubah Oleh', key: 'updatedBy', width: 120,
      render: (_: unknown, r: SektorItem) => r.updatedBy ? <Tag color="blue">{r.updatedBy.nama}</Tag> : '-',
    },
    {
      title: 'Tgl Diubah', key: 'updatedAt', width: 150,
      render: (_: unknown, r: SektorItem) => fDate(r.updatedAt),
    },
    {
      title: 'Dihapus Oleh', key: 'deletedBy', width: 120,
      render: (_: unknown, r: SektorItem) => r.deletedBy ? <Tag color="red">{r.deletedBy.nama}</Tag> : '-',
    },
    {
      title: 'Tgl Dihapus', key: 'deletedAt', width: 150,
      render: (_: unknown, r: SektorItem) => fDate(r.deletedAt),
    },
    {
      title: 'Aksi', key: 'aksi',
      render: (_: unknown, r: SektorItem) => (
        <Space>
          {!r.deletedAt && <>{perm.edit && <Button type="link" icon={<EditOutlined />} onClick={() => openEdit(r)} />}
          {perm.delete && <Popconfirm title="Hapus sektor?" onConfirm={() => handleDelete(r.id)}>
            <Button type="link" danger icon={<DeleteOutlined />} />
          </Popconfirm>}</>}
          {r.deletedAt && <Tag color="red">Deleted</Tag>}
        </Space>
      ),
    },
  ];

  return (
    <>
      <Card title="Master Data Sektor" extra={perm.create && <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>Tambah Sektor</Button>}>
        <Space style={{ marginBottom: 16 }}>
          <Checkbox checked={showDeleted} onChange={(e) => toggleShowDeleted(e.target.checked)}>
            Tampilkan data yang sudah dihapus
          </Checkbox>
        </Space>
        <Spin spinning={loading}>
          <Table
            columns={columns}
            dataSource={data}
            pagination={false}
            scroll={{ x: 'max-content' }}
            rowClassName={(r) => r.deletedAt ? 'deleted-row' : ''}
          />
        </Spin>
      </Card>
      <Modal title={editing ? 'Edit Sektor' : 'Tambah Sektor'} open={modalOpen} onOk={handleOk} onCancel={() => setModalOpen(false)} confirmLoading={submitting}>
        <Form form={form} layout="vertical">
          <Form.Item name="kode" label="Kode" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="nama" label="Nama Sektor" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="deskripsi" label="Deskripsi"><Input.TextArea rows={3} /></Form.Item>
        </Form>
      </Modal>
    </>
  );
}
