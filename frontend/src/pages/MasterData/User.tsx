import { useEffect, useState, useRef } from 'react';
import { Card, Table, Button, Tag, Spin, Modal, Form, Input, Select, Space, message, Popconfirm, Checkbox, Upload, Image } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, UploadOutlined, CloseCircleOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { UploadFile } from 'antd/es/upload';
import api from '../../services/api';
import { usePermission } from '../../hooks/usePermission';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

interface AuditUser { id: number; nama: string }
interface RoleItem { id: number; nama: string; deskripsi?: string }
interface UserItem {
  key: number; id: number; username: string; nama: string; roleId: number; role: RoleItem; status: string;
  foto?: string;
  createdAt?: string; updatedAt?: string;
  updatedBy?: AuditUser;
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

export default function User() {
  const [data, setData] = useState<UserItem[]>([]);
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDeleted, setShowDeleted] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<UserItem | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const cameraFileRef = useRef<File | null>(null);
  const perm = usePermission('User');

  const fetch = (showDel?: boolean) => {
    setLoading(true);
    const params = {} as any;
    if (showDel) params.showDeleted = 'true';
    Promise.all([api.get('/users', { params }), api.get('/role')]).then(([resU, resR]) => {
      setRoles(resR.data);
      setData(resU.data.map((u: any) => ({ key: u.id, id: u.id, ...u })));
    }).finally(() => setLoading(false));
  };

  useEffect(() => { fetch(); }, []);

  const toggleShowDeleted = (checked: boolean) => {
    setShowDeleted(checked);
    fetch(checked);
  };

  const openCreate = () => { setEditing(null); form.resetFields(); setFileList([]); cameraFileRef.current = null; setModalOpen(true); };
  const openEdit = (record: UserItem) => {
    setEditing(record);
    form.setFieldsValue({ username: record.username, nama: record.nama, roleId: record.roleId ?? record.role?.id, status: record.status });
    cameraFileRef.current = null;
    if (record.foto) {
      setFileList([{ uid: '-1', name: record.foto, status: 'done', url: `${API_URL.replace('/api', '')}/uploads/${record.foto}`, response: { filename: record.foto } }]);
    } else {
      setFileList([]);
    }
    setModalOpen(true);
  };

  const handleOk = async () => {
    const values = await form.validateFields();
    setSubmitting(true);
    try {
      let foto = editing?.foto;
      if (cameraFileRef.current) {
        const fd = new FormData();
        fd.append('file', cameraFileRef.current);
        const upRes = await api.post('/upload/user', fd, { headers: { 'Content-Type': undefined } });
        foto = upRes.data.filename;
        cameraFileRef.current = null;
      } else if (fileList.length > 0 && fileList[0].response?.filename) {
        foto = fileList[0].response.filename;
      }
      const payload = { ...values, foto };
      if (editing) { await api.put(`/users/${editing.id}`, payload); message.success('User diupdate'); }
      else { await api.post('/users', payload); message.success('User dibuat'); }
      setModalOpen(false); fetch(showDeleted);
    } catch (e: any) {
      const status = e?.response?.status;
      let msg = e?.response?.data?.message || e?.response?.data?.error || e?.message || 'Gagal menyimpan user';
      if (status === 413) msg = 'Ukuran file terlalu besar. Maksimal 10MB.';
      message.error(msg);
    } finally { setSubmitting(false); }
  };

  const handleDelete = async (id: number) => {
    try { await api.delete(`/users/${id}`); message.success('User dihapus'); fetch(showDeleted); }
    catch { message.error('Gagal menghapus user'); }
  };

  const columns: ColumnsType<UserItem> = [
    { title: 'Foto', key: 'foto', width: 60, render: (_: unknown, r: UserItem) =>
      r.foto ? <Image src={`${API_URL.replace('/api', '')}/uploads/${r.foto}`} alt="foto" width={36} height={36} style={{ borderRadius: '50%', objectFit: 'cover' }} /> : '-'
    },
    { title: 'Username', dataIndex: 'username', key: 'username' },
    { title: 'Nama Lengkap', dataIndex: 'nama', key: 'nama' },
    { title: 'Role', key: 'role', render: (_: unknown, r: UserItem) => r.role?.nama ?? '-' },
    { title: 'Status', dataIndex: 'status', key: 'status', render: (s: string) => <Tag color={s === 'aktif' ? 'green' : 'red'}>{s.toUpperCase()}</Tag> },
    {
      title: 'Tgl Dibuat', key: 'createdAt', width: 150,
      render: (_: unknown, r: UserItem) => fDate(r.createdAt),
    },
    {
      title: 'Diubah Oleh', key: 'updatedBy', width: 120,
      render: (_: unknown, r: UserItem) => r.updatedBy ? <Tag color="blue">{r.updatedBy.nama}</Tag> : '-',
    },
    {
      title: 'Tgl Diubah', key: 'updatedAt', width: 150,
      render: (_: unknown, r: UserItem) => fDate(r.updatedAt),
    },
    {
      title: 'Dihapus Oleh', key: 'deletedBy', width: 120,
      render: (_: unknown, r: UserItem) => r.deletedBy ? <Tag color="red">{r.deletedBy.nama}</Tag> : '-',
    },
    {
      title: 'Tgl Dihapus', key: 'deletedAt', width: 150,
      render: (_: unknown, r: UserItem) => fDate(r.deletedAt),
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
        <Space style={{ marginBottom: 16 }}>
          <Checkbox checked={showDeleted} onChange={(e) => toggleShowDeleted(e.target.checked)}>
            Tampilkan data yang sudah dihapus
          </Checkbox>
        </Space>
        <Spin spinning={loading}>
          <Table columns={columns} dataSource={data} pagination={false} scroll={{ x: 'max-content' }} rowClassName={(r) => r.deletedAt ? 'deleted-row' : ''} />
        </Spin>
      </Card>
      <Modal title={editing ? 'Edit User' : 'Tambah User'} open={modalOpen} onOk={handleOk} onCancel={() => setModalOpen(false)} confirmLoading={submitting}>
        <Form form={form} layout="vertical">
          <Form.Item name="username" label="Username" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="nama" label="Nama Lengkap" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="password" label="Password" rules={[{ required: !editing }]}><Input.Password placeholder={editing ? 'Kosongkan jika tidak diganti' : ''} /></Form.Item>
          <Form.Item name="roleId" label="Role" rules={[{ required: true }]}><Select options={roles.map((r) => ({ value: r.id, label: r.nama }))} /></Form.Item>
          <Form.Item label="Foto">
            <Space>
              <Upload
                showUploadList={false}
                beforeUpload={(file) => {
                  const isImage = file.type.startsWith('image/');
                  if (!isImage) { message.error('Hanya file gambar yang diizinkan'); return Upload.LIST_IGNORE; }
                  if (file.size / 1024 / 1024 >= 10) { message.error('Ukuran file maksimal 10MB'); return Upload.LIST_IGNORE; }
                  return true;
                }}
                action={`${API_URL}/upload/user`}
                headers={{ Authorization: `Bearer ${localStorage.getItem('token')}` }}
                maxCount={1}
                accept="image/*"
                onChange={({ file, fileList: fl }) => {
                  if (file.status === 'done') {
                    setFileList(fl.filter((f) => f.status === 'done'));
                  }
                }}
              >
                <Button icon={<UploadOutlined />}>Pilih Foto</Button>
              </Upload>
            </Space>
            {fileList.length > 0 && (
              <div style={{ marginTop: 8, position: 'relative', display: 'inline-block' }}>
                <Image src={fileList[0].url} width={80} height={80} style={{ borderRadius: 8, objectFit: 'cover' }} />
                <Button type="text" danger size="small" style={{ position: 'absolute', top: -8, right: -8 }}
                  icon={<CloseCircleOutlined />} onClick={() => { setFileList([]); cameraFileRef.current = null; }} />
              </div>
            )}
          </Form.Item>
          <Form.Item name="status" label="Status" rules={[{ required: true }]}><Select options={[{ value: 'aktif', label: 'Aktif' }, { value: 'nonaktif', label: 'Nonaktif' }]} /></Form.Item>
        </Form>
      </Modal>
    </>
  );
}
