import { useEffect, useState } from 'react';
import { Card, Row, Col, Statistic, Table, Tag, Progress, Divider, Typography, Spin } from 'antd';
import {
  WalletOutlined,
  ArrowUpOutlined,
  StockOutlined,
  PercentageOutlined,
  SwapOutlined,
} from '@ant-design/icons';
import api from '../services/api';

const rp = (v: number) => Intl.NumberFormat('id-ID').format(v);

const { Text, Title } = Typography;

const transColumns = [
  { title: 'Tanggal', dataIndex: 'tanggal', key: 'tanggal' },
  { title: 'Saham', dataIndex: 'kode', key: 'kode' },
  {
    title: 'Tipe',
    dataIndex: 'tipe',
    key: 'tipe',
    render: (t: string) => (
      <Tag color={t === 'beli' ? 'blue' : 'orange'}>{t.toUpperCase()}</Tag>
    ),
  },
  { title: 'Jumlah', dataIndex: 'jumlah', key: 'jumlah', render: (v: number) => rp(v) },
  { title: 'Total', dataIndex: 'total', key: 'total', render: (v: number) => `Rp ${rp(v)}` },
];

const colors = ['#1677ff', '#52c41a', '#fa8c16', '#722ed1', '#eb2f96'];

export default function Dashboard() {
  const [portfolio, setPortfolio] = useState<any[]>([]);
  const [recentTrans, setRecentTrans] = useState<any[]>([]);
  const [totalTrans, setTotalTrans] = useState(0);
  const [avgYield, setAvgYield] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/transaksi'),
      api.get('/saham'),
    ]).then(([resTrans, resSaham]) => {
      const t = resTrans.data;
      const sahamList = resSaham.data;
      const sahamMap = new Map(sahamList.map((s: any) => [s.kode, s]));
      setTotalTrans(t.length);
      setRecentTrans(t.slice(0, 3).map((tr: any) => ({
        key: tr.id,
        tanggal: new Date(tr.tanggal).toISOString().split('T')[0],
        kode: tr.saham?.kode || '-',
        tipe: tr.tipe,
        jumlah: tr.jumlah,
        total: tr.jumlah * tr.harga,
      })));

      const map = new Map<string, any>();
      for (const tr of t) {
        const kode = tr.saham?.kode;
        if (!kode) continue;
        const curr = map.get(kode) || { nama: tr.saham.nama, lembar: 0, modal: 0 };
        if (tr.tipe === 'beli') { curr.lembar += tr.jumlah; curr.modal += tr.jumlah * tr.harga; }
        else { curr.lembar -= tr.jumlah; curr.modal -= tr.jumlah * tr.harga; }
        map.set(kode, curr);
      }

      const totalModal = Array.from(map.values()).reduce((s, v) => s + v.modal, 0);
      let totalDividen = 0;
      const items = Array.from(map.entries())
        .filter(([_, v]) => v.lembar > 0)
        .map(([kode, v]) => {
          const s = sahamMap.get(kode);
          const dividen = (s?.dividendPerShare || 0) * v.lembar;
          totalDividen += dividen;
          return {
            kode,
            nama: v.nama,
            lembar: v.lembar,
            modal: v.modal,
            pasar: v.modal,
            pct: totalModal > 0 ? (v.modal / totalModal) * 100 : 0,
          };
        });
      setPortfolio(items);
      setAvgYield(totalModal > 0 ? (totalDividen / totalModal) * 100 : 0);
    }).finally(() => setLoading(false));
  }, []);

  const totalModal = portfolio.reduce((s, p) => s + p.modal, 0);
  const totalPasar = portfolio.reduce((s, p) => s + p.pasar, 0);

  return (
    <Spin spinning={loading}>
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24}>
          <Card style={{ background: 'linear-gradient(135deg, #1677ff 0%, #0958d9 100%)', borderRadius: 12 }}>
            <Row align="middle" justify="space-between">
              <Col>
                <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14 }}>Portfolio Value</Text>
                <Title level={2} style={{ color: '#fff', margin: '4px 0 0' }}>
                  Rp {rp(totalPasar)}
                </Title>
                <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>
                  Total Investasi: Rp {rp(totalModal)}
                </Text>
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card hoverable size="small">
            <Statistic title="Total Modal" value={totalModal} prefix={<WalletOutlined />} formatter={(v) => <span>{rp(Number(v))}</span>} valueStyle={{ fontSize: 18 }} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card hoverable size="small">
            <Statistic title="Total Saham" value={portfolio.length} prefix={<StockOutlined />} suffix="saham" valueStyle={{ fontSize: 18 }} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card hoverable size="small">
            <Statistic title="Avg Dividend Yield" value={avgYield} precision={2} suffix="%" prefix={<PercentageOutlined />} valueStyle={{ fontSize: 18, color: '#722ed1' }} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card hoverable size="small">
            <Statistic title="Total Transaksi" value={totalTrans} prefix={<SwapOutlined />} valueStyle={{ fontSize: 18 }} />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} lg={14}>
          <Card title="Portfolio Allocation">
            {portfolio.length === 0 ? <Text type="secondary">Belum ada portfolio</Text> :
              portfolio.map((item, i) => (
                <div key={item.kode} style={{ marginBottom: 16 }}>
                  <Row justify="space-between" style={{ marginBottom: 4 }}>
                    <Col><Text strong>{item.kode}</Text><Text type="secondary" style={{ marginLeft: 8 }}>{item.nama}</Text></Col>
                    <Col><Text>{item.pct.toFixed(1)}%</Text></Col>
                  </Row>
                  <Progress percent={item.pct} strokeColor={colors[i % colors.length]} showInfo={false} size="small" />
                  <Row justify="space-between" style={{ marginTop: 2 }}>
                    <Text type="secondary" style={{ fontSize: 11 }}>{rp(item.lembar)} lembar</Text>
                    <Text type="secondary" style={{ fontSize: 11 }}>Rp {rp(item.modal)}</Text>
                  </Row>
                </div>
              ))
            }
          </Card>
        </Col>
        <Col xs={24} lg={10}>
          <Card title="Portfolio Summary">
            <Row justify="space-between" style={{ marginBottom: 8 }}><Text>Total Nilai Pasar</Text><Text strong>Rp {rp(totalPasar)}</Text></Row>
            <Row justify="space-between" style={{ marginBottom: 8 }}><Text>Total Modal</Text><Text>Rp {rp(totalModal)}</Text></Row>
            <Divider style={{ margin: '8px 0' }} />
            <Row justify="space-between"><Text>Jumlah Saham</Text><Text strong>{portfolio.length}</Text></Row>
          </Card>
        </Col>
      </Row>

      <Card title="Transaksi Terakhir" size="small">
        <Table columns={transColumns} dataSource={recentTrans} pagination={false} size="small" showHeader={false} scroll={{ x: 'max-content' }} />
      </Card>
    </Spin>
  );
}
