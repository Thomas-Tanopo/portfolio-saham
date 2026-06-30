import { useEffect, useState } from 'react';
import { Card, Table, Button, Tag, Spin, Modal, Form, Input, Checkbox, Radio, Space, message, Popconfirm, Row, Col, Typography, Tooltip } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import api from '../../services/api';
import { usePermission } from '../../hooks/usePermission';
import { useAuthStore } from '../../stores/authStore';

const { Text } = Typography;

interface AuditUser { id: number; nama: string }
interface Permission { modul: string; view: boolean; create: boolean; edit: boolean; delete: boolean; create_with_approval?: boolean; create_without_approval?: boolean }
interface RoleItem {
  key: number; id: number; nama: string; deskripsi?: string; permissions: Permission[];
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

type PermState = {
  view: boolean;
  create: boolean;
  edit: boolean;
  delete: boolean;
  createType: 'approval' | 'no_approval' | 'none';
};

const MODULS = ['User', 'Sektor', 'Saham', 'Transaksi', 'Approval', 'Report', 'Role'] as const;

const defaultPermState = (): PermState => ({ view: false, create: false, edit: false, delete: false, createType: 'none' });

export default function Role() {
  const [data, setData] = useState<RoleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDeleted, setShowDeleted] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<RoleItem | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();
  const [perms, setPerms] = useState<Record<string, PermState>>({});
  const perm = usePermission('Role');
  const authUser = useAuthStore((s) => s.user);

  const refreshAuth = async () => {
    if (editing && authUser && editing.nama === authUser.role) {
      const res = await api.get('/auth/me');
      const user = res.data;
      localStorage.setItem('user', JSON.stringify(user));
      useAuthStore.setState({ user });
    }
  };

  const fetch = (showDel?: boolean) => {
    setLoading(true);
    const params = {} as any;
    if (showDel) params.showDeleted = 'true';
    api.get('/role', { params }).then((res) => {
      setData(res.data.map((r: any) => ({ key: r.id, id: r.id, ...r })));
    }).finally(() => setLoading(false));
  };

  useEffect(() => { fetch(); }, []);

  const toggleShowDeleted = (checked: boolean) => {
    setShowDeleted(checked);
    fetch(checked);
  };

  const buildInitialPerms = (record: RoleItem | null): Record<string, PermState> => {
    const result: Record<string, PermState> = {};
    for (const modul of MODULS) {
      const p = record?.permissions.find((x) => x.modul === modul);
      result[modul] = {
        view: p?.view ?? false,
        create: p?.create ?? false,
        edit: p?.edit ?? false,
        delete: p?.delete ?? false,
        createType: p?.create_with_approval ? 'approval' : p?.create_without_approval ? 'no_approval' : 'none',
      };
    }
    return result;
  };

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    setPerms(buildInitialPerms(null));
    setModalOpen(true);
  };

  const openEdit = (record: RoleItem) => {
    setEditing(record);
    form.setFieldsValue({ nama: record.nama, deskripsi: record.deskripsi });
    setPerms(buildInitialPerms(record));
    setModalOpen(true);
  };

  const setPerm = (modul: string, field: keyof PermState, value: boolean | string) => {
    setPerms((prev) => {
      const updated = { ...prev, [modul]: { ...prev[modul], [field]: value } };
      // Auto-enable view when any permission is checked
      if (field !== 'view' && value === true) {
        updated[modul].view = true;
      }
      // When view is unchecked, clear everything
      if (field === 'view' && value === false) {
        updated[modul] = defaultPermState();
      }
      if (field === 'createType') {
        updated[modul].view = true;
      }
      return updated;
    });
  };

  const handleOk = async () => {
    const values = await form.validateFields();
    setSubmitting(true);
    try {
      const permissions = MODULS.map((modul) => {
        const p = perms[modul] || defaultPermState();
        const isTransaksi = modul === 'Transaksi';
        return {
          modul,
          view: p.view,
          create: isTransaksi ? p.createType !== 'none' : p.create,
          edit: p.edit,
          delete: p.delete,
          create_with_approval: isTransaksi ? p.createType === 'approval' : false,
          create_without_approval: isTransaksi ? p.createType === 'no_approval' : false,
        };
      });
      const payload = { nama: values.nama, deskripsi: values.deskripsi, permissions };
      if (editing) { await api.put(`/role/${editing.id}`, payload); message.success('Role diupdate'); }
      else { await api.post('/role', payload); message.success('Role dibuat'); }
      setModalOpen(false); fetch(showDeleted); refreshAuth();
    } catch { message.error('Gagal menyimpan role'); } finally { setSubmitting(false); }
  };

  const handleDelete = async (id: number) => {
    try { await api.delete(`/role/${id}`); message.success('Role dihapus'); fetch(showDeleted); }
    catch (err: any) { message.error(err.response?.data?.message || 'Gagal menghapus role'); }
  };

  const columns: ColumnsType<RoleItem> = [
    { title: 'Nama Role', dataIndex: 'nama', key: 'nama' },
    { title: 'Deskripsi', dataIndex: 'deskripsi', key: 'deskripsi' },
    {
      title: 'Permission', key: 'permissions',
      render: (_: unknown, r: RoleItem) => (
        <Space size={[4, 4]} wrap>
          {r.permissions.map((p) => {
            let label = p.modul;
            if (p.view) {
              if (p.modul === 'Transaksi') {
                if ((p as any).create_with_approval) label += ' +C-w/';
                else if ((p as any).create_without_approval) label += ' +C-w/o';
              } else if (p.create) label += ' +C';
              if (p.edit) label += ' +E';
              if (p.delete) label += ' +D';
            }
            return <Tag key={p.modul} color={p.view ? 'blue' : 'default'}>{label}</Tag>;
          })}
        </Space>
      ),
    },
    {
      title: 'Dibuat Oleh', key: 'createdBy', width: 120,
      render: (_: unknown, r: RoleItem) => r.createdBy ? <Tooltip title={`ID: ${r.createdBy.id}`}><Tag>{r.createdBy.nama}</Tag></Tooltip> : '-',
    },
    {
      title: 'Tgl Dibuat', key: 'createdAt', width: 150,
      render: (_: unknown, r: RoleItem) => fDate(r.createdAt),
    },
    {
      title: 'Diubah Oleh', key: 'updatedBy', width: 120,
      render: (_: unknown, r: RoleItem) => r.updatedBy ? <Tag color="blue">{r.updatedBy.nama}</Tag> : '-',
    },
    {
      title: 'Tgl Diubah', key: 'updatedAt', width: 150,
      render: (_: unknown, r: RoleItem) => fDate(r.updatedAt),
    },
    {
      title: 'Dihapus Oleh', key: 'deletedBy', width: 120,
      render: (_: unknown, r: RoleItem) => r.deletedBy ? <Tag color="red">{r.deletedBy.nama}</Tag> : '-',
    },
    {
      title: 'Tgl Dihapus', key: 'deletedAt', width: 150,
      render: (_: unknown, r: RoleItem) => fDate(r.deletedAt),
    },
    {
      title: 'Aksi', key: 'aksi',
      render: (_: unknown, r: RoleItem) => (
        <Space>
          {!r.deletedAt && <>{perm.edit && <Button type="link" icon={<EditOutlined />} onClick={() => openEdit(r)} />}
          {perm.delete && <Popconfirm title="Hapus role?" onConfirm={() => handleDelete(r.id)}>
            <Button type="link" danger icon={<DeleteOutlined />} />
          </Popconfirm>}</>}
          {r.deletedAt && <Tag color="red">Deleted</Tag>}
        </Space>
      ),
    },
  ];

  return (
    <>
      <Card title="Master Data Role" extra={perm.create && <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>Tambah Role</Button>}>
        <Space style={{ marginBottom: 16 }}>
          <Checkbox checked={showDeleted} onChange={(e) => toggleShowDeleted(e.target.checked)}>
            Tampilkan data yang sudah dihapus
          </Checkbox>
        </Space>
        <Spin spinning={loading}><Table columns={columns} dataSource={data} pagination={false} scroll={{ x: 'max-content' }} rowClassName={(r) => r.deletedAt ? 'deleted-row' : ''} /></Spin>
      </Card>
      <Modal title={editing ? 'Edit Role' : 'Tambah Role'} open={modalOpen} onOk={handleOk} onCancel={() => setModalOpen(false)} confirmLoading={submitting} width={640}>
        <Form form={form} layout="vertical">
          <Form.Item name="nama" label="Nama Role" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="deskripsi" label="Deskripsi"><Input.TextArea rows={2} /></Form.Item>
          <Text strong style={{ display: 'block', marginBottom: 8 }}>Permissions per Modul</Text>
          <div style={{ border: '1px solid #d9d9d9', borderRadius: 6, padding: 16 }}>
            {MODULS.map((modul, i) => {
              const p = perms[modul] || defaultPermState();
              return (
                <Row key={modul} gutter={[8, 8]} align="middle" style={{ marginBottom: i < MODULS.length - 1 ? 8 : 0, paddingBottom: i < MODULS.length - 1 ? 8 : 0, borderBottom: i < MODULS.length - 1 ? '1px solid #f0f0f0' : 'none' }}>
                  <Col xs={24} sm={5}><Text strong>{modul}</Text></Col>
                  <Col xs={24} sm={19}>
                    <Checkbox
                      checked={p.view}
                      onChange={(e) => setPerm(modul, 'view', e.target.checked)}
                    >{modul === 'Approval' ? 'Access' : 'View'}</Checkbox>
                    {modul === 'Transaksi' ? (
                      p.view ? (
                        <>
                          <Radio.Group
                            value={p.createType === 'none' ? undefined : p.createType}
                            onChange={(e) => setPerm(modul, 'createType', e.target.value)}
                            style={{ marginLeft: 16 }}
                          >
                            <Radio value="approval">Create w/ Approval</Radio>
                            <Radio value="no_approval" style={{ marginLeft: 8 }}>Create w/o Approval</Radio>
                          </Radio.Group>
                          {(['edit', 'delete'] as const).map((action) => (
                            <Checkbox
                              key={action}
                              style={{ marginLeft: 16 }}
                              checked={p[action] as boolean}
                              onChange={(e) => setPerm(modul, action, e.target.checked)}
                            >
                              {action.charAt(0).toUpperCase() + action.slice(1)}
                            </Checkbox>
                          ))}
                        </>
                      ) : null
                    ) : modul === 'Report' || modul === 'Approval' ? null : (
                      (['create', 'edit', 'delete'] as const).map((action) => (
                        <Checkbox
                          key={action}
                          style={{ marginLeft: 16 }}
                          checked={p[action] as boolean}
                          onChange={(e) => setPerm(modul, action, e.target.checked)}
                        >
                          {action.charAt(0).toUpperCase() + action.slice(1)}
                        </Checkbox>
                      ))
                    )}
                  </Col>
                </Row>
              );
            })}
          </div>
        </Form>
      </Modal>
    </>
  );
}
