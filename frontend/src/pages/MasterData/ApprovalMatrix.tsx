import { useEffect, useState } from 'react';
import { Card, Table, Button, Tag, Spin, Modal, Form, Select, InputNumber, Input, Space, message, Popconfirm, Empty, Checkbox, Tooltip } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, FolderOpenOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import api from '../../services/api';
import { usePermission } from '../../hooks/usePermission';

interface MatrixItem {
  key: number; id: number; groupId: number; releaseLevel: number; userId: number; tipe: string; status: string;
  user: { id: number; nama: string; username: string };
  createdAt?: string; updatedAt?: string;
  deletedAt?: string;
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

interface MatrixGroup {
  id: number; code: string; nama: string; status: string;
  items: MatrixItem[];
}

interface UserWithRole {
  id: number; nama: string; username: string;
  role: { id: number; nama: string; permissions: { modul: string; create_with_approval: boolean; view: boolean }[] };
}

export default function ApprovalMatrix() {
  const [groups, setGroups] = useState<MatrixGroup[]>([]);
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDeleted, setShowDeleted] = useState(false);

  // Modal group
  const [groupModal, setGroupModal] = useState(false);
  const [editingGroup, setEditingGroup] = useState<MatrixGroup | null>(null);
  const [groupForm] = Form.useForm();

  // Modal item
  const [itemModal, setItemModal] = useState(false);
  const [currentGroup, setCurrentGroup] = useState<MatrixGroup | null>(null);
  const [editingItem, setEditingItem] = useState<MatrixItem | null>(null);
  const [itemForm] = Form.useForm();

  const [submitting, setSubmitting] = useState(false);
  const [releaseLevel, setReleaseLevel] = useState<number>(0);
  const perm = usePermission('Approval');

  const filteredUsers = users.filter((u) => {
    const perms = u.role?.permissions ?? [];
    if (releaseLevel === 0) {
      return perms.some((p) => p.modul === 'Transaksi' && p.create_with_approval);
    }
    return perms.some((p) => p.modul === 'Approval' && p.view);
  });

  const fetch = (showDel?: boolean) => {
    setLoading(true);
    const params = {} as any;
    if (showDel) params.showDeleted = 'true';
    Promise.all([
      api.get('/approval-matrix-group', { params }),
      api.get('/users'),
    ]).then(([resGrp, resUsers]) => {
      setGroups(resGrp.data);
      setUsers(resUsers.data);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { fetch(); }, []);

  useEffect(() => {
    const currentUserId = itemForm.getFieldValue('userId');
    if (currentUserId && !filteredUsers.some((u) => u.id === currentUserId)) {
      itemForm.setFieldValue('userId', undefined);
    }
  }, [releaseLevel]);

  // Group handlers
  const openCreateGroup = () => { setEditingGroup(null); groupForm.resetFields(); setGroupModal(true); };
  const openEditGroup = (g: MatrixGroup) => {
    setEditingGroup(g);
    groupForm.setFieldsValue({ code: g.code, nama: g.nama, status: g.status });
    setGroupModal(true);
  };

  const handleGroupOk = async () => {
    const values = await groupForm.validateFields();
    setSubmitting(true);
    try {
      if (editingGroup) { await api.put(`/approval-matrix-group/${editingGroup.id}`, values); message.success('Diupdate'); }
      else { await api.post('/approval-matrix-group', values); message.success('Ditambahkan'); }
      setGroupModal(false); fetch(showDeleted);
    } catch { message.error('Gagal simpan'); } finally { setSubmitting(false); }
  };

  const handleDeleteGroup = async (id: number) => {
    try {
      await api.delete(`/approval-matrix-group/${id}`);
      message.success('Grup dan semua item berhasil dihapus');
      fetch(showDeleted);
    } catch { message.error('Gagal menghapus grup'); }
  };

  // Item handlers
  const openCreateItem = (g: MatrixGroup) => {
    setCurrentGroup(g);
    setEditingItem(null);
    setReleaseLevel(0);
    itemForm.resetFields();
    itemForm.setFieldsValue({ releaseLevel: 0 });
    setItemModal(true);
  };
  const openEditItem = (r: MatrixItem) => {
    setEditingItem(r);
    setCurrentGroup(groups.find(g => g.id === r.groupId) || null);
    setReleaseLevel(r.releaseLevel);
    itemForm.setFieldsValue({ releaseLevel: r.releaseLevel, userId: r.userId, tipe: r.tipe || 'or' });
    setItemModal(true);
  };

  const handleItemOk = async () => {
    const values = await itemForm.validateFields();
    setSubmitting(true);
    try {
      const payload = { groupId: currentGroup!.id, releaseLevel: values.releaseLevel, userId: values.userId, tipe: values.tipe || 'or' };
      if (editingItem) { await api.put(`/approval-matrix/${editingItem.id}`, payload); message.success('Diupdate'); }
      else { await api.post('/approval-matrix', payload); message.success('Ditambahkan'); }
      setItemModal(false); fetch(showDeleted);
    } catch { message.error('Gagal simpan'); } finally { setSubmitting(false); }
  };

  const handleDeleteItem = async (id: number) => {
    await api.delete(`/approval-matrix/${id}`);
    message.success('Dihapus');
    fetch(showDeleted);
  };

  const itemColumns: ColumnsType<MatrixItem> = [
    { title: 'Release Level', dataIndex: 'releaseLevel', key: 'releaseLevel', width: 120 },
    { title: 'User', dataIndex: ['user', 'nama'], key: 'user', width: 200 },
    { title: 'Username', dataIndex: ['user', 'username'], key: 'username', width: 150 },
    { title: 'Type', dataIndex: 'tipe', key: 'tipe', width: 100, render: (t: string) => <Tag color={t === 'and' ? 'blue' : 'green'}>{t ? t.toUpperCase() : 'OR'}</Tag> },
    { title: 'Tgl Dibuat', key: 'createdAt', width: 150, render: (_: unknown, r: MatrixItem) => fDate(r.createdAt) },
    { title: 'Tgl Diubah', key: 'updatedAt', width: 150, render: (_: unknown, r: MatrixItem) => fDate(r.updatedAt) },
    { title: 'Aksi', key: 'aksi', width: 100, render: (_: unknown, r: MatrixItem) => (
      <Space>
        {!r.deletedAt ? <>{perm.edit && <Button type="link" icon={<EditOutlined />} onClick={() => openEditItem(r)} />}{perm.delete && <Popconfirm title="Hapus?" onConfirm={() => handleDeleteItem(r.id)}><Button type="link" danger icon={<DeleteOutlined />} /></Popconfirm>}</> : <Tag color="red">Deleted</Tag>}
      </Space>
    )},
  ];

  return (
    <Spin spinning={loading}>
      <Card title="Approval Matrix" extra={perm.create && <Button type="primary" icon={<PlusOutlined />} onClick={openCreateGroup}>Tambah Grup</Button>}>
        <Space style={{ marginBottom: 16 }}>
          <Checkbox checked={showDeleted} onChange={(e) => { setShowDeleted(e.target.checked); fetch(e.target.checked); }}>
            Tampilkan data yang sudah dihapus
          </Checkbox>
        </Space>
        {groups.length === 0 ? <Empty description="Belum ada grup. Klik Tambah Grup untuk mulai." /> : groups.map(g => (
          <Card
            key={g.id}
            type="inner"
            size="small"
            style={{ marginBottom: 16 }}
            title={
              <Space>
                <FolderOpenOutlined />
                <strong>{g.code}</strong>
                <span style={{ fontWeight: 'normal' }}>- {g.nama}</span>
                <Tag color={g.status === 'aktif' ? 'green' : 'red'}>{g.status}</Tag>
              </Space>
            }
            extra={
              <Space>
                {perm.create && <Button type="primary" size="small" icon={<PlusOutlined />} onClick={() => openCreateItem(g)}>Tambah Item</Button>}
                {perm.edit && <Button size="small" icon={<EditOutlined />} onClick={() => openEditGroup(g)} />}
                {perm.delete && <Popconfirm title="Hapus grup?" onConfirm={() => handleDeleteGroup(g.id)}>
                  <Button size="small" danger icon={<DeleteOutlined />} />
                </Popconfirm>}
              </Space>
            }
          >
            <Table columns={itemColumns} dataSource={g.items.map(r => ({ key: r.id, ...r }))} pagination={false} scroll={{ x: 'max-content' }} size="small" rowClassName={(r) => r.deletedAt ? 'deleted-row' : ''} />
          </Card>
        ))}
      </Card>

      {/* Modal Group */}
      <Modal title={editingGroup ? 'Edit Grup' : 'Tambah Grup'} open={groupModal} onOk={handleGroupOk} onCancel={() => setGroupModal(false)} confirmLoading={submitting}>
        <Form form={groupForm} layout="vertical">
          <Form.Item name="code" label="Code" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="nama" label="Nama" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="status" label="Status"><Select options={[{ value: 'aktif', label: 'Aktif' }, { value: 'nonaktif', label: 'Nonaktif' }]} /></Form.Item>
        </Form>
      </Modal>

      {/* Modal Item */}
      <Modal title={editingItem ? 'Edit Item' : `Tambah Item - ${currentGroup?.code || ''}`} open={itemModal} onOk={handleItemOk} onCancel={() => setItemModal(false)} confirmLoading={submitting}>
        <Form form={itemForm} layout="vertical">
          <Form.Item name="releaseLevel" label="Release Level" rules={[{ required: true }]}>
            <InputNumber min={0} style={{ width: '100%' }} onChange={(v) => setReleaseLevel(v ?? 0)} />
          </Form.Item>
          <Form.Item name="userId" label="User" rules={[{ required: true }]}>
            <Select
              showSearch
              filterOption={(input, option) =>
                (option?.label as string ?? '').toLowerCase().includes(input.toLowerCase())
              }
              options={filteredUsers.map((u) => ({ value: u.id, label: `${u.nama} (${u.username})` }))}
            />
          </Form.Item>
          {releaseLevel > 0 && (
            <Form.Item name="tipe" label="Type" rules={[{ required: true }]}><Select options={[{ value: 'or', label: 'OR' }, { value: 'and', label: 'AND' }]} /></Form.Item>
          )}
        </Form>
      </Modal>
    </Spin>
  );
}
