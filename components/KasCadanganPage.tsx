
import React, { useState, useMemo } from 'react';
import ArrowLeftIcon from './icons/ArrowLeftIcon';

declare const Swal: any;

interface FinanceEntry {
  id: number;
  deskripsi: string;
  tanggal: string;
  kategori: string;
  metode: string;
  nominal: number;
}

interface KasCadanganPageProps {
  onBack: () => void;
  kasCadangan: number;
  setKasCadangan: React.Dispatch<React.SetStateAction<number>>;
  saldoAkhir: number;
  setFinanceHistory: React.Dispatch<React.SetStateAction<FinanceEntry[]>>;
  financeHistory: FinanceEntry[];
  onKasActivity: (type: 'add' | 'use', amount: number) => void;
}

const KasCadanganPage: React.FC<KasCadanganPageProps> = ({
  onBack,
  kasCadangan,
  setKasCadangan,
  saldoAkhir,
  setFinanceHistory,
  financeHistory,
  onKasActivity
}) => {
  const [tambahAmount, setTambahAmount] = useState('');
  const [gunakanAmount, setGunakanAmount] = useState('');

  const handleTambahKas = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const amount = Number(tambahAmount);
    if (amount <= 0 || isNaN(amount)) {
      Swal.fire({ title: 'Error', text: 'Jumlah yang dimasukkan tidak valid.', icon: 'error', customClass: { popup: '!bg-gray-800 !text-white', title: '!text-white' } });
      return;
    }
    if (amount > saldoAkhir) {
      Swal.fire({ title: 'Error', text: `Saldo akhir tidak mencukupi. Saldo saat ini: Rp ${saldoAkhir.toLocaleString('id-ID')}.`, icon: 'error', customClass: { popup: '!bg-gray-800 !text-white', title: '!text-white' } });
      return;
    }
    
    const newExpenseEntry: FinanceEntry = {
        id: Date.now(),
        deskripsi: `Transfer ke Kas Cadangan`,
        tanggal: new Date().toISOString().split('T')[0],
        kategori: 'Pengeluaran',
        metode: 'Internal',
        nominal: amount,
    };
    setFinanceHistory(prev => [...prev, newExpenseEntry]);
    setKasCadangan(prev => prev + amount);
    onKasActivity('add', amount);
    
    Swal.fire({ title: 'Berhasil', text: `Rp ${amount.toLocaleString('id-ID')} berhasil ditambahkan ke kas cadangan.`, icon: 'success', customClass: { popup: '!bg-gray-800 !text-white', title: '!text-white' } });
    setTambahAmount('');
  };

  const handleGunakanKas = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const amount = Number(gunakanAmount);
    if (amount <= 0 || isNaN(amount)) {
        Swal.fire({ title: 'Error', text: 'Jumlah yang dimasukkan tidak valid.', icon: 'error', customClass: { popup: '!bg-gray-800 !text-white', title: '!text-white' } });
        return;
    }
    if (amount > kasCadangan) {
        Swal.fire({ title: 'Error', text: `Kas cadangan tidak mencukupi. Saldo kas cadangan: Rp ${kasCadangan.toLocaleString('id-ID')}.`, icon: 'error', customClass: { popup: '!bg-gray-800 !text-white', title: '!text-white' } });
        return;
    }

    const newIncomeEntry: FinanceEntry = {
        id: Date.now(),
        deskripsi: `Ambil dari Kas Cadangan`,
        tanggal: new Date().toISOString().split('T')[0],
        kategori: 'Pemasukan',
        metode: 'Internal',
        nominal: amount,
    };
    setFinanceHistory(prev => [...prev, newIncomeEntry]);
    setKasCadangan(prev => prev - amount);
    onKasActivity('use', amount);
    
    Swal.fire({ title: 'Berhasil', text: `Rp ${amount.toLocaleString('id-ID')} ditarik dari kas cadangan dan ditambahkan ke saldo akhir.`, icon: 'success', customClass: { popup: '!bg-gray-800 !text-white', title: '!text-white' } });
    setGunakanAmount('');
  };

  const kasHistory = useMemo(() => {
      return financeHistory
          .filter(entry => entry.deskripsi.toLowerCase().includes('kas cadangan'))
          .sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime());
  }, [financeHistory]);

  return (
    <div className="flex-grow flex flex-col">
      <div className="mb-8">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-lg text-white font-medium hover:text-sky-300 transition-colors duration-300"
          aria-label="Kembali ke dasbor"
        >
          <ArrowLeftIcon className="w-5 h-5" />
          <span>Kembali</span>
        </button>
      </div>
      
      <main className="flex-grow flex flex-col bg-black/20 rounded-lg p-4 sm:p-8 space-y-12">
        <div>
            <h2 className="text-2xl sm:text-3xl font-semibold mb-6 text-center">Manajemen Kas Cadangan</h2>
            <div className="bg-sky-500/10 p-6 rounded-lg text-center mb-8 max-w-md mx-auto">
                <p className="text-lg text-sky-400 font-semibold">Total Dana di Kas Cadangan</p>
                <p className={`text-4xl font-bold text-white`}>
                  Rp {kasCadangan.toLocaleString('id-ID')}
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Add to Reserve */}
                <div className="bg-white/5 p-6 rounded-lg flex flex-col">
                    <h3 className="text-xl font-semibold mb-2">Tambah ke Kas Cadangan</h3>
                    <p className="text-sm text-gray-400 mb-4">Pindahkan dana dari Saldo Akhir. Akan dicatat sebagai <strong className="text-red-400">pengeluaran</strong>.</p>
                    <form onSubmit={handleTambahKas} className="space-y-4 flex-grow flex flex-col">
                        <div className="flex-grow">
                            <label htmlFor="tambahAmount" className="block text-sm font-medium text-gray-300 mb-1">Jumlah (Rp)</label>
                            <input
                                type="number"
                                id="tambahAmount"
                                value={tambahAmount}
                                onChange={(e) => setTambahAmount(e.target.value)}
                                required
                                className="w-full pl-4 pr-3 py-2 text-white bg-white/10 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-blue-400 focus:outline-none transition duration-300 placeholder-gray-400"
                                placeholder="0"
                            />
                            <p className="text-xs text-gray-500 mt-1">Saldo Akhir: Rp {saldoAkhir.toLocaleString('id-ID')}</p>
                        </div>
                        <button type="submit" className="w-full py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-blue-500 transition-transform transform hover:scale-105">
                            Simpan ke Cadangan
                        </button>
                    </form>
                </div>
                
                {/* Use from Reserve */}
                <div className="bg-white/5 p-6 rounded-lg flex flex-col">
                    <h3 className="text-xl font-semibold mb-2">Gunakan dari Kas Cadangan</h3>
                    <p className="text-sm text-gray-400 mb-4">Pindahkan dana ke Saldo Akhir. Akan dicatat sebagai <strong className="text-green-400">pemasukan</strong>.</p>
                     <form onSubmit={handleGunakanKas} className="space-y-4 flex-grow flex flex-col">
                        <div className="flex-grow">
                            <label htmlFor="gunakanAmount" className="block text-sm font-medium text-gray-300 mb-1">Jumlah (Rp)</label>
                            <input
                                type="number"
                                id="gunakanAmount"
                                value={gunakanAmount}
                                onChange={(e) => setGunakanAmount(e.target.value)}
                                required
                                className="w-full pl-4 pr-3 py-2 text-white bg-white/10 border border-gray-600 rounded-lg focus:ring-2 focus:ring-green-400 focus:border-green-400 focus:outline-none transition duration-300 placeholder-gray-400"
                                placeholder="0"
                            />
                             <p className="text-xs text-gray-500 mt-1">Kas Cadangan: Rp {kasCadangan.toLocaleString('id-ID')}</p>
                        </div>
                        <button type="submit" className="w-full py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-green-500 transition-transform transform hover:scale-105">
                            Tarik dari Cadangan
                        </button>
                    </form>
                </div>
            </div>
        </div>

        <div>
            <h3 className="text-2xl font-semibold mb-4 text-center">Riwayat Transaksi Kas Cadangan</h3>
            {kasHistory.length > 0 ? (
                <div className="overflow-x-auto">
                    <table className="min-w-full text-sm text-left text-gray-300">
                        <thead className="text-xs text-white uppercase bg-white/10">
                            <tr>
                                <th scope="col" className="px-6 py-3">Tanggal</th>
                                <th scope="col" className="px-6 py-3">Deskripsi</th>
                                <th scope="col" className="px-6 py-3">Jenis Transaksi</th>
                                <th scope="col" className="px-6 py-3 text-right">Nominal (Rp)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {kasHistory.map((entry) => (
                                <tr key={entry.id} className="border-b border-gray-700 hover:bg-white/5">
                                    <td className="px-6 py-4">{new Date(entry.tanggal).toLocaleDateString('id-ID', { timeZone: 'UTC', day: '2-digit', month: 'long', year: 'numeric' })}</td>
                                    <th scope="row" className="px-6 py-4 font-medium text-white whitespace-nowrap">{entry.deskripsi}</th>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                            entry.kategori === 'Pemasukan' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                                        }`}>
                                            {entry.kategori === 'Pemasukan' ? 'Masuk ke Saldo' : 'Keluar dari Saldo'}
                                        </span>
                                    </td>
                                    <td className={`px-6 py-4 text-right font-semibold ${entry.kategori === 'Pemasukan' ? 'text-green-400' : 'text-red-400'}`}>
                                        {entry.kategori === 'Pemasukan' ? '+' : '-'} {entry.nominal.toLocaleString('id-ID')}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <p className="text-center text-gray-400 mt-4">Belum ada riwayat transaksi untuk kas cadangan.</p>
            )}
        </div>
      </main>
    </div>
  );
};

export default KasCadanganPage;