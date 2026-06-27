import { useEffect, useState } from 'react';
import { Card, Table, Row, Col, Statistic, Tag, Spin, Button, Dropdown } from 'antd';
import {
  ArrowUpOutlined,
  ArrowDownOutlined,
  DollarOutlined,
  MoneyCollectOutlined,
  PercentageOutlined,
  DownloadOutlined,
  FileExcelOutlined,
  FilePdfOutlined,
} from '@ant-design/icons';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { ColumnsType } from 'antd/es/table';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import api from '../../services/api';

const rp = (v: number) => Intl.NumberFormat('id-ID').format(v);

interface ReportItem {
  key: number;
  kode: string;
  nama: string;
  sektor: string;
  lembar: number;
  hargaRata: number;
  modal: number;
  hargaSaatIni: number;
  nilaiPasar: number;
  dividen: number;
  totalDividen: number;
  yield: number;
  returnRp: number;
  returnPct: number;
}

const COLORS = ['#1677ff', '#52c41a', '#faad14', '#ff4d4f', '#722ed1', '#13c2c2', '#eb2f96', '#fa8c16', '#2f54eb', '#a0d911'];

const columns: ColumnsType<ReportItem> = [
  { title: 'Kode', dataIndex: 'kode', key: 'kode' },
  { title: 'Nama Saham', dataIndex: 'nama', key: 'nama' },
  { title: 'Sektor', dataIndex: 'sektor', key: 'sektor', render: (v: string) => <Tag>{v}</Tag> },
  { title: 'Lembar', dataIndex: 'lembar', key: 'lembar', align: 'right', render: (v: number) => rp(v) },
  { title: 'Harga Rata-rata', dataIndex: 'hargaRata', key: 'hargaRata', align: 'right', render: (v: number) => `Rp ${rp(v)}` },
  { title: 'Total Modal', dataIndex: 'modal', key: 'modal', align: 'right', render: (v: number) => `Rp ${rp(v)}` },
  { title: 'Market Price', dataIndex: 'hargaSaatIni', key: 'hargaSaatIni', align: 'right', render: (v: number) => `Rp ${rp(v)}` },
  { title: 'Nilai Pasar', dataIndex: 'nilaiPasar', key: 'nilaiPasar', align: 'right', render: (v: number) => `Rp ${rp(v)}` },
  {
    title: 'Dividend',
    key: 'yield',
    align: 'right',
    render: (_: unknown, r: ReportItem) => (
      <div>
        <strong>Rp {rp(r.totalDividen)}</strong>
        <div style={{ fontSize: 11, color: '#888' }}>{r.yield.toFixed(2)}%</div>
      </div>
    ),
  },
  {
    title: 'Return',
    key: 'return',
    align: 'right',
    render: (_: unknown, r: ReportItem) => (
      <div>
        <Tag color={r.returnPct >= 0 ? 'success' : 'error'}>
          {r.returnPct >= 0 ? '+' : ''}{r.returnPct.toFixed(2)}%
        </Tag>
        <div style={{ fontSize: 11, color: '#888' }}>{r.returnRp >= 0 ? '+' : ''}Rp {rp(r.returnRp)}</div>
      </div>
    ),
  },
];

export default function Report() {
  const [data, setData] = useState<ReportItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/transaksi'),
      api.get('/saham'),
    ]).then(([resTrans, resSaham]) => {
      const t = resTrans.data;
      const sahamList = resSaham.data;
      const sahamMap = new Map(sahamList.map((s: any) => [s.kode, s]));

      const map = new Map<string, any>();
      for (const tr of t) {
        const kode = tr.saham?.kode;
        if (!kode) continue;
        const curr = map.get(kode) || { nama: tr.saham.nama, lembar: 0, modal: 0 };
        if (tr.tipe === 'beli') { curr.lembar += tr.jumlah; curr.modal += tr.jumlah * tr.harga; }
        else { curr.lembar -= tr.jumlah; curr.modal -= tr.jumlah * tr.harga; }
        map.set(kode, curr);
      }

      const savedPrices = JSON.parse(localStorage.getItem('market_prices') || '{}') as Record<string, number>;
      const hargaMap = savedPrices;

      const items: ReportItem[] = [];
      let idx = 1;
      for (const [kode, v] of map) {
        if (v.lembar <= 0) continue;
        const s = sahamMap.get(kode);
        const hargaRata = Math.round(v.modal / v.lembar);
        const dividenPerLembar = s?.dividendPerShare || 0;
        const totalDividen = dividenPerLembar * v.lembar;
        const hargaSaatIni = hargaMap[kode] || hargaRata;
        const nilaiPasar = hargaSaatIni * v.lembar;
        const returnRp = nilaiPasar - v.modal;
        const returnPct = v.modal > 0 ? (returnRp / v.modal) * 100 : 0;
        items.push({
          key: idx++,
          kode,
          nama: v.nama,
          sektor: s?.sektor?.nama || '-',
          lembar: v.lembar,
          hargaRata,
          modal: v.modal,
          hargaSaatIni,
          nilaiPasar,
          dividen: dividenPerLembar,
          totalDividen,
          yield: hargaRata > 0 ? (dividenPerLembar / hargaRata) * 100 : 0,
          returnRp,
          returnPct,
        });
      }
      setData(items);
    }).finally(() => setLoading(false));
  }, []);

  const totalModal = data.reduce((s, d) => s + d.modal, 0);
  const totalPasar = data.reduce((s, d) => s + d.nilaiPasar, 0);
  const totalReturnRp = totalPasar - totalModal;
  const totalReturnPct = totalModal > 0 ? (totalReturnRp / totalModal) * 100 : 0;
  const totalDividen = data.reduce((s, d) => s + d.totalDividen, 0);
  const avgYield = totalModal > 0 ? (totalDividen / totalModal) * 100 : 0;

  const bySektor = new Map<string, { nama: string; value: number }>();
  for (const d of data) {
    const prev = bySektor.get(d.sektor) || { nama: d.sektor, value: 0 };
    prev.value += d.nilaiPasar;
    bySektor.set(d.sektor, prev);
  }
  const pieSektor = Array.from(bySektor.entries()).map(([_, v], i) => ({ name: v.nama, value: v.value, color: COLORS[i % COLORS.length] }));

  const pieSaham = data.map((d, i) => ({ name: d.kode, value: d.nilaiPasar, color: COLORS[i % COLORS.length] }));

  const renderLabel = ({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`;

  const downloadExcel = () => {
    const wsData = data.map((d) => ({
      Kode: d.kode,
      'Nama Saham': d.nama,
      Sektor: d.sektor,
      Lembar: d.lembar,
      'Harga Rata-rata': d.hargaRata,
      'Total Modal': d.modal,
      'Market Price': d.hargaSaatIni,
      'Nilai Pasar': d.nilaiPasar,
      'Total Dividen': d.totalDividen,
      'Dividend Yield': Number(d.yield.toFixed(2)),
      'Return (Rp)': d.returnRp,
      'Return (%)': Number(d.returnPct.toFixed(2)),
    }));
    wsData.push({
      Kode: 'TOTAL',
      'Nama Saham': '',
      Sektor: '',
      Lembar: data.reduce((s, d) => s + d.lembar, 0),
      'Harga Rata-rata': 0,
      'Total Modal': totalModal,
      'Market Price': 0,
      'Nilai Pasar': totalPasar,
      'Total Dividen': totalDividen,
      'Dividend Yield': Number(avgYield.toFixed(2)),
      'Return (Rp)': totalReturnRp,
      'Return (%)': Number(totalReturnPct.toFixed(2)),
    });
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(wsData);
    XLSX.utils.book_append_sheet(wb, ws, 'Report Portfolio');
    XLSX.writeFile(wb, `report_portfolio_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const downloadPdf = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text('Report Portfolio', 14, 20);
    doc.setFontSize(10);
    doc.text(`Tanggal: ${new Date().toLocaleDateString('id-ID')}`, 14, 28);

    const rows = data.map((d) => [
      d.kode, d.nama, d.sektor, d.lembar, `Rp ${rp(d.hargaRata)}`,
      `Rp ${rp(d.modal)}`, `Rp ${rp(d.hargaSaatIni)}`, `Rp ${rp(d.nilaiPasar)}`,
      `Rp ${rp(d.totalDividen)}`, `${d.yield.toFixed(2)}%`,
      `${d.returnRp >= 0 ? '+' : ''}Rp ${rp(d.returnRp)}`,
      `${d.returnPct >= 0 ? '+' : ''}${d.returnPct.toFixed(2)}%`,
    ]);
    rows.push([
      'TOTAL', '', '', data.reduce((s, d) => s + d.lembar, 0),
      '', `Rp ${rp(totalModal)}`, '', `Rp ${rp(totalPasar)}`,
      `Rp ${rp(totalDividen)}`, `${avgYield.toFixed(2)}%`,
      `${totalReturnRp >= 0 ? '+' : ''}Rp ${rp(totalReturnRp)}`,
      `${totalReturnPct >= 0 ? '+' : ''}${totalReturnPct.toFixed(2)}%`,
    ]);

    autoTable(doc, {
      head: [['Kode', 'Nama', 'Sektor', 'Lembar', 'Harga Rata', 'Total Modal', 'Market Price', 'Nilai Pasar', 'Dividen', 'Yield', 'Return Rp', 'Return %']],
      body: rows,
      startY: 34,
      styles: { fontSize: 7 },
      headStyles: { fillColor: [22, 119, 255] },
    });

    doc.save(`report_portfolio_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const downloadItems = [
    { key: 'excel', icon: <FileExcelOutlined />, label: 'Excel', onClick: downloadExcel },
    { key: 'pdf', icon: <FilePdfOutlined />, label: 'PDF', onClick: downloadPdf },
  ];

  return (
    <Spin spinning={loading}>
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card hoverable>
            <Statistic title="Total Modal Investasi" value={totalModal} prefix={<MoneyCollectOutlined />} formatter={(v) => <span>{rp(Number(v))}</span>} valueStyle={{ fontSize: 20 }} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card hoverable>
            <Statistic title="Total Nilai Pasar" value={totalPasar} prefix={<DollarOutlined />} formatter={(v) => <span>{rp(Number(v))}</span>} valueStyle={{ fontSize: 20, color: '#1677ff' }} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card hoverable>
            <Statistic title="Total Return" value={totalReturnPct} precision={2} suffix="%" prefix={totalReturnPct >= 0 ? <ArrowUpOutlined /> : <ArrowDownOutlined />} valueStyle={{ color: totalReturnPct >= 0 ? '#3f8600' : '#cf1322', fontSize: 20 }} />
            <div style={{ fontSize: 12, color: '#888', marginTop: 4 }}>{totalReturnRp >= 0 ? '+' : ''}Rp {rp(totalReturnRp)}</div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card hoverable>
            <Statistic title="Avg Dividend Yield" value={avgYield} precision={2} suffix="%" prefix={<PercentageOutlined />} valueStyle={{ fontSize: 20, color: '#722ed1' }} />
            <div style={{ fontSize: 12, color: '#888', marginTop: 4 }}>Total Dividen: Rp {rp(totalDividen)}</div>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} lg={12}>
          <Card title="Alokasi per Sektor">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={pieSektor} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={renderLabel}>
                  {pieSektor.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip formatter={(value: number) => `Rp ${rp(value)}`} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={12}>
          <Card title="Alokasi per Saham">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={pieSaham} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={renderLabel}>
                  {pieSaham.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip formatter={(value: number) => `Rp ${rp(value)}`} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>

      <Card title="Detail Portfolio" extra={<Dropdown menu={{ items: downloadItems }} trigger={['click']}><Button type="primary" icon={<DownloadOutlined />}>Download</Button></Dropdown>}>
        <Table columns={columns} dataSource={data} pagination={false} scroll={{ x: 'max-content' }} summary={() => (
          <Table.Summary>
            <Table.Summary.Row>
              <Table.Summary.Cell index={0} colSpan={5}><strong>Total</strong></Table.Summary.Cell>
              <Table.Summary.Cell index={5} align="right"><strong>Rp {rp(totalModal)}</strong></Table.Summary.Cell>
              <Table.Summary.Cell index={6} />
              <Table.Summary.Cell index={7} align="right"><strong>Rp {rp(totalPasar)}</strong></Table.Summary.Cell>
              <Table.Summary.Cell index={8} align="right">
                <div style={{ fontSize: 12 }}>Rp {rp(totalDividen)}</div>
                <strong>{avgYield.toFixed(2)}%</strong>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={9} align="right">
                <Tag color={totalReturnPct >= 0 ? 'success' : 'error'}>{totalReturnPct >= 0 ? '+' : ''}{totalReturnPct.toFixed(2)}%</Tag>
                <div style={{ fontSize: 11, color: '#888' }}>{totalReturnRp >= 0 ? '+' : ''}Rp {rp(totalReturnRp)}</div>
              </Table.Summary.Cell>
            </Table.Summary.Row>
          </Table.Summary>
        )} />
      </Card>
    </Spin>
  );
}
