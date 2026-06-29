import { useEffect, useState } from 'react';
import { Card, Table, Button, Tag, Spin, Modal, Form, Input, Select, Space, message, Popconfirm, Tooltip } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import api from '../../services/api';
import { usePermission } from '../../hooks/usePermission';

interface AuditUser { id: number; nama: string }
interface RoleItem { id: number; nama: string; deskripsi?: string }
interface UserItem {
  key: number; id: number; username: string; nama: string; roleId: number; role: RoleItem; status: string;
  createdBy?: AuditUser; updatedBy?: AuditUser; deletedAt?: string;
}

export default function User() {
  const [data, setData] = useState<UserItem[]>([]);
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<UserItem | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();
  const perm = usePermission('User');

  const fetch = () => {
    setLoading(true);
    Promise.all([api.get('/users'), api.get('/role')]).then(([resU, resR]) => {
      setRoles(resR.data);
      setData(resU.data.map((u: any) => ({ key: u.id, id: u.id, ...u })));
    }).finally(() => setLoading(false));
  };

  useEffect(() => { fetch(); }, []);

  const openCreate = () => { setEditing(null); form.resetFields(); setModalOpen(true); };
  const openEdit = (record: UserItem) => {
    setEditing(record);
    form.setFieldsValue({ username: record.username, nama: record.nama, roleId: record.roleId ?? record.role?.id, status: record.status });
    setModalOpen(true);
  };

  const handleOk = async () => {
    const values = await form.validateFields();
    setSubmitting(true);
    try {
      if (editing) { await api.put(`/users/${editing.id}`, values); message.success('User diupdate'); }
      else { await api.post('/users', values); message.success('User dibuat'); }
      setModalOpen(false); fetch();
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.response?.data?.error || e?.message || 'Gagal menyimpan user';
      message.error(msg);
    } finally { setSubmitting(false); }
  };

  const handleDelete = async (id: number) => {
    try { await api.delete(`/users/${id}`); message.success('User dihapus'); fetch(); }
    catch { message.error('Gagal menghapus user'); }
  };

  const columns: ColumnsType<UserItem> = [
    { title: 'Username', dataIndex: 'username', key: 'username' },
    { title: 'Nama Lengkap', dataIndex: 'nama', key: 'nama' },
    { title: 'Role', key: 'role', render: (_: unknown, r: UserItem) => r.role?.nama ?? '-' },
    { title: 'Status', dataIndex: 'status', key: 'status', render: (s: string) => <Tag color={s === 'aktif' ? 'green' : 'red'}>{s.toUpperCase()}</Tag> },
    {
      title: 'Dibuat', key: 'created', width: 120,
      render: (_: unknown, r: UserItem) => r.createdBy ? <Tooltip title={`ID: ${r.createdBy.id}`}><Tag>{r.createdBy.nama}</Tag></Tooltip> : '-',
    },
    {
      title: 'Diubah', key: 'updated', width: 120,
      render: (_: unknown, r: UserItem) => r.updatedBy ? <Tag color="blue">{r.updatedBy.nama}</Tag> : '-',
    },
    {
      title: 'Aksi', key: 'aksi',
      render: (_: unknown, r: UserItem) => (
        <Space>
          {!r.deletedAt && <>{perm.edit && <Button type="link" icon={<EditOutlined />} onClick={() => openEdit(r)} />}
          {perm.delete && <Popconfirm title="Hapus user?" onConfirm={() => handleDelete(r.id)}>
            <Button type="link" danger icon={<DeleteOutlined />} />
          </Popconfirm>}</>}
          {r.deletedAt && <Tag color="red">Deleted</Tag>}
        </Space>
      ),
    },
  ];

  return (
    <>
      <Card title="Master Data User" extra={perm.create && <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>Tambah User</Button>}>
        <Spin spinning={loading}><Table columns={columns} dataSource={data} pagination={false} scroll={{ x: 'max-content' }} /></Spin>
      </Card>
      <Modal title={editing ? 'Edit User' : 'Tambah User'} open={modalOpen} onOk={handleOk} onCancel={() => setModalOpen(false)} confirmLoading={submitting}>
        <Form form={form} layout="vertical">
          <Form.Item name="username" label="Username" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="nama" label="Nama Lengkap" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="password" label="Password" rules={[{ required: !editing }]}><Input.Password placeholder={editing ? 'Kosongkan jika tidak diganti' : ''} /></Form.Item>
          <Form.Item name="roleId" label="Role" rules={[{ required: true }]}><Select options={roles.map((r) => ({ value: r.id, label: r.nama }))} /></Form.Item>
          <Form.Item name="status" label="Status" rules={[{ required: true }]}><Select options={[{ value: 'aktif', label: 'Aktif' }, { value: 'nonaktif', label: 'Nonaktif' }]} /></Form.Item>
        </Form>
      </Modal>
    </>
  );
}
