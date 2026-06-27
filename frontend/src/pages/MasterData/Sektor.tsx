import { useEffect, useState } from 'react';
import { Card, Table, Button, Spin, Modal, Form, Input, Space, message, Popconfirm, Tooltip, Tag } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, InfoCircleOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import api from '../../services/api';

interface AuditUser { id: number; nama: string }
interface SektorItem {
  key: number; id: number; kode: string; nama: string; deskripsi: string;
  createdBy?: AuditUser; updatedBy?: AuditUser; deletedAt?: string;
}

export default function Sektor() {
  const [data, setData] = useState<SektorItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<SektorItem | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();

  const fetch = () => {
    setLoading(true);
    api.get('/sektor').then((res) => {
      setData(res.data.map((s: any) => ({ key: s.id, id: s.id, ...s })));
    }).finally(() => setLoading(false));
  };

  useEffect(() => { fetch(); }, []);

  const openCreate = () => { setEditing(null); form.resetFields(); setModalOpen(true); };
  const openEdit = (record: SektorItem) => { setEditing(record); form.setFieldsValue(record); setModalOpen(true); };

  const handleOk = async () => {
    const values = await form.validateFields();
    setSubmitting(true);
    try {
      if (editing) { await api.put(`/sektor/${editing.id}`, values); message.success('Sektor diupdate'); }
      else { await api.post('/sektor', values); message.success('Sektor dibuat'); }
      setModalOpen(false); fetch();
    } catch { message.error('Gagal menyimpan sektor'); } finally { setSubmitting(false); }
  };

  const handleDelete = async (id: number) => {
    try { await api.delete(`/sektor/${id}`); message.success('Sektor dihapus'); fetch(); }
    catch { message.error('Gagal menghapus sektor'); }
  };

  const columns: ColumnsType<SektorItem> = [
    { title: 'Kode', dataIndex: 'kode', key: 'kode' },
    { title: 'Nama Sektor', dataIndex: 'nama', key: 'nama' },
    { title: 'Deskripsi', dataIndex: 'deskripsi', key: 'deskripsi' },
    {
      title: 'Dibuat', key: 'created', width: 120,
      render: (_: unknown, r: SektorItem) => r.createdBy ? <Tooltip title={`ID: ${r.createdBy.id}`}><Tag>{r.createdBy.nama}</Tag></Tooltip> : '-',
    },
    {
      title: 'Diubah', key: 'updated', width: 120,
      render: (_: unknown, r: SektorItem) => r.updatedBy ? <Tag color="blue">{r.updatedBy.nama}</Tag> : '-',
    },
    {
      title: 'Aksi', key: 'aksi',
      render: (_: unknown, r: SektorItem) => (
        <Space>
          {!r.deletedAt && <><Button type="link" icon={<EditOutlined />} onClick={() => openEdit(r)} />
          <Popconfirm title="Hapus sektor?" onConfirm={() => handleDelete(r.id)}>
            <Button type="link" danger icon={<DeleteOutlined />} />
          </Popconfirm></>}
          {r.deletedAt && <Tag color="red">Deleted</Tag>}
        </Space>
      ),
    },
  ];

  return (
    <>
      <Card title="Master Data Sektor" extra={<Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>Tambah Sektor</Button>}>
        <Spin spinning={loading}><Table columns={columns} dataSource={data} pagination={false} scroll={{ x: 'max-content' }} /></Spin>
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
