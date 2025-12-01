
import React, { useState, useMemo } from 'react';
import ArrowLeftIcon from './icons/ArrowLeftIcon';
import DownloadIcon from './icons/DownloadIcon';

// Declare jsPDF from CDN. The autoTable plugin will extend the jsPDF instance.
declare const jspdf: any;
declare const Swal: any;

// FIX: Define and export ProfitShare here to break circular dependency
export interface ProfitShare {
  nama: string;
  jumlah: number;
}

interface FinanceEntry {
  id: number;
  deskripsi: string;
  tanggal: string;
  kategori: string;
  metode: string;
  nominal: number;
}

interface CompanyInfo {
    name: string;
    address: string;
    phone: string;
    logo: string | null;
    stampLogo: string | null; // Added stampLogo
}

interface LaporanBulananPageProps {
  onBack: () => void;
  financeHistory: FinanceEntry[];
  companyInfo: CompanyInfo;
  profitSharingData: ProfitShare[];
  setFinanceHistory: React.Dispatch<React.SetStateAction<FinanceEntry[]>>;
  setProfitSharingData: React.Dispatch<React.SetStateAction<ProfitShare[]>>;
  kasCadangan: number;
  onProfitShareProcessed: (details: { total: number; members: number }) => void;
}

const LaporanBulananPage: React.FC<LaporanBulananPageProps> = ({ onBack, financeHistory, companyInfo, profitSharingData, setFinanceHistory, setProfitSharingData, kasCadangan, onProfitShareProcessed }) => {
  const [members, setMembers] = useState<string[]>([]);
  const [newMemberName, setNewMemberName] = useState('');

  const generateReport = () => {
    const report: { [key: string]: { pemasukan: number; pengeluaran: number } } = {};

    financeHistory.forEach(entry => {
      // Group by YYYY-MM for easy sorting
      const monthYearKey = entry.tanggal.substring(0, 7); // "YYYY-MM"

      if (!report[monthYearKey]) {
        report[monthYearKey] = { pemasukan: 0, pengeluaran: 0 };
      }

      if (entry.kategori === 'Pemasukan') {
        report[monthYearKey].pemasukan += entry.nominal;
      } else if (entry.kategori === 'Pengeluaran') {
        report[monthYearKey].pengeluaran += entry.nominal;
      }
    });

    // Sort keys chronologically (descending)
    const sortedKeys = Object.keys(report).sort().reverse();

    // Map to final format with display-friendly month name
    return sortedKeys.map(key => {
      const [year, month] = key.split('-').map(Number);
      const date = new Date(Date.UTC(year, month - 1, 1));
      const displayMonth = date.toLocaleString('id-ID', { month: 'long', year: 'numeric', timeZone: 'UTC' });

      return {
        month: displayMonth,
        ...report[key],
      };
    });
  };
  
  const saldoAkhir = useMemo(() => {
    const totalPemasukan = financeHistory
      .filter(e => e.kategori === 'Pemasukan')
      .reduce((acc, e) => acc + e.nominal, 0);

    const totalPengeluaran = financeHistory
      .filter(e => e.kategori === 'Pengeluaran')
      .reduce((acc, e) => acc + e.nominal, 0);

    return totalPemasukan - totalPengeluaran;
  }, [financeHistory]);

  const handleAddMember = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (newMemberName.trim() && !members.includes(newMemberName.trim())) {
      setMembers([...members, newMemberName.trim()]);
      setNewMemberName('');
    }
  };

  const handleRemoveMember = (nameToRemove: string) => {
    setMembers(members.filter(member => member !== nameToRemove));
  };

  const handleProcessProfitSharing = () => {
     if (saldoAkhir <= 0) {
      Swal.fire('Gagal', 'Saldo tidak mencukupi untuk bagi hasil.', 'error');
      return;
    }
    if (members.length === 0) {
      Swal.fire('Gagal', 'Silakan tambahkan minimal satu anggota untuk bagi hasil.', 'error');
      return;
    }
    
    const sharePerMember = saldoAkhir / members.length;

    Swal.fire({
      title: 'Konfirmasi Bagi Hasil',
      html: `
        <div class="text-left text-gray-300">
            <p>Total saldo sebesar <strong>Rp ${saldoAkhir.toLocaleString('id-ID')}</strong> akan dibagikan kepada <strong>${members.length} anggota</strong>.</p>
            <p class="mt-2">Setiap anggota akan menerima sekitar <strong>Rp ${sharePerMember.toLocaleString('id-ID')}</strong>.</p>
            <p class="mt-4 text-yellow-400">Tindakan ini akan mencatat pengeluaran baru sebesar total saldo dan mengosongkan saldo akhir. Lanjutkan?</p>
        </div>
      `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Ya, Proses!',
      cancelButtonText: 'Batal',
      customClass: {
          popup: '!bg-gray-800 !text-white !rounded-lg',
          title: '!text-white',
          confirmButton: '!bg-blue-600 hover:!bg-blue-700',
          cancelButton: '!bg-gray-600 hover:!bg-gray-700',
      },
    }).then((result: any) => {
        if (result.isConfirmed) {
            const newProfitSharingData = members.map(member => ({
                nama: member,
                jumlah: sharePerMember,
            }));
            setProfitSharingData(newProfitSharingData);

            const newExpenseEntry: FinanceEntry = {
                id: Date.now(),
                deskripsi: `Bagi Hasil kepada ${members.length} anggota`,
                tanggal: new Date().toISOString().split('T')[0],
                kategori: 'Pengeluaran',
                metode: 'Transfer',
                nominal: saldoAkhir,
            };
            setFinanceHistory(prev => [...prev, newExpenseEntry]);
            onProfitShareProcessed({ total: saldoAkhir, members: members.length });

            setMembers([]);

            Swal.fire({
                title: 'Berhasil!',
                text: 'Proses bagi hasil telah selesai dan dicatat sebagai pengeluaran.',
                icon: 'success',
                customClass: {
                    popup: '!bg-gray-800 !text-white !rounded-lg',
                    title: '!text-white',
                    confirmButton: '!bg-blue-600 hover:!bg-blue-700',
                }
            });
        }
    })
  };


  const monthlyData = generateReport();

  const handleDownloadPDF = () => {
    const { jsPDF } = jspdf;
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // --- COLORS ---
    const primaryColor = [37, 99, 235]; // Blue 600
    const lightBgColor = [243, 244, 246]; // Gray 100
    const accentGreen = [22, 163, 74]; // Green 600
    const accentRed = [220, 38, 38]; // Red 600

    // --- CALCULATE SUMMARY TOTALS FIRST ---
    const pemasukanTunai = financeHistory.filter(e => e.kategori === 'Pemasukan' && e.metode === 'Tunai').reduce((sum, e) => sum + e.nominal, 0);
    const pemasukanTransfer = financeHistory.filter(e => e.kategori === 'Pemasukan' && e.metode === 'Transfer').reduce((sum, e) => sum + e.nominal, 0);
    const totalPemasukan = pemasukanTunai + pemasukanTransfer;
    
    const pengeluaranTunai = financeHistory.filter(e => e.kategori === 'Pengeluaran' && e.metode === 'Tunai').reduce((sum, e) => sum + e.nominal, 0);
    const pengeluaranTransfer = financeHistory.filter(e => e.kategori === 'Pengeluaran' && e.metode === 'Transfer').reduce((sum, e) => sum + e.nominal, 0);
    const totalPengeluaran = pengeluaranTunai + pengeluaranTransfer;
    
    const saldoAkhirKeseluruhan = totalPemasukan - totalPengeluaran;

    // --- HEADER SECTION ---
    let startY = 15;
    
    // Logo
    if (companyInfo.logo) {
        try {
            doc.addImage(companyInfo.logo, 'PNG', 15, startY, 20, 20);
        } catch(e) {
            console.error("Error adding logo to PDF:", e);
        }
    }

    // Company Info (Right Aligned or Left next to Logo)
    doc.setFontSize(22);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setFont('helvetica', 'bold');
    doc.text(companyInfo.name, 40, startY + 8);

    doc.setFontSize(10);
    doc.setTextColor(80, 80, 80);
    doc.setFont('helvetica', 'normal');
    doc.text(companyInfo.address, 40, startY + 14);
    doc.text(`Telp: ${companyInfo.phone}`, 40, startY + 19);

    // Separator Line
    doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setLineWidth(0.8);
    doc.line(15, startY + 25, pageWidth - 15, startY + 25);

    // Title
    let currentY = startY + 38;
    doc.setFontSize(16);
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'bold');
    doc.text('LAPORAN KEUANGAN BULANAN', pageWidth / 2, currentY, { align: 'center' });
    
    const todayStr = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Per Tanggal: ${todayStr}`, pageWidth / 2, currentY + 6, { align: 'center' });

    // --- EXECUTIVE SUMMARY CARDS ---
    currentY += 15;
    
    // Helper to draw summary box
    const drawSummaryBox = (x: number, width: number, title: string, amount: number, color: number[]) => {
        // Box Background
        doc.setFillColor(lightBgColor[0], lightBgColor[1], lightBgColor[2]);
        doc.setDrawColor(200, 200, 200);
        doc.roundedRect(x, currentY, width, 25, 3, 3, 'FD');
        
        // Left Colored Stripe
        doc.setFillColor(color[0], color[1], color[2]);
        doc.rect(x, currentY, 2, 25, 'F');

        // Text
        doc.setFontSize(9);
        doc.setTextColor(100, 100, 100);
        doc.setFont('helvetica', 'bold');
        doc.text(title, x + 6, currentY + 8);
        
        doc.setFontSize(13);
        doc.setTextColor(0, 0, 0);
        doc.text(`Rp ${amount.toLocaleString('id-ID')}`, x + 6, currentY + 18);
    };

    const boxWidth = (pageWidth - 40) / 3; // 3 boxes with spacing
    drawSummaryBox(15, boxWidth, 'TOTAL PEMASUKAN', totalPemasukan, accentGreen);
    drawSummaryBox(15 + boxWidth + 5, boxWidth, 'TOTAL PENGELUARAN', totalPengeluaran, accentRed);
    drawSummaryBox(15 + (boxWidth + 5) * 2, boxWidth, 'SALDO AKHIR', saldoAkhirKeseluruhan, primaryColor);

    currentY += 35;

    // --- TABLE 1: REKAPITULASI TOTAL (Moved Up for Visibility) ---
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text('1. Rekapitulasi & Saldo', 15, currentY);
    currentY += 2;

    const summaryTableData = [
        ['Pemasukan (Tunai)', pemasukanTunai.toLocaleString('id-ID')],
        ['Pemasukan (Transfer)', pemasukanTransfer.toLocaleString('id-ID')],
        ['Total Pemasukan', totalPemasukan.toLocaleString('id-ID')],
        ['Pengeluaran (Tunai)', pengeluaranTunai.toLocaleString('id-ID')],
        ['Pengeluaran (Transfer)', pengeluaranTransfer.toLocaleString('id-ID')],
        ['Total Pengeluaran', totalPengeluaran.toLocaleString('id-ID')],
        ['Saldo Operasional (Siap Bagi Hasil)', saldoAkhirKeseluruhan.toLocaleString('id-ID')],
        ['Kas Cadangan (Dana Darurat)', kasCadangan.toLocaleString('id-ID')],
    ];

    (doc as any).autoTable({
        startY: currentY + 3,
        head: [['Keterangan', 'Jumlah (Rp)']],
        body: summaryTableData,
        theme: 'striped',
        headStyles: { fillColor: primaryColor, halign: 'center' },
        styles: { fontSize: 10, cellPadding: 3 },
        columnStyles: {
            0: { cellWidth: 'auto' },
            1: { cellWidth: 60, halign: 'right' }
        },
        didParseCell: (data: any) => {
             if (data.section === 'body') {
                const rowIndex = data.row.index;
                // Bold Totals
                if (rowIndex === 2 || rowIndex === 5) {
                    data.cell.styles.fontStyle = 'bold';
                }
                // Saldo Operasional (Green)
                if (rowIndex === 6) {
                    data.cell.styles.fillColor = [209, 250, 229]; 
                    data.cell.styles.textColor = [6, 95, 70]; 
                    data.cell.styles.fontStyle = 'bold';
                }
                // Kas Cadangan (Blue)
                if (rowIndex === 7) {
                    data.cell.styles.fillColor = [224, 242, 254]; 
                    data.cell.styles.textColor = [7, 89, 133]; 
                    data.cell.styles.fontStyle = 'bold';
                }
             }
        }
    });

    currentY = (doc as any).lastAutoTable.finalY + 15;

    // --- TABLE 2: BULANAN (Monthly Breakdown) ---
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text('2. Ringkasan Per Bulan', 15, currentY);
    currentY += 2;

    const monthlyTableData = monthlyData.map(data => {
        const labaRugi = data.pemasukan - data.pengeluaran;
        return [
            data.month,
            data.pemasukan.toLocaleString('id-ID'),
            data.pengeluaran.toLocaleString('id-ID'),
            labaRugi.toLocaleString('id-ID')
        ];
    });

    (doc as any).autoTable({
        startY: currentY + 3,
        head: [['Bulan', 'Pemasukan', 'Pengeluaran', 'Laba / Rugi']],
        body: monthlyTableData,
        theme: 'striped',
        headStyles: { fillColor: primaryColor, halign: 'center' },
        styles: { fontSize: 10, cellPadding: 3, halign: 'right' },
        columnStyles: { 0: { halign: 'left' } }, // Month name left aligned
    });

    currentY = (doc as any).lastAutoTable.finalY + 15;

    // --- TABLE 3: PROFIT SHARING (If Exists) ---
    if (profitSharingData && profitSharingData.length > 0) {
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.text('3. Rincian Bagi Hasil', 15, currentY);
        currentY += 2;

        const profitShareTableData = profitSharingData.map(item => [
            item.nama,
            item.jumlah.toLocaleString('id-ID')
        ]);
        
        (doc as any).autoTable({
            startY: currentY + 3,
            head: [['Nama Anggota', 'Jumlah Diterima (Rp)']],
            body: profitShareTableData,
            theme: 'striped',
            headStyles: { fillColor: primaryColor },
            styles: { fontSize: 10, cellPadding: 3 },
            columnStyles: { 1: { halign: 'right' } }
        });
        currentY = (doc as any).lastAutoTable.finalY + 15;
    }

    // --- TABLE 4: DETAILED HISTORY (Optional/Last) ---
    if (financeHistory.length > 0) {
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.text('4. Rincian Transaksi Terakhir', 15, currentY);
        currentY += 2;

        const sortedHistory = [...financeHistory].sort((a, b) => new Date(a.tanggal).getTime() - new Date(b.tanggal).getTime());
        // Limit to reasonable amount if needed, or show all. Let's show all but careful with pages.
        
        const historyTableData = sortedHistory.map(entry => {
            const formattedDate = new Date(entry.tanggal).toLocaleDateString('id-ID', {
                timeZone: 'UTC', day: '2-digit', month: 'short', year: 'numeric'
            });
            // Symbol for visualization
            const symbol = entry.kategori === 'Pemasukan' ? '+' : '-';
            return [
                formattedDate, 
                entry.deskripsi, 
                entry.kategori, 
                symbol + ' ' + entry.nominal.toLocaleString('id-ID')
            ];
        });

        (doc as any).autoTable({
            startY: currentY + 3,
            head: [['Tanggal', 'Deskripsi', 'Kategori', 'Nominal (Rp)']],
            body: historyTableData,
            theme: 'striped',
            headStyles: { fillColor: [75, 85, 99] }, // Dark gray for detailed list to differentiate
            styles: { fontSize: 8, cellPadding: 2 },
            columnStyles: { 
                0: { cellWidth: 25 },
                1: { cellWidth: 'auto' },
                2: { cellWidth: 25 },
                3: { cellWidth: 35, halign: 'right' }
            },
            didParseCell: (data: any) => {
                // Color text based on category
                if (data.section === 'body' && data.column.index === 3) {
                    const rawVal = data.row.raw[2]; // Kategori
                    if (rawVal === 'Pemasukan') data.cell.styles.textColor = accentGreen;
                    else data.cell.styles.textColor = accentRed;
                }
            }
        });
        currentY = (doc as any).lastAutoTable.finalY;
    }

    // --- SIGNATURE SECTION ---
    // Ensure we don't fall off the page
    if (currentY > 240) {
        doc.addPage();
        currentY = 20;
    } else {
        currentY += 25;
    }

    const signatureX = pageWidth - 70;
    
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');
    doc.text(`Jakarta, ${todayStr}`, signatureX, currentY);
    doc.text('Direktur', signatureX, currentY + 5);
    
    // Stamp Logic
    if (companyInfo.stampLogo) {
        try {
            doc.addImage(companyInfo.stampLogo, 'PNG', signatureX + 5, currentY + 8, 25, 25); 
        } catch(e) {
            console.error("Error adding stamp logo to PDF:", e);
        }
    }

    doc.text('(___________________)', signatureX, currentY + 25);
    doc.setFont('helvetica', 'bold');
    doc.text(companyInfo.name, signatureX, currentY + 30);

    doc.save('laporan_keuangan_bulanan.pdf');
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
      
      <main className="flex-grow flex flex-col bg-black/20 rounded-lg p-6 sm:p-8 space-y-12">
        {/* Monthly Report Section */}
        <div>
          <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
              <h2 className="text-3xl font-semibold">Rekap Laporan Bulanan</h2>
              <button
                  onClick={handleDownloadPDF}
                  disabled={monthlyData.length === 0}
                  className="flex items-center gap-2 py-2 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-green-500 transition-colors disabled:bg-gray-500 disabled:cursor-not-allowed"
                  aria-label="Unduh Laporan sebagai PDF"
              >
                  <DownloadIcon className="w-5 h-5"/>
                  <span>Unduh PDF</span>
              </button>
          </div>
          
          {monthlyData.length === 0 ? (
            <div className="text-center text-gray-400 mt-8">
              <p>Belum ada data transaksi untuk ditampilkan.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {monthlyData.map(data => {
                const labaRugi = data.pemasukan - data.pengeluaran;
                return (
                  <div key={data.month} className="bg-white/5 p-6 rounded-lg shadow-lg flex flex-col">
                    <h3 className="text-xl font-bold text-sky-300 mb-4">{data.month}</h3>
                    <div className="space-y-3 flex-grow">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400">Total Pemasukan:</span>
                        <span className="font-semibold text-green-400">
                          Rp {data.pemasukan.toLocaleString('id-ID')}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400">Total Pengeluaran:</span>
                        <span className="font-semibold text-red-400">
                          Rp {data.pengeluaran.toLocaleString('id-ID')}
                        </span>
                      </div>
                    </div>
                    <hr className="border-gray-700 my-4"/>
                    <div className="flex justify-between items-center mt-auto">
                      <span className="font-bold text-gray-300">Laba / Rugi:</span>
                      <span className={`text-lg font-bold ${labaRugi >= 0 ? 'text-white' : 'text-red-400'}`}>
                        Rp {labaRugi.toLocaleString('id-ID')}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Profit Sharing Section */}
        <div>
           <h2 className="text-3xl font-semibold mb-6 text-center">Formulir Bagi Hasil</h2>
        
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 mb-8">
                <div className="bg-sky-500/10 p-4 rounded-lg text-center">
                    <p className="text-sm text-sky-400 font-semibold">Saldo Akhir Tersedia untuk Dibagi</p>
                    <p className={`text-3xl font-bold ${saldoAkhir >= 0 ? 'text-white' : 'text-red-400'}`}>
                      Rp {saldoAkhir.toLocaleString('id-ID')}
                    </p>
                </div>
                 <div className="bg-slate-500/10 p-4 rounded-lg text-center">
                    <p className="text-sm text-slate-400 font-semibold">Kas Cadangan Tersimpan</p>
                    <p className="text-3xl font-bold text-white">
                      Rp {kasCadangan.toLocaleString('id-ID')}
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-white/5 p-6 rounded-lg">
                    <h3 className="text-xl font-semibold mb-4">Daftar Anggota</h3>
                    <form onSubmit={handleAddMember} className="flex gap-2 mb-4">
                        <input
                            type="text"
                            value={newMemberName}
                            onChange={(e) => setNewMemberName(e.target.value)}
                            placeholder="Masukkan nama anggota"
                            className="flex-grow pl-4 pr-3 py-2 text-white bg-white/10 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-blue-400 focus:outline-none transition duration-300 placeholder-gray-400"
                        />
                        <button type="submit" className="py-2 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700">
                            Tambah
                        </button>
                    </form>

                    <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                        {members.length > 0 ? members.map(member => (
                            <div key={member} className="flex justify-between items-center bg-gray-700/50 p-2 rounded">
                                <span className="text-gray-200">{member}</span>
                                <button onClick={() => handleRemoveMember(member)} className="text-red-400 hover:text-red-300 text-xs font-bold">
                                    HAPUS
                                </button>
                            </div>
                        )) : (
                            <p className="text-gray-400 text-center py-4">Belum ada anggota yang ditambahkan.</p>
                        )}
                    </div>
                </div>

                <div className="bg-white/5 p-6 rounded-lg flex flex-col justify-center">
                     <h3 className="text-xl font-semibold mb-4">Estimasi Pembagian</h3>
                     <div className="space-y-3 flex-grow">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-400">Total Anggota:</span>
                          <span className="font-semibold text-white text-lg">{members.length}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-400">Jumlah per Anggota:</span>
                          <span className="font-semibold text-green-400 text-lg">
                            Rp {(members.length > 0 ? saldoAkhir / members.length : 0).toLocaleString('id-ID', { maximumFractionDigits: 0 })}
                          </span>
                        </div>
                     </div>
                     <button
                        onClick={handleProcessProfitSharing}
                        disabled={saldoAkhir <= 0 || members.length === 0}
                        className="w-full mt-6 py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-green-500 transition-transform transform hover:scale-105 disabled:bg-gray-500 disabled:cursor-not-allowed disabled:transform-none"
                     >
                        Estimasi & Proses Bagi Hasil
                     </button>
                </div>
            </div>
        </div>
      </main>
    </div>
  );
};

export default LaporanBulananPage;
