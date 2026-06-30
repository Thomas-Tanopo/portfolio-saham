import { useEffect, useState, useRef } from 'react';
import { Card, Table, Tag, Button, Row, Col, Statistic, message, InputNumber, Spin, Modal, Form, Select, DatePicker, Space, Popconfirm, Tooltip, Upload, Image, Input, Checkbox } from 'antd';
import { PlusOutlined, ReloadOutlined, EditOutlined, DeleteOutlined, SaveOutlined, UploadOutlined, PaperClipOutlined, UndoOutlined, CameraOutlined, CloseCircleOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { UploadFile } from 'antd/es/upload';
import dayjs from 'dayjs';
import api from '../../services/api';
import { fetchSemuaHarga } from '../../services/priceService';
import { useAuthStore } from '../../stores/authStore';
import { usePermission } from '../../hooks/usePermission';
import ApprovalTimeline from '../../components/ApprovalTimeline';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const rp = (v: number) => Intl.NumberFormat('id-ID').format(v);

interface PortfolioItem {
  key: number; sahamId?: number; kode: string; nama: string;
  total_lembar: number; harga_rata: number; total_modal: number;
  dividend_per_share?: number; market_price?: number;
}
interface TransaksiItem {
  key: number; id: number; userId: number; sahamId: number;
  tanggal: string; kode: string; tipe: 'beli' | 'jual'; jumlah: number; harga: number; total: number;
  status: string; buktiPendukung?: string; remarks?: string; approvalCatatan?: string;
  deletedAt?: string;
}

export default function Transaksi() {
  const authUser = useAuthStore((s) => s.user);
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const [transaksi, setTransaksi] = useState<TransaksiItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDeleted, setShowDeleted] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<TransaksiItem | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();
  const [sahams, setSahams] = useState<{ id: number; kode: string; nama: string }[]>([]);
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const perm = usePermission('Transaksi');
  const [selectedSahamId, setSelectedSahamId] = useState<number | undefined>();
  const [selectedTipe, setSelectedTipe] = useState<string>('');
  const [activityId, setActivityId] = useState<number | null>(null);
  const [activityOpen, setActivityOpen] = useState(false);
  const myHoldings = (() => {
    const m = new Map<number, number>();
    for (const tr of transaksi) {
      if (tr.status !== 'approved' || tr.userId !== authUser?.id) continue;
      const curr = m.get(tr.sahamId) || 0;
      m.set(tr.sahamId, curr + (tr.tipe === 'beli' ? tr.jumlah : -tr.jumlah));
    }
    return m;
  })();
  const portfolioSahamIds = new Set([...myHoldings.entries()].filter(([_, v]) => v > 0).map(([k]) => k));
  const availableLembar = selectedSahamId ? (myHoldings.get(selectedSahamId) || 0) : 0;

  const fetchAll = (showDel?: boolean) => {
    setLoading(true);
    const params = {} as any;
    if (showDel) params.showDeleted = 'true';
    Promise.all([
      api.get('/transaksi', { params }),
      api.get('/saham'),
    ]).then(([resTrans, resSaham]) => {
      const sahamList = resSaham.data;
      const sahamMap = new Map(sahamList.map((s: any) => [s.kode, s]));
      setSahams(sahamList);

      const rawTrans = Array.isArray(resTrans.data) ? resTrans.data : resTrans.data.value || [];
      const t = rawTrans;
      setTransaksi(t.map((tr: any) => {
        const approvalList = tr.approval || [];
        const lastApproval = approvalList.filter((a: any) => a.catatan).sort((a: any, b: any) => new Date(b.processedAt || b.createdAt).getTime() - new Date(a.processedAt || a.createdAt).getTime())[0];
        return {
          key: tr.id, id: tr.id, userId: tr.userId, sahamId: tr.sahamId,
          tanggal: new Date(tr.tanggal).toISOString().split('T')[0],
          kode: tr.saham?.kode || '-', tipe: tr.tipe, jumlah: tr.jumlah, harga: tr.harga,
          total: tr.jumlah * tr.harga,
          status: tr.status, buktiPendukung: tr.buktiPendukung, remarks: tr.remarks, approvalCatatan: lastApproval?.catatan, deletedAt: tr.deletedAt,
        };
      }));

      const approved = t.filter((tr: any) => tr.status === 'approved');
      const portfolioMap = new Map<string, { sahamId: number; nama: string; lembar: number; modal: number }>();
      for (const tr of approved) {
        const kode = tr.saham?.kode;
        if (!kode) continue;
        const curr = portfolioMap.get(kode) || { sahamId: tr.sahamId, nama: tr.saham.nama, lembar: 0, modal: 0 };
        if (tr.tipe === 'beli') { curr.lembar += tr.jumlah; curr.modal += tr.jumlah * tr.harga; }
        else { curr.lembar -= tr.jumlah; curr.modal -= tr.jumlah * tr.harga; }
        portfolioMap.set(kode, curr);
      }

      const savedPrices = JSON.parse(localStorage.getItem('market_prices') || '{}') as Record<string, number>;
      const p: PortfolioItem[] = [];
      let idx = 1;
      for (const [kode, val] of portfolioMap) {
        if (val.lembar <= 0) continue;
        const saham = sahamMap.get(kode);
        p.push({ key: idx++, sahamId: val.sahamId, kode, nama: val.nama, total_lembar: val.lembar, harga_rata: Math.round(val.modal / val.lembar), total_modal: val.modal, dividend_per_share: saham?.dividendPerShare ?? 0, market_price: savedPrices[kode] });
      }
      setPortfolio(p);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { fetchAll(); }, []);

  const openAdd = async () => {
    if (perm.create_with_approval) {
      try {
        const res = await api.get('/approval-matrix');
        const matrixList = res.data || [];
        const userLevel0 = matrixList.some((m: any) => m.status === 'aktif' && m.releaseLevel === 0 && m.userId === authUser?.id);
        if (!userLevel0) {
          message.error('Anda belum dimaintain sebagai requester di approval matrix (level 0)');
          return;
        }
        const headApproval = matrixList.some((m: any) => m.status === 'aktif' && m.releaseLevel === 1);
        if (!headApproval) {
          message.error('Maintain release level 1 (head approval) terlebih dahulu');
          return;
        }
      } catch {
        message.error('Gagal validasi approval matrix');
        return;
      }
    }
    setEditing(null); form.resetFields(); setFileList([]); setSelectedSahamId(undefined); setSelectedTipe(''); setModalOpen(true);
  };
  const openEdit = (record: TransaksiItem) => {
    setEditing(record);
    setSelectedSahamId(record.sahamId);
    setSelectedTipe(record.tipe);
    form.setFieldsValue({ sahamId: record.sahamId, tipe: record.tipe, jumlah: record.jumlah / 100, totalInvestasi: record.jumlah * record.harga, tanggal: dayjs(record.tanggal) });
    if (record.buktiPendukung) {
      setFileList([{ uid: '-1', name: record.buktiPendukung, status: 'done', url: `${API_URL.replace('/api', '')}/uploads/${record.buktiPendukung}` }]);
    } else {
      setFileList([]);
    }
    setModalOpen(true);
  };

  const isRevision = editing?.status === 'request_info';

  const handleOk = async () => {
    const values = await form.validateFields();
    setSubmitting(true);
    try {
      const jumlahLembar = values.jumlah * 100;
      const harga = Math.round(values.totalInvestasi / jumlahLembar);
      const buktiPendukung = fileList.length > 0 && fileList[0].response?.filename ? fileList[0].response.filename : (editing?.buktiPendukung || undefined);
      const payload: any = { sahamId: values.sahamId, tipe: values.tipe, jumlah: jumlahLembar, harga, tanggal: values.tanggal.toISOString(), buktiPendukung, remarks: values.remarks };

      if (editing) {
        payload.userId = editing.userId;
        if (isRevision) {
          await api.post(`/transaksi/${editing.id}/resubmit`, payload);
          message.success('Transaksi diresubmit untuk approval');
        } else {
          await api.put(`/transaksi/${editing.id}`, payload);
          message.success('Transaksi diupdate');
        }
      } else {
        payload.userId = authUser?.id;
        await api.post('/transaksi', payload);
        message.success('Transaksi berhasil ditambahkan');
      }
      setModalOpen(false); fetchAll(showDeleted);
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || 'Gagal menyimpan transaksi';
      message.error(msg);
    } finally { setSubmitting(false); }
  };

  const handleDelete = async (id: number) => {
    try { await api.delete(`/transaksi/${id}`); message.success('Transaksi dihapus'); fetchAll(showDeleted); }
    catch { message.error('Gagal menghapus transaksi'); }
  };

  const updateHarga = async () => {
    setUpdating(true);
    try {
      const kodes = portfolio.map((p) => p.kode);
      const hargaMap = await fetchSemuaHarga(kodes);
      localStorage.setItem('market_prices', JSON.stringify(hargaMap));
      setPortfolio((prev) => prev.map((item) => ({ ...item, market_price: hargaMap[item.kode] })));
      message.success('Market price berhasil diupdate');
    } catch { message.error('Gagal mengambil harga pasar'); } finally { setUpdating(false); }
  };

  const [savingDividend, setSavingDividend] = useState<number | null>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleCameraCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const isJpgPng = file.type === 'image/jpeg' || file.type === 'image/png';
    if (!isJpgPng) { message.error('Hanya file JPG/PNG yang diizinkan'); return; }
    if (file.size / 1024 / 1024 >= 6) { message.error('Ukuran file maksimal 6MB'); return; }
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await api.post('/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      setFileList([{ uid: '-1', name: res.data.filename, status: 'done', url: `${API_URL.replace('/api', '')}/uploads/${res.data.filename}` }]);
      message.success('Foto berhasil diupload');
    } catch { message.error('Gagal upload foto'); }
    e.target.value = '';
  };

  const updateDividend = (key: number, value: number | null) => { setPortfolio((prev) => prev.map((item) => item.key === key ? { ...item, dividend_per_share: value ?? undefined } : item)); };

  const saveDividend = async (item: PortfolioItem) => {
    if (!item.sahamId) return; setSavingDividend(item.key);
    try { await api.patch(`/saham/${item.sahamId}/dividend`, { dividendPerShare: item.dividend_per_share || 0 }); message.success(`Dividend ${item.kode} disimpan`); }
    catch { message.error('Gagal menyimpan dividend'); } finally { setSavingDividend(null); }
  };

  const totalModal = portfolio.reduce((s, p) => s + p.total_modal, 0);
  const totalPasar = portfolio.reduce((s, p) => s + (p.market_price ? p.market_price * p.total_lembar : 0), 0);

  const portfolioColumns: ColumnsType<PortfolioItem> = [
    { title: 'Kode', dataIndex: 'kode', key: 'kode' },
    { title: 'Nama', dataIndex: 'nama', key: 'nama' },
    { title: 'Total Lembar', dataIndex: 'total_lembar', key: 'total_lembar', render: (v: number) => rp(v) },
    { title: 'Harga Rata-rata', dataIndex: 'harga_rata', key: 'harga_rata', render: (v: number) => `Rp ${rp(v)}` },
    { title: 'Total Modal', dataIndex: 'total_modal', key: 'total_modal', render: (v: number) => `Rp ${rp(v)}` },
    { title: 'Dividend / Share', key: 'dividend_per_share', width: 280, render: (_: unknown, record: PortfolioItem) => (
      <Space.Compact>
        <InputNumber value={record.dividend_per_share} onChange={(val) => updateDividend(record.key, val)} placeholder="0" style={{ width: 140 }} min={0}
          formatter={(value) => `Rp ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}
          parser={(value) => value?.replace(/Rp\s?/g, '').replace(/\./g, '') as unknown as number}
        />
        <Button icon={<SaveOutlined />} onClick={() => saveDividend(record)} loading={savingDividend === record.key} />
      </Space.Compact>
    )},
    { title: 'Market Price', dataIndex: 'market_price', key: 'market_price', render: (v: number | undefined) => v ? `Rp ${rp(v)}` : <Tag>Belum update</Tag> },
  ];

  const transaksiColumns: ColumnsType<TransaksiItem> = [
    { title: 'Tanggal', dataIndex: 'tanggal', key: 'tanggal' },
    { title: 'Saham', dataIndex: 'kode', key: 'kode' },
    { title: 'Tipe', dataIndex: 'tipe', key: 'tipe', render: (t: string) => <Tag color={t === 'beli' ? 'blue' : 'orange'}>{t.toUpperCase()}</Tag> },
    { title: 'Jumlah', dataIndex: 'jumlah', key: 'jumlah', render: (v: number) => rp(v) },
    { title: 'Harga', dataIndex: 'harga', key: 'harga', render: (v: number) => `Rp ${rp(v)}` },
    { title: 'Total', dataIndex: 'total', key: 'total', render: (v: number) => `Rp ${rp(v)}` },
    { title: 'Status', dataIndex: 'status', key: 'status', width: 120, render: (s: string, r: TransaksiItem) => {
      const colors: Record<string, string> = { approved: 'green', pending: 'orange', rejected: 'red', request_info: 'blue' };
      const labels: Record<string, string> = { approved: 'APPROVED', pending: 'PENDING', rejected: 'REJECTED', request_info: 'REQ INFO' };
      const tag = <Tag color={colors[s] || 'default'}>{labels[s] || s?.toUpperCase()}</Tag>;
      if (r.approvalCatatan) {
        return <Tooltip title={r.approvalCatatan}>{tag}</Tooltip>;
      }
      return tag;
    }},
    { title: 'Remarks', dataIndex: 'remarks', key: 'remarks', width: 180, render: (r: string) => r || '-' },
    { title: 'Bukti', key: 'bukti', width: 80, render: (_: unknown, r: TransaksiItem) =>
      r.buktiPendukung ? (
        <Image src={`${API_URL.replace('/api', '')}/uploads/${r.buktiPendukung}`} alt="bukti" width={40} preview={{ mask: <PaperClipOutlined /> }} />
      ) : '-'
    },
    { title: 'Aksi', key: 'aksi', width: 200, render: (_: unknown, r: TransaksiItem) => (
      <Space wrap size="small">
        <Button type="link" size="small" icon={<PaperClipOutlined />} onClick={() => { setActivityId(r.id); setActivityOpen(true); }}>Activity</Button>
        {!r.deletedAt ? <>
          {r.status === 'request_info' && perm.create_with_approval ? (
            <Button type="primary" size="small" icon={<UndoOutlined />} onClick={() => openEdit(r)}>Resubmit</Button>
          ) : perm.edit ? (
            <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openEdit(r)} disabled={r.status !== 'pending' && r.status !== 'approved'} />
          ) : null}
          {perm.delete && <Popconfirm title="Hapus transaksi?" onConfirm={() => handleDelete(r.id)}>
            <Button type="link" size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>}
        </> : <Tag color="red">Deleted</Tag>}
      </Space>
    )},
  ];

  return (
    <div>
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={8}><Card><Statistic title="Total Portfolio" value={totalPasar || totalModal} prefix="Rp" precision={0} /></Card></Col>
        <Col xs={24} sm={8}><Card><Statistic title="Total Investasi" value={totalModal} prefix="Rp" precision={0} /></Card></Col>
        <Col xs={24} sm={8}><Card><Statistic title="Total Saham Dimiliki" value={portfolio.length} suffix="saham" /></Card></Col>
      </Row>

      <Spin spinning={loading}>
        <Card title="Portfolio Saat Ini" style={{ marginBottom: 16 }}
          extra={<Button type="primary" icon={<ReloadOutlined />} onClick={updateHarga} loading={updating}>Update Market Price</Button>}
        >
          <Table columns={portfolioColumns} dataSource={portfolio} pagination={false} scroll={{ x: 'max-content' }} />
        </Card>

        <Card title="Riwayat Transaksi"
          extra={(perm.create_with_approval || perm.create_without_approval) && <Button type="primary" icon={<PlusOutlined />} onClick={openAdd}>Tambah Transaksi</Button>}
        >
          <Space style={{ marginBottom: 16 }}>
            <Checkbox checked={showDeleted} onChange={(e) => { setShowDeleted(e.target.checked); fetchAll(e.target.checked); }}>
              Tampilkan data yang sudah dihapus
            </Checkbox>
          </Space>
          <Table columns={transaksiColumns} dataSource={transaksi} pagination={false} scroll={{ x: 'max-content' }} rowClassName={(r) => r.deletedAt ? 'deleted-row' : ''} />
        </Card>
      </Spin>

      <Modal title={isRevision ? 'Resubmit Transaksi' : editing ? 'Edit Transaksi' : 'Tambah Transaksi'} open={modalOpen} onOk={handleOk} onCancel={() => setModalOpen(false)} confirmLoading={submitting}>
        <Form form={form} layout="vertical">
          <Form.Item name="sahamId" label="Saham" rules={[{ required: true }]}>
            <Select
              showSearch
              filterOption={(input, option) => (option?.label as string ?? '').toLowerCase().includes(input.toLowerCase())}
              options={sahams
                .filter((s) => selectedTipe !== 'jual' || portfolioSahamIds.has(s.id))
                .map((s) => ({ value: s.id, label: `${s.kode} - ${s.nama}` }))}
              onChange={(val) => setSelectedSahamId(val)}
            />
          </Form.Item>
          <Form.Item name="tipe" label="Tipe" rules={[{ required: true }]}>
            <Select options={[{ value: 'beli', label: 'Beli' }, { value: 'jual', label: 'Jual' }]} onChange={(val) => setSelectedTipe(val)} />
          </Form.Item>
          <Form.Item name="jumlah" label="Jumlah Lot" rules={[
            { required: true },
            {
              validator: (_, value) => {
                if (selectedTipe === 'jual' && selectedSahamId && value) {
                  const lot = value * 100;
                  if (lot > availableLembar) {
                    return Promise.reject(new Error(`Saldo tidak mencukupi. Tersedia: ${availableLembar.toLocaleString('id-ID')} lembar`));
                  }
                }
                return Promise.resolve();
              },
            },
          ]}>
            <InputNumber min={1} style={{ width: '100%' }} />
          </Form.Item>
          {selectedTipe === 'jual' && selectedSahamId && (
            <div style={{ marginTop: -16, marginBottom: 12, color: '#888', fontSize: 13 }}>
              Tersedia: {availableLembar.toLocaleString('id-ID')} lembar
            </div>
          )}
          <Form.Item name="totalInvestasi" label="Total Investasi" rules={[{ required: true }]}><InputNumber min={1} style={{ width: '100%' }} prefix="Rp"
            formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}
            parser={(value) => value?.replace(/\./g, '') as unknown as number}
          /></Form.Item>
          <Form.Item name="tanggal" label="Tanggal" rules={[{ required: true }]}><DatePicker style={{ width: '100%' }} /></Form.Item>
          <Form.Item name="remarks" label="Remarks"><Input.TextArea rows={2} /></Form.Item>
          <Form.Item label="Bukti Pendukung">
            <Space>
              <Button icon={<CameraOutlined />} onClick={() => cameraInputRef.current?.click()}>Ambil Foto</Button>
              <Upload
                showUploadList={false}
                beforeUpload={(file) => {
                  const isJpgPng = file.type === 'image/jpeg' || file.type === 'image/png';
                  if (!isJpgPng) { message.error('Hanya file JPG/PNG yang diizinkan'); return Upload.LIST_IGNORE; }
const isLt6M = file.size / 1024 / 1024 < 6;
if (!isLt6M) { message.error('Ukuran file maksimal 6MB'); return Upload.LIST_IGNORE; }
                  return true;
                }}
                action={`${API_URL}/upload`}
                headers={{ Authorization: `Bearer ${localStorage.getItem('token')}` }}
                maxCount={1}
                accept="image/*"
                onChange={({ file, fileList: fl }) => {
                  if (file.status === 'done') {
                    setFileList(fl.filter((f) => f.status === 'done'));
                  }
                }}
              >
                <Button icon={<UploadOutlined />}>Pilih dari Gallery</Button>
              </Upload>
            </Space>
            {fileList.length > 0 && (
              <div style={{ marginTop: 8, position: 'relative', display: 'inline-block' }}>
                <Image src={fileList[0].url} width={120} style={{ borderRadius: 8 }} />
                <Button
                  type="text"
                  danger
                  size="small"
                  style={{ position: 'absolute', top: -8, right: -8 }}
                  icon={<CloseCircleOutlined />}
                  onClick={() => setFileList([])}
                />
              </div>
            )}
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              style={{ display: 'none' }}
              onChange={handleCameraCapture}
            />
          </Form.Item>
        </Form>
      </Modal>

      <ApprovalTimeline
        transaksiId={activityId}
        open={activityOpen}
        onClose={() => setActivityOpen(false)}
      />
    </div>
  );
}
