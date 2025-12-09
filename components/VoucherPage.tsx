

import React, { useState, useMemo } from 'react';
import ArrowLeftIcon from './icons/ArrowLeftIcon';
import { FinanceEntry } from '../App'; // Import FinanceEntry for type consistency

declare const Swal: any;

interface MonthlyVoucherSummary {
  month: string;
  totalRevenue: number;
}

interface VoucherPageProps {
  onBack: () => void;
  financeHistory: FinanceEntry[];
  setFinanceHistory: React.Dispatch<React.SetStateAction<FinanceEntry[]>>;
  onNewFinanceEntry: (entry: FinanceEntry) => void;
  onVoucherWithdrawal: (entry: FinanceEntry) => void; // For Dashboard notification
  currentSelectedMonth: string; // From DashboardPage to sync initial filter
}

const VoucherPage: React.FC<VoucherPageProps> = ({
  onBack,
  financeHistory,
  setFinanceHistory,
  onNewFinanceEntry,
  onVoucherWithdrawal,
  currentSelectedMonth,
}) => {
  const [editingId, setEditingId] = useState<number | null>(null);
  
  const [voucherType, setVoucherType] = useState('Voucher Harian');
  const [customType, setCustomType] = useState('');
  const [quantity, setQuantity] = useState('');
  const [pricePerUnit, setPricePerUnit] = useState('');
  const [tanggal, setTanggal] = useState(new Date().toISOString().split('T')[0]);

  const getCurrentMonthString = (date: Date) => date.toLocaleString('id-ID', { month: 'long', year: 'numeric', timeZone: 'UTC' });
  // Initialize selectedMonth with the one from DashboardPage, or current month if 'all'
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const today = new Date();
    const currentMonth = getCurrentMonthString(today);
    return currentSelectedMonth === 'all' ? currentMonth : currentSelectedMonth;
  });

  // Predefined voucher types
  const voucherOptions = [
    'Voucher 3 Jam',
    'Voucher Harian',
    'Voucher Mingguan',
    'Voucher Bulanan',
    'Lainnya'
  ];

  const resetForm = () => {
    setEditingId(null);
    setVoucherType('Voucher Harian');
    setCustomType('');
    setQuantity('');
    setPricePerUnit('');
    setTanggal(new Date().toISOString().split('T')[0]);
  };

  const handleStartEdit = (entry: FinanceEntry) => {
    setEditingId(entry.id);
    setTanggal(entry.tanggal);

    // Try to parse description: "Penjualan Voucher - [Type] ([Qty] pcs)"
    // Regex: Penjualan Voucher - (.*?) \((\d+) pcs\)
    const regex = /Penjualan Voucher - (.*?) \((\d+) pcs\)/;
    const match = entry.deskripsi.match(regex);

    if (match) {
        const extractedType = match[1];
        const extractedQty = Number(match[2]);
        const calculatedPrice = entry.nominal / extractedQty;

        setQuantity(extractedQty.toString());
        setPricePerUnit(calculatedPrice.toString());

        if (voucherOptions.includes(extractedType)) {
            setVoucherType(extractedType);
            setCustomType('');
        } else {
            setVoucherType('Lainnya');
            setCustomType(extractedType);
        }
    } else {
        // Fallback if format doesn't match
        setVoucherType('Lainnya');
        setCustomType(entry.deskripsi);
        setQuantity('1');
        setPricePerUnit(entry.nominal.toString());
    }
  };

  const handleDelete = (id: number) => {
    Swal.fire({
      title: 'Hapus Transaksi?',
      text: "Data penjualan voucher ini akan dihapus permanen.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Ya, hapus!',
      cancelButtonText: 'Batal',
      customClass: {
          popup: '!bg-gray-800 !text-white !rounded-lg',
          title: '!text-white',
          htmlContainer: '!text-gray-300',
          confirmButton: '!bg-red-600 hover:!bg-red-700',
          cancelButton: '!bg-gray-600 hover:!bg-gray-700',
      },
    }).then((result: any) => {
      if (result.isConfirmed) {
        setFinanceHistory(prev => prev.filter(entry => entry.id !== id));
        if (editingId === id) resetForm();
        Swal.fire({
            title: 'Dihapus!',
            text: 'Data telah dihapus.',
            icon: 'success',
            customClass: { popup: '!bg-gray-800 !text-white', title: '!text-white' }
        });
      }
    });
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const qty = Number(quantity);
    const price = Number(pricePerUnit);

    if (qty <= 0 || price <= 0) {
      Swal.fire({
        title: 'Error',
        text: 'Jumlah dan Harga harus lebih dari 0.',
        icon: 'error',
        customClass: { popup: '!bg-gray-800 !text-white', title: '!text-white' }
      });
      return;
    }

    const total = qty * price;
    const finalType = voucherType === 'Lainnya' ? customType : voucherType;
    const description = `Penjualan Voucher - ${finalType} (${qty} pcs)`;

    if (editingId) {
        // UPDATE Existing
        setFinanceHistory(prev => prev.map(entry => {
            if (entry.id === editingId) {
                return {
                    ...entry,
                    deskripsi: description,
                    tanggal: tanggal,
                    nominal: total,
                    isConsolidated: false, // Ensure it's false on edit, if it was consolidated, it means it's a new "sale" of an old type.
                };
            }
            return entry;
        }));
        Swal.fire({
            title: 'Berhasil',
            text: 'Data penjualan voucher berhasil diperbarui.',
            icon: 'success',
            customClass: { popup: '!bg-gray-800 !text-white', title: '!text-white' }
        });
        resetForm();
    } else {
        // CREATE New
        const newEntry: FinanceEntry = {
            id: Date.now(),
            deskripsi: description,
            tanggal: tanggal,
            kategori: 'Pemasukan',
            metode: 'Tunai', // Default to Tunai for vouchers usually
            nominal: total,
            isConsolidated: false, // New voucher sales are always initially not consolidated
        };

        setFinanceHistory(prev => [...prev, newEntry]);
        onNewFinanceEntry(newEntry); // Notify dashboard for general finance updates

        Swal.fire({
            title: 'Berhasil',
            text: `Pendapatan Voucher sebesar Rp ${total.toLocaleString('id-ID')} berhasil disimpan.`,
            icon: 'success',
            customClass: { popup: '!bg-gray-800 !text-white', title: '!text-white' }
        });
        
        // Reset qty only for quick input
        setQuantity('');
    }
  };

  // All voucher transactions (both consolidated and unconsolidated) for historical view
  const allVoucherTransactionsGross = useMemo(() => {
    return financeHistory
      .filter(entry => 
        entry.kategori === 'Pemasukan' && 
        entry.deskripsi.toLowerCase().includes('voucher')
      )
      .sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime());
  }, [financeHistory]);

  // All unconsolidated voucher transactions for the "available balance" and history display
  const availableVoucherTransactions = useMemo(() => {
    return financeHistory
      .filter(entry => 
        entry.kategori === 'Pemasukan' && 
        entry.deskripsi.toLowerCase().includes('voucher') &&
        entry.isConsolidated !== true // Only show unconsolidated entries
      )
      .sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime());
  }, [financeHistory]);

  // Available months for filtering (uses gross history to ensure all months are shown)
  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    allVoucherTransactionsGross.forEach(entry => {
      const date = new Date(entry.tanggal);
      months.add(getCurrentMonthString(date));
    });
    const sortedMonths = Array.from(months).sort((a,b) => {
      const [monthA, yearA] = a.split(' ');
      const [monthB, yearB] = b.split(' ');
      const dateA = new Date(Date.parse(`${monthA} 1, ${yearA}`));
      const dateB = new Date(Date.parse(`${monthB} 1, ${yearB}`));
      return dateA.getTime() - dateB.getTime();
    }).reverse();
    return ['Semua Waktu', ...sortedMonths];
  }, [allVoucherTransactionsGross]);

  // Filtered voucher transactions for current view (only unconsolidated for selected month)
  const filteredVoucherHistory = useMemo(() => {
    if (selectedMonth === 'Semua Waktu') {
      return availableVoucherTransactions;
    }
    return availableVoucherTransactions.filter(entry => {
      const entryDate = new Date(entry.tanggal);
      return getCurrentMonthString(entryDate) === selectedMonth;
    });
  }, [availableVoucherTransactions, selectedMonth]);

  // Total revenue available to withdraw for the selected month
  const totalVoucherRevenueAvailable = filteredVoucherHistory.reduce((acc, curr) => acc + curr.nominal, 0);

  // Monthly summary for historical display (uses gross history)
  const monthlyVoucherSummary = useMemo(() => {
    const summaryMap: { [key: string]: number } = {};
    allVoucherTransactionsGross.forEach(entry => { // Use gross transactions for full historical summary
      const monthYear = getCurrentMonthString(new Date(entry.tanggal));
      if (!summaryMap[monthYear]) {
        summaryMap[monthYear] = 0;
      }
      summaryMap[monthYear] += entry.nominal;
    });

    const sortedSummaryKeys = Object.keys(summaryMap).sort((a,b) => {
      const [monthA, yearA] = a.split(' ');
      const [monthB, yearB] = b.split(' ');
      const dateA = new Date(Date.parse(`${monthA} 1, ${yearA}`));
      const dateB = new Date(Date.parse(`${monthB} 1, ${yearB}`));
      return dateA.getTime() - dateB.getTime();
    }).reverse();

    return sortedSummaryKeys.map(key => ({
      month: key,
      totalRevenue: summaryMap[key],
    }));
  }, [allVoucherTransactionsGross]);

  const handleWithdrawVoucherRevenue = () => {
    if (totalVoucherRevenueAvailable <= 0) {
      Swal.fire({
        title: 'Tidak ada saldo',
        text: 'Tidak ada pendapatan voucher yang tersedia untuk ditarik pada bulan ini.',
        icon: 'info',
        customClass: { popup: '!bg-gray-800 !text-white', title: '!text-white' }
      });
      return;
    }

    Swal.fire({
      title: 'Konfirmasi Penarikan Saldo',
      html: `Anda akan menarik saldo pendapatan voucher sebesar <strong>Rp ${totalVoucherRevenueAvailable.toLocaleString('id-ID')}</strong> untuk bulan <strong>${selectedMonth}</strong>.
             <br><br>Ini akan dicatat sebagai pemasukan umum dan pendapatan voucher individual bulan ini akan dikonsolidasi. Lanjutkan?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Ya, Tarik Saldo!',
      cancelButtonText: 'Batal',
      customClass: {
          popup: '!bg-gray-800 !text-white !rounded-lg',
          title: '!text-white',
          htmlContainer: '!text-gray-300',
          confirmButton: '!bg-blue-600 hover:!bg-blue-700',
          cancelButton: '!bg-gray-600 hover:!bg-gray-700',
      },
    }).then((result: any) => {
      if (result.isConfirmed) {
        // Create a new finance entry for the withdrawal
        const withdrawalEntry: FinanceEntry = {
          id: Date.now(),
          deskripsi: `Penarikan Saldo Voucher - ${selectedMonth}`,
          tanggal: new Date().toISOString().split('T')[0],
          kategori: 'Pemasukan',
          metode: 'Transfer', // Default to Transfer for internal consolidation
          nominal: totalVoucherRevenueAvailable,
          isConsolidated: false, // This new entry itself is not a voucher detail
        };

        // Update existing voucher entries for the selected month to be consolidated
        const updatedFinanceHistory = financeHistory.map(entry => {
          const entryMonthYear = getCurrentMonthString(new Date(entry.tanggal));
          if (
            entry.kategori === 'Pemasukan' &&
            entry.deskripsi.toLowerCase().includes('voucher') &&
            entryMonthYear === selectedMonth &&
            entry.isConsolidated !== true // Only mark unconsolidated ones
          ) {
            return { ...entry, isConsolidated: true };
          }
          return entry;
        });

        // Add the new withdrawal entry and update the history
        setFinanceHistory([...updatedFinanceHistory, withdrawalEntry]);
        onVoucherWithdrawal(withdrawalEntry); // Notify Dashboard of this new income

        Swal.fire({
          title: 'Berhasil!',
          text: `Saldo pendapatan voucher sebesar Rp ${totalVoucherRevenueAvailable.toLocaleString('id-ID')} untuk bulan ${selectedMonth} telah ditarik dan dicatat.`,
          icon: 'success',
          customClass: { popup: '!bg-gray-800 !text-white', title: '!text-white' }
        });
      }
    });
  };


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

      <main className="flex-grow flex flex-col bg-black/20 rounded-lg p-4 sm:p-8 space-y-8">
        
        {/* Header Stats and Month Filter */}
        <div className="bg-gradient-to-r from-purple-900/50 to-pink-900/50 p-6 rounded-lg text-center border border-purple-500/30 flex flex-col sm:flex-row justify-between items-center gap-4">
            <div>
              <h2 className="text-xl text-purple-200 font-semibold mb-2">Total Pendapatan Voucher Tersedia ({selectedMonth})</h2>
              <p className="text-4xl font-bold text-white">Rp {totalVoucherRevenueAvailable.toLocaleString('id-ID')}</p>
            </div>
            <div className="flex-shrink-0 w-full sm:w-auto flex flex-col sm:flex-row gap-2">
              <label htmlFor="monthFilter" className="sr-only">Filter Bulan</label>
              <select
                id="monthFilter"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="px-4 py-2 rounded-lg bg-gray-700/50 border border-gray-600 text-white focus:outline-none focus:ring-2 focus:ring-purple-400 w-full sm:w-48"
              >
                {availableMonths.map(month => (
                  <option key={month} value={month}>{month}</option>
                ))}
              </select>
              <button
                onClick={handleWithdrawVoucherRevenue}
                disabled={totalVoucherRevenueAvailable <= 0}
                className="py-2 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-purple-500 transition-colors disabled:bg-gray-500 disabled:cursor-not-allowed w-full sm:w-auto"
              >
                Tarik Saldo
              </button>
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Input Form */}
            <div className="lg:col-span-1 bg-white/5 p-6 rounded-lg h-fit">
                <h3 className="text-xl font-semibold mb-6 text-sky-400">
                    {editingId ? 'Edit Penjualan Voucher' : 'Input Penjualan Voucher'}
                </h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Tanggal</label>
                        <input
                            type="date"
                            value={tanggal}
                            onChange={(e) => setTanggal(e.target.value)}
                            required
                            className="w-full input-style"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Jenis Voucher</label>
                        <select
                            value={voucherType}
                            onChange={(e) => setVoucherType(e.target.value)}
                            className="w-full input-style bg-gray-800"
                        >
                            {voucherOptions.map(opt => (
                                <option key={opt} value={opt}>{opt}</option>
                            ))}
                        </select>
                    </div>
                    
                    {voucherType === 'Lainnya' && (
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">Nama Voucher Custom</label>
                            <input
                                type="text"
                                value={customType}
                                onChange={(e) => setCustomType(e.target.value)}
                                placeholder="Contoh: Voucher Gaming"
                                required
                                className="w-full input-style"
                            />
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">Jumlah (Qty)</label>
                            <input
                                type="number"
                                value={quantity}
                                onChange={(e) => setQuantity(e.target.value)}
                                placeholder="0"
                                required
                                className="w-full input-style"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">Harga Satuan</label>
                            <input
                                type="number"
                                value={pricePerUnit}
                                onChange={(e) => setPricePerUnit(e.target.value)}
                                placeholder="0"
                                required
                                className="w-full input-style"
                            />
                        </div>
                    </div>

                    <div className="pt-2">
                        <div className="flex justify-between items-center mb-2 text-sm text-gray-400">
                            <span>Total Estimasi:</span>
                            <span className="text-white font-bold text-lg">
                                Rp {((Number(quantity) || 0) * (Number(pricePerUnit) || 0)).toLocaleString('id-ID')}
                            </span>
                        </div>
                        <button
                            type="submit"
                            className={`w-full py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 transition-transform transform hover:scale-105 ${
                                editingId 
                                ? 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500' 
                                : 'bg-purple-600 hover:bg-purple-700 focus:ring-purple-500'
                            }`}
                        >
                            {editingId ? 'Update Penjualan' : 'Simpan Penjualan'}
                        </button>
                        {editingId && (
                             <button
                                type="button"
                                onClick={resetForm}
                                className="w-full mt-3 py-2 px-4 border border-gray-500 rounded-lg shadow-sm text-sm font-medium text-white hover:bg-gray-700/50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-gray-500 transition-colors"
                            >
                                Batal Edit
                            </button>
                        )}
                    </div>
                </form>
            </div>

            {/* History Table */}
            <div className="lg:col-span-2 bg-white/5 p-6 rounded-lg">
                <h3 className="text-xl font-semibold mb-6 text-sky-400">Riwayat Penjualan Voucher Tersedia ({selectedMonth})</h3>
                {filteredVoucherHistory.length === 0 ? (
                    <p className="text-center text-gray-400 py-8">Tidak ada data penjualan voucher yang tersedia untuk bulan ini.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-sm text-left text-gray-300">
                            <thead className="text-xs text-white uppercase bg-white/10">
                                <tr>
                                    <th className="px-4 py-3">Tanggal</th>
                                    <th className="px-4 py-3">Keterangan</th>
                                    <th className="px-4 py-3 text-right">Nominal</th>
                                    <th className="px-4 py-3 text-center">Aksi</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredVoucherHistory.map((entry) => (
                                    <tr key={entry.id} className="border-b border-gray-700 hover:bg-white/5">
                                        <td className="px-4 py-3">{new Date(entry.tanggal).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                                        <td className="px-4 py-3 font-medium text-white">{entry.deskripsi}</td>
                                        <td className="px-4 py-3 text-right font-bold text-green-400">
                                            + Rp {entry.nominal.toLocaleString('id-ID')}
                                        </td>
                                        <td className="px-4 py-3 text-center space-x-2">
                                            <button 
                                                onClick={() => handleStartEdit(entry)} 
                                                className="font-medium text-blue-400 hover:text-blue-300 transition-colors text-xs py-1 px-2 rounded bg-blue-500/10 hover:bg-blue-500/20"
                                            >
                                                Edit
                                            </button>
                                            <button 
                                                onClick={() => handleDelete(entry.id)} 
                                                className="font-medium text-red-400 hover:text-red-300 transition-colors text-xs py-1 px-2 rounded bg-red-500/10 hover:bg-red-500/20"
                                            >
                                                Hapus
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>

        {/* Monthly Summary Section (Gross History) */}
        <div className="bg-white/5 p-6 rounded-lg">
          <h3 className="text-xl font-semibold mb-6 text-sky-400">Rekapitulasi Pendapatan Voucher Bulanan (Histori Bruto)</h3>
          {monthlyVoucherSummary.length === 0 ? (
            <p className="text-center text-gray-400 py-8">Belum ada rekapitulasi pendapatan voucher bulanan.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm text-left text-gray-300">
                <thead className="text-xs text-white uppercase bg-white/10">
                  <tr>
                    <th className="px-4 py-3">Bulan</th>
                    <th className="px-4 py-3 text-right">Total Pendapatan (Rp)</th>
                  </tr>
                </thead>
                <tbody>
                  {monthlyVoucherSummary.map((summary) => (
                    <tr key={summary.month} className="border-b border-gray-700 hover:bg-white/5">
                      <td className="px-4 py-3 font-medium text-white">{summary.month}</td>
                      <td className="px-4 py-3 text-right font-bold text-green-400">
                        Rp {summary.totalRevenue.toLocaleString('id-ID')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </main>
      <style>{`
            .input-style {
                background-color: rgba(255, 255, 255, 0.1);
                border: 1px solid #4b5563;
                border-radius: 0.5rem;
                padding: 0.5rem 0.75rem;
                color: white;
                width: 100%;
                transition: border-color 0.2s, box-shadow 0.2s;
            }
            .input-style:focus {
                outline: none;
                box-shadow: 0 0 0 2px #a855f7;
                border-color: #a855f7;
            }
            input[type=number]::-webkit-inner-spin-button, 
            input[type=number]::-webkit-outer-spin-button { 
              -webkit-appearance: none; 
              margin: 0; 
            }
        `}</style>
    </div>
  );
};

export default VoucherPage;