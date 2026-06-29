import { useEffect, useState } from 'react';
import { Card, Table, Button, Tag, Spin, Modal, Form, Input, Select, Space, message, Popconfirm, Tooltip } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import api from '../../services/api';
import { usePermission } from '../../hooks/usePermission';

interface AuditUser { id: number; nama: string }
interface SahamItem {
  key: number; id: number; kode: string; nama: string; sektorId: number; sektor?: { kode: string; nama: string };
  createdBy?: AuditUser; updatedBy?: AuditUser; deletedAt?: string;
}

export default function Saham() {
  const [data, setData] = useState<SahamItem[]>([]);
  const [sektors, setSektors] = useState<{ id: number; kode: string; nama: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<SahamItem | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();
  const perm = usePermission('Saham');

  const fetch = () => {
    setLoading(true);
    Promise.all([api.get('/saham'), api.get('/sektor')]).then(([resS, resSk]) => {
      setSektors(resSk.data.map((sk: any) => ({ id: sk.id, kode: sk.kode, nama: sk.nama })));
      setData(resS.data.map((s: any) => ({ key: s.id, id: s.id, ...s })));
    }).finally(() => setLoading(false));
  };

  useEffect(() => { fetch(); }, []);

  const openCreate = () => { setEditing(null); form.resetFields(); setModalOpen(true); };
  const openEdit = (record: SahamItem) => { setEditing(record); form.setFieldsValue({ kode: record.kode, nama: record.nama, sektorId: record.sektorId }); setModalOpen(true); };

  const handleOk = async () => {
    const values = await form.validateFields();
    setSubmitting(true);
    try {
      if (editing) { await api.put(`/saham/${editing.id}`, values); message.success('Saham diupdate'); }
      else { await api.post('/saham', values); message.success('Saham dibuat'); }
      setModalOpen(false); fetch();
    } catch { message.error('Gagal menyimpan saham'); } finally { setSubmitting(false); }
  };

  const handleDelete = async (id: number) => {
    try { await api.delete(`/saham/${id}`); message.success('Saham dihapus'); fetch(); }
    catch { message.error('Gagal menghapus saham'); }
  };

  const columns: ColumnsType<SahamItem> = [
    { title: 'Kode', dataIndex: 'kode', key: 'kode' },
    { title: 'Nama Saham', dataIndex: 'nama', key: 'nama' },
    { title: 'Sektor', key: 'sektor', render: (_: unknown, r: SahamItem) => r.sektor?.kode || '-' },
    {
      title: 'Dibuat', key: 'created', width: 120,
      render: (_: unknown, r: SahamItem) => r.createdBy ? <Tooltip title={`ID: ${r.createdBy.id}`}><Tag>{r.createdBy.nama}</Tag></Tooltip> : '-',
    },
    {
      title: 'Diubah', key: 'updated', width: 120,
      render: (_: unknown, r: SahamItem) => r.updatedBy ? <Tag color="blue">{r.updatedBy.nama}</Tag> : '-',
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
        <Spin spinning={loading}><Table columns={columns} dataSource={data} pagination={false} scroll={{ x: 'max-content' }} /></Spin>
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
