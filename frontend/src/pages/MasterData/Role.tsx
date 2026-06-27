import { useEffect, useState } from 'react';
import { Card, Table, Button, Tag, Spin, Modal, Form, Input, Checkbox, Space, message, Popconfirm, Row, Col, Typography, Tooltip } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import api from '../../services/api';

const { Text } = Typography;

interface AuditUser { id: number; nama: string }
interface Permission { modul: string; view: boolean; create: boolean; edit: boolean; delete: boolean }
interface RoleItem {
  key: number; id: number; nama: string; deskripsi?: string; permissions: Permission[];
  createdBy?: AuditUser; updatedBy?: AuditUser; deletedAt?: string;
}

const MODULS = ['User', 'Sektor', 'Saham', 'Transaksi', 'Report'] as const;

export default function Role() {
  const [data, setData] = useState<RoleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<RoleItem | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();

  const fetch = () => {
    setLoading(true);
    api.get('/role').then((res) => {
      setData(res.data.map((r: any) => ({ key: r.id, id: r.id, ...r })));
    }).finally(() => setLoading(false));
  };

  useEffect(() => { fetch(); }, []);

  const openCreate = () => { setEditing(null); form.resetFields(); setModalOpen(true); };

  const openEdit = (record: RoleItem) => {
    setEditing(record);
    const values: Record<string, any> = { nama: record.nama, deskripsi: record.deskripsi };
    for (const modul of MODULS) {
      const p = record.permissions.find((x) => x.modul === modul);
      values[`perm_${modul}`] = { view: p?.view ?? true, create: p?.create ?? false, edit: p?.edit ?? false, delete: p?.delete ?? false };
    }
    form.setFieldsValue(values);
    setModalOpen(true);
  };

  const handleOk = async () => {
    const values = await form.validateFields();
    setSubmitting(true);
    try {
      const permissions = MODULS.map((modul) => ({ modul, ...values[`perm_${modul}`] }));
      const payload = { nama: values.nama, deskripsi: values.deskripsi, permissions };
      if (editing) { await api.put(`/role/${editing.id}`, payload); message.success('Role diupdate'); }
      else { await api.post('/role', payload); message.success('Role dibuat'); }
      setModalOpen(false); fetch();
    } catch { message.error('Gagal menyimpan role'); } finally { setSubmitting(false); }
  };

  const handleDelete = async (id: number) => {
    try { await api.delete(`/role/${id}`); message.success('Role dihapus'); fetch(); }
    catch (err: any) { message.error(err.response?.data?.message || 'Gagal menghapus role'); }
  };

  const columns: ColumnsType<RoleItem> = [
    { title: 'Nama Role', dataIndex: 'nama', key: 'nama' },
    { title: 'Deskripsi', dataIndex: 'deskripsi', key: 'deskripsi' },
    {
      title: 'Permission', key: 'permissions',
      render: (_: unknown, r: RoleItem) => (
        <Space size={[4, 4]} wrap>
          {r.permissions.map((p) => <Tag key={p.modul} color={p.view ? 'blue' : 'default'}>{p.modul}{p.create && ' +C'}{p.edit && ' +E'}{p.delete && ' +D'}</Tag>)}
        </Space>
      ),
    },
    {
      title: 'Dibuat', key: 'created', width: 120,
      render: (_: unknown, r: RoleItem) => r.createdBy ? <Tooltip title={`ID: ${r.createdBy.id}`}><Tag>{r.createdBy.nama}</Tag></Tooltip> : '-',
    },
    {
      title: 'Diubah', key: 'updated', width: 120,
      render: (_: unknown, r: RoleItem) => r.updatedBy ? <Tag color="blue">{r.updatedBy.nama}</Tag> : '-',
    },
    {
      title: 'Aksi', key: 'aksi',
      render: (_: unknown, r: RoleItem) => (
        <Space>
          {!r.deletedAt && <><Button type="link" icon={<EditOutlined />} onClick={() => openEdit(r)} />
          <Popconfirm title="Hapus role?" onConfirm={() => handleDelete(r.id)}>
            <Button type="link" danger icon={<DeleteOutlined />} />
          </Popconfirm></>}
          {r.deletedAt && <Tag color="red">Deleted</Tag>}
        </Space>
      ),
    },
  ];

  return (
    <>
      <Card title="Master Data Role" extra={<Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>Tambah Role</Button>}>
        <Spin spinning={loading}><Table columns={columns} dataSource={data} pagination={false} scroll={{ x: 'max-content' }} /></Spin>
      </Card>
      <Modal title={editing ? 'Edit Role' : 'Tambah Role'} open={modalOpen} onOk={handleOk} onCancel={() => setModalOpen(false)} confirmLoading={submitting} width={640}>
        <Form form={form} layout="vertical">
          <Form.Item name="nama" label="Nama Role" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="deskripsi" label="Deskripsi"><Input.TextArea rows={2} /></Form.Item>
          <Text strong style={{ display: 'block', marginBottom: 8 }}>Permissions per Modul</Text>
          <div style={{ border: '1px solid #d9d9d9', borderRadius: 6, padding: 16 }}>
            {MODULS.map((modul, i) => (
              <Row key={modul} gutter={[8, 8]} align="middle" style={{ marginBottom: i < MODULS.length - 1 ? 8 : 0, paddingBottom: i < MODULS.length - 1 ? 8 : 0, borderBottom: i < MODULS.length - 1 ? '1px solid #f0f0f0' : 'none' }}>
                <Col xs={24} sm={5}><Text strong>{modul}</Text></Col>
                <Col xs={24} sm={19}>
                  <Form.Item name={[`perm_${modul}`, 'view']} valuePropName="checked" noStyle><Checkbox>View</Checkbox></Form.Item>
                  <Form.Item name={[`perm_${modul}`, 'create']} valuePropName="checked" noStyle><Checkbox style={{ marginLeft: 16 }}>Create</Checkbox></Form.Item>
                  <Form.Item name={[`perm_${modul}`, 'edit']} valuePropName="checked" noStyle><Checkbox style={{ marginLeft: 16 }}>Edit</Checkbox></Form.Item>
                  <Form.Item name={[`perm_${modul}`, 'delete']} valuePropName="checked" noStyle><Checkbox style={{ marginLeft: 16 }}>Delete</Checkbox></Form.Item>
                </Col>
              </Row>
            ))}
          </div>
        </Form>
      </Modal>
    </>
  );
}
