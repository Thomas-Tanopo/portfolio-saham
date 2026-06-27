export interface Saham {
  id: number;
  kode: string;
  nama: string;
  harga: number;
  created_at: string;
}

export interface Transaksi {
  id: number;
  saham_id: number;
  kode_saham: string;
  tipe: 'beli' | 'jual';
  jumlah: number;
  harga: number;
  total: number;
  tanggal: string;
}

export interface Portfolio {
  kode_saham: string;
  nama_saham: string;
  total_lembar: number;
  total_modal: number;
  harga_rata: number;
}
