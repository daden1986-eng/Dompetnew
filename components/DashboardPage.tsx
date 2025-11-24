
import React, { useState, useEffect, useMemo } from 'react';
import SirekapPage from './SirekapPage';
import LaporanBulananPage from './LaporanBulananPage';
import InvoicePage, { InvoiceInitialData } from './InvoicePage';
import KasCadanganPage from './KasCadanganPage'; // Import the new component
// FIX: Import ProfitShare to break circular dependency
import { ProfitShare } from './LaporanBulananPage';
import * as Recharts from 'recharts';
import SettingsIcon from './icons/SettingsIcon';

// Declare Swal to inform TypeScript about the global variable from the CDN script
declare const Swal: any;

// Destructure components from the Recharts namespace
const { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ComposedChart, Line } = Recharts;


interface DashboardPageProps {
  onLogout: () => void;
  username: string;
  companyInfo: CompanyInfo;
  setCompanyInfo: React.Dispatch<React.SetStateAction<CompanyInfo>>;
}

// Interfaces moved from SirekapPage
interface Customer {
  id: number;
  nama: string;
  noHp: string;
  jenisLangganan: string;
  alamat: string;
  harga: string;
  status: 'Lunas' | 'Belum Lunas';
  tunggakan: number;
}

interface FinanceEntry {
  id: number;
  deskripsi: string;
  tanggal: string;
  kategori: string;
  metode: string;
  nominal: number;
}

export interface CompanyInfo {
    name: string;
    address: string;
    phone: string;
    logo: string | null;
    telegramBotToken: string;
    telegramChatId: string;
    namaBank: string;
    nomorRekening: string;
    atasNama: string;
}

const DashboardPage: React.FC<DashboardPageProps> = ({ onLogout, username, companyInfo, setCompanyInfo }) => {
  const [activePage, setActivePage] = useState<'dashboard' | 'sirekap' | 'laporan' | 'invoice' | 'kasCadangan'>('dashboard');
  const [invoiceInitialData, setInvoiceInitialData] = useState<InvoiceInitialData | null>(null);

  const [customers, setCustomers] = useState<Customer[]>(() => {
    try {
        const saved = localStorage.getItem('sidompet_customers');
        return saved ? JSON.parse(saved) : [];
    } catch (e) {
        console.error("Gagal memuat data pelanggan dari penyimpanan:", e);
        return [];
    }
  });

  useEffect(() => {
    try {
        localStorage.setItem('sidompet_customers', JSON.stringify(customers));
    } catch (e) {
        console.error("Gagal menyimpan data pelanggan:", e);
    }
  }, [customers]);

  const [financeHistory, setFinanceHistory] = useState<FinanceEntry[]>(() => {
      try {
          const saved = localStorage.getItem('sidompet_financeHistory');
          return saved ? JSON.parse(saved) : [];
      } catch (e) {
          console.error("Gagal memuat riwayat keuangan dari penyimpanan:", e);
          return [];
      }
  });

  useEffect(() => {
      try {
          localStorage.setItem('sidompet_financeHistory', JSON.stringify(financeHistory));
      } catch (e) {
          console.error("Gagal menyimpan riwayat keuangan:", e);
      }
  }, [financeHistory]);

  const [profitSharingData, setProfitSharingData] = useState<ProfitShare[]>(() => {
    try {
        const saved = localStorage.getItem('sidompet_profitSharing');
        return saved ? JSON.parse(saved) : [];
    } catch (e) {
        console.error("Gagal memuat data bagi hasil dari penyimpanan:", e);
        return [];
    }
  });

  useEffect(() => {
      try {
          localStorage.setItem('sidompet_profitSharing', JSON.stringify(profitSharingData));
      } catch (e) {
          console.error("Gagal menyimpan data bagi hasil:", e);
      }
  }, [profitSharingData]);
    
  const [kasCadangan, setKasCadangan] = useState<number>(() => {
    try {
        const saved = localStorage.getItem('sidompet_kasCadangan');
        return saved ? JSON.parse(saved) : 0;
    } catch (e) {
        console.error("Gagal memuat kas cadangan dari penyimpanan:", e);
        return 0;
    }
  });

  useEffect(() => {
    try {
        localStorage.setItem('sidompet_kasCadangan', JSON.stringify(kasCadangan));
    } catch (e) {
        console.error("Gagal menyimpan kas cadangan:", e);
    }
  }, [kasCadangan]);
    
  const saldoAkhir = useMemo(() => {
    const totalPemasukan = financeHistory.filter(e => e.kategori === 'Pemasukan').reduce((acc, e) => acc + e.nominal, 0);
    const totalPengeluaran = financeHistory.filter(e => e.kategori === 'Pengeluaran').reduce((acc, e) => acc + e.nominal, 0);
    return totalPemasukan - totalPengeluaran;
  }, [financeHistory]);

  // --- START NOTIFICATION LOGIC ---
  const generateBalanceSummary = (): string => {
    const pemasukanTunai = financeHistory.filter(e => e.kategori === 'Pemasukan' && e.metode === 'Tunai').reduce((acc, e) => acc + e.nominal, 0);
    const pemasukanTransfer = financeHistory.filter(e => e.kategori === 'Pemasukan' && e.metode === 'Transfer').reduce((acc, e) => acc + e.nominal, 0);
    const pengeluaranTunai = financeHistory.filter(e => e.kategori === 'Pengeluaran' && e.metode === 'Tunai').reduce((acc, e) => acc + e.nominal, 0);
    const pengeluaranTransfer = financeHistory.filter(e => e.kategori === 'Pengeluaran' && e.metode === 'Transfer').reduce((acc, e) => acc + e.nominal, 0);
    
    const saldoTunai = pemasukanTunai - pengeluaranTunai;
    const saldoTransfer = pemasukanTransfer - pengeluaranTransfer;

    return `
---
*Saldo Saat Ini:*
- Tunai: Rp ${saldoTunai.toLocaleString('id-ID')}
- Transfer: Rp ${saldoTransfer.toLocaleString('id-ID')}
*Total Saldo Akhir: Rp ${saldoAkhir.toLocaleString('id-ID')}*
*Kas Cadangan: Rp ${kasCadangan.toLocaleString('id-ID')}*
    `;
  };

  const sendTelegramNotification = async (message: string) => {
    if (!companyInfo.telegramBotToken || !companyInfo.telegramChatId) {
        console.log("Telegram bot not configured. Skipping notification.");
        return;
    }
    const url = `https://api.telegram.org/bot${companyInfo.telegramBotToken}/sendMessage`;
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: companyInfo.telegramChatId,
                text: message,
                parse_mode: 'Markdown'
            })
        });
        if (!response.ok) {
            const errorBody = await response.json();
            throw new Error(`Telegram API request failed: ${errorBody.description}`);
        }
        console.log('Telegram notification sent successfully.');
    } catch (error) {
        console.error('Failed to send Telegram notification:', error);
    }
  };

  const handleActivityNotification = (title: string, details: string) => {
    const balanceSummary = generateBalanceSummary();
    const message = `🔔 *${title}*\n\n${details}\n${balanceSummary}`;
    sendTelegramNotification(message);
  };
  
  const handlePaymentSuccessNotification = (customer: Customer, amount: number) => {
    const title = 'Pembayaran Diterima';
    const details = `Pembayaran dari *${customer.nama}* sebesar *Rp ${amount.toLocaleString('id-ID')}* telah berhasil dicatat.`;
    handleActivityNotification(title, details);
  };
  
  const handleNewCustomerNotification = (customer: Customer) => {
    const title = 'Pelanggan Baru Ditambahkan';
    const details = `Pelanggan baru *${customer.nama}* dengan No. HP *${customer.noHp}* dan tagihan *Rp ${Number(customer.harga).toLocaleString('id-ID')}* telah ditambahkan.`;
    handleActivityNotification(title, details);
  };
  
  const handleNewFinanceEntryNotification = (entry: FinanceEntry) => {
    const title = 'Transaksi Baru Dicatat';
    const verb = entry.kategori === 'Pemasukan' ? 'Pemasukan' : 'Pengeluaran';
    const details = `${verb} baru dicatat:\n*Deskripsi:* ${entry.deskripsi}\n*Nominal:* Rp ${entry.nominal.toLocaleString('id-ID')}\n*Metode:* ${entry.metode}`;
    handleActivityNotification(title, details);
  };
  
  const handleProfitShareNotification = (details: { total: number; members: number }) => {
    const title = 'Bagi Hasil Diproses';
    const detailText = `Bagi hasil sebesar *Rp ${details.total.toLocaleString('id-ID')}* telah diproses dan dibagikan kepada *${details.members} anggota*.`;
    handleActivityNotification(title, detailText);
  };
  
  const handleKasCadanganNotification = (type: 'add' | 'use', amount: number) => {
    const title = 'Update Kas Cadangan';
    const details = type === 'add'
        ? `Dana sebesar *Rp ${amount.toLocaleString('id-ID')}* telah *ditambahkan* ke Kas Cadangan.`
        : `Dana sebesar *Rp ${amount.toLocaleString('id-ID')}* telah *ditarik* dari Kas Cadangan.`;
    handleActivityNotification(title, details);
  };
  // --- END NOTIFICATION LOGIC ---
    
  const handleBackup = (type: 'all' | 'data') => {
    let backupData: any = {};
    let fileName = `sidompet_backup_${type}`;

    if (type === 'all') {
        backupData = {
            companyInfo,
            customers,
            financeHistory,
            kasCadangan, // Add kasCadangan to backup
        };
    } else {
        backupData = {
            customers,
            financeHistory,
            kasCadangan, // Add kasCadangan to backup
        };
    }

    const jsonString = JSON.stringify(backupData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const date = new Date().toISOString().split('T')[0];
    link.download = `${fileName}_${date}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    Swal.fire({
        title: 'Backup Berhasil',
        html: `File <strong>${link.download}</strong> telah diunduh dan akan tersimpan di folder 'Downloads' browser Anda.`,
        icon: 'success',
        customClass: {
            popup: '!bg-gray-800 !text-white !rounded-lg',
            title: '!text-white',
            htmlContainer: '!text-gray-300',
            confirmButton: '!bg-blue-600 hover:!bg-blue-700',
        }
    });
  };
    
  const handleRestore = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const text = e.target?.result as string;
            const parsedData = JSON.parse(text);

            if (!parsedData.customers || !parsedData.financeHistory) {
                throw new Error('File backup tidak valid: data pelanggan atau transaksi tidak ditemukan.');
            }

            Swal.fire({
                title: 'Konfirmasi Restore Data',
                text: "Anda yakin ingin menimpa semua data saat ini dengan data dari file backup? Tindakan ini tidak dapat diurungkan.",
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#d33',
                cancelButtonColor: '#3085d6',
                confirmButtonText: 'Ya, restore!',
                cancelButtonText: 'Batal',
                customClass: {
                    popup: '!bg-gray-800 !text-white !rounded-lg',
                    title: '!text-white',
                    confirmButton: '!bg-red-600 hover:!bg-red-700',
                    cancelButton: '!bg-gray-600 hover:!bg-gray-700',
                },
            }).then((result: any) => {
                if (result.isConfirmed) {
                    if (parsedData.companyInfo) {
                        setCompanyInfo(parsedData.companyInfo);
                    }
                    setCustomers(parsedData.customers);
                    setFinanceHistory(parsedData.financeHistory);
                    if (parsedData.kasCadangan) {
                        setKasCadangan(parsedData.kasCadangan);
                    }
                    
                    Swal.fire({
                        title: 'Restore Berhasil!',
                        text: 'Data telah berhasil dipulihkan dari file backup.',
                        icon: 'success',
                        customClass: {
                          popup: '!bg-gray-800 !text-white !rounded-lg',
                          title: '!text-white',
                          confirmButton: '!bg-blue-600 hover:!bg-blue-700',
                        }
                    });
                }
            });
        } catch (error: any) {
            Swal.fire({
                title: 'Restore Gagal',
                text: `Terjadi kesalahan saat membaca file backup: ${error.message}`,
                icon: 'error',
                customClass: {
                    popup: '!bg-gray-800 !text-white !rounded-lg',
                    title: '!text-white',
                    confirmButton: '!bg-red-600 hover:!bg-red-700',
                },
            });
        } finally {
            // Reset the file input so the same file can be selected again
            event.target.value = '';
        }
    };
    reader.readAsText(file);
  }

  const handleSettingsClick = () => {
    Swal.fire({
      title: 'Pengaturan Aplikasi',
      html: `
        <div class="text-left space-y-4 p-4 text-gray-300">
          <h3 class="text-lg font-semibold text-sky-400 border-b border-gray-600 pb-2">Informasi Perusahaan</h3>
          <div>
            <label for="swal-company-name" class="block text-sm font-medium mb-1">Nama Perusahaan</label>
            <input id="swal-company-name" class="swal2-input w-full !bg-gray-700 !border-gray-600 !text-white" value="${companyInfo.name}" placeholder="Nama Perusahaan Anda">
          </div>
          <div>
            <label for="swal-company-address" class="block text-sm font-medium mb-1">Alamat</label>
            <textarea id="swal-company-address" class="swal2-textarea w-full !bg-gray-700 !border-gray-600 !text-white" placeholder="Alamat Perusahaan">${companyInfo.address}</textarea>
          </div>
          <div>
            <label for="swal-company-phone" class="block text-sm font-medium mb-1">No. Telepon</label>
            <input id="swal-company-phone" type="tel" class="swal2-input w-full !bg-gray-700 !border-gray-600 !text-white" value="${companyInfo.phone}" placeholder="Nomor Telepon">
          </div>
           <div>
            <label for="swal-company-logo" class="block text-sm font-medium mb-1">Logo Perusahaan</label>
            <div class="flex items-center gap-4">
              <img id="swal-logo-preview" src="${companyInfo.logo || 'https://via.placeholder.com/150/1f2937/FFFFFF?text=Logo'}" alt="Logo Preview" class="h-20 w-20 object-contain rounded-md bg-gray-700"/>
              <input id="swal-company-logo" type="file" accept="image/*" class="block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-500/20 file:text-blue-300 hover:file:bg-blue-600/30 cursor-pointer">
            </div>
          </div>

          <h3 class="text-lg font-semibold text-sky-400 border-b border-gray-600 pb-2 pt-4">Informasi Pembayaran</h3>
          <div>
            <label for="swal-bank-name" class="block text-sm font-medium mb-1">Nama Bank</label>
            <input id="swal-bank-name" class="swal2-input w-full !bg-gray-700 !border-gray-600 !text-white" value="${companyInfo.namaBank || ''}" placeholder="cth: Bank Central Asia">
          </div>
          <div>
            <label for="swal-account-number" class="block text-sm font-medium mb-1">Nomor Rekening</label>
            <input id="swal-account-number" class="swal2-input w-full !bg-gray-700 !border-gray-600 !text-white" value="${companyInfo.nomorRekening || ''}" placeholder="cth: 1234567890">
          </div>
          <div>
            <label for="swal-account-name" class="block text-sm font-medium mb-1">Atas Nama</label>
            <input id="swal-account-name" class="swal2-input w-full !bg-gray-700 !border-gray-600 !text-white" value="${companyInfo.atasNama || ''}" placeholder="cth: PT. Sidompet Sejahtera">
          </div>
          
          <h3 class="text-lg font-semibold text-sky-400 border-b border-gray-600 pb-2 pt-4">Integrasi Notifikasi Telegram</h3>
          <div>
            <label for="swal-tg-token" class="block text-sm font-medium mb-1">Token Bot Telegram</label>
            <input id="swal-tg-token" type="text" class="swal2-input w-full !bg-gray-700 !border-gray-600 !text-white" value="${companyInfo.telegramBotToken || ''}" placeholder="cth: 123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11">
          </div>
          <div>
            <label for="swal-tg-chatid" class="block text-sm font-medium mb-1">Chat ID Telegram</label>
            <input id="swal-tg-chatid" type="text" class="swal2-input w-full !bg-gray-700 !border-gray-600 !text-white" value="${companyInfo.telegramChatId || ''}" placeholder="ID grup atau pengguna untuk menerima notifikasi">
          </div>

          <h3 class="text-lg font-semibold text-sky-400 border-b border-gray-600 pb-2 pt-4">Backup & Restore</h3>
          <div class="space-y-3">
            <div>
              <label class="block text-sm font-medium mb-2">Backup Data</label>
              <div class="flex flex-col sm:flex-row gap-2">
                <button id="swal-backup-all" class="swal2-styled w-full !bg-green-600 hover:!bg-green-700">Backup Semua Pengaturan & Data</button>
                <button id="swal-backup-data" class="swal2-styled w-full !bg-green-800 hover:!bg-green-900">Backup Data Pelanggan & Transaksi</button>
              </div>
            </div>
            <div>
              <label for="swal-restore-file" class="block text-sm font-medium mb-2">Restore Data dari File</label>
               <input id="swal-restore-file" type="file" accept=".json" class="block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-yellow-500/20 file:text-yellow-300 hover:file:bg-yellow-600/30 cursor-pointer">
               <p class="text-xs text-gray-500 mt-1">Pilih file backup (.json) untuk memulihkan data. Ini akan menimpa data yang ada.</p>
            </div>
          </div>
        </div>
      `,
      width: '48rem',
      customClass: {
          popup: '!bg-gray-800 !text-white !rounded-lg',
          title: '!text-white',
          htmlContainer: '!text-white',
          confirmButton: '!bg-blue-600 hover:!bg-blue-700',
          cancelButton: '!bg-gray-600 hover:!bg-gray-700',
      },
      showCancelButton: true,
      confirmButtonText: 'Simpan',
      cancelButtonText: 'Batal',
      didOpen: () => {
        const logoInput = document.getElementById('swal-company-logo') as HTMLInputElement;
        const logoPreview = document.getElementById('swal-logo-preview') as HTMLImageElement;
        logoInput.onchange = () => {
          const file = logoInput.files?.[0];
          if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
              logoPreview.src = e.target?.result as string;
            };
            reader.readAsDataURL(file);
          }
        };

        // Attach backup/restore event listeners
        const backupAllBtn = document.getElementById('swal-backup-all');
        if (backupAllBtn) backupAllBtn.onclick = () => handleBackup('all');
        
        const backupDataBtn = document.getElementById('swal-backup-data');
        if (backupDataBtn) backupDataBtn.onclick = () => handleBackup('data');

        const restoreInput = document.getElementById('swal-restore-file') as HTMLInputElement;
        if (restoreInput) restoreInput.onchange = (e) => handleRestore(e as any);
      },
      preConfirm: () => {
        const name = (document.getElementById('swal-company-name') as HTMLInputElement).value;
        const address = (document.getElementById('swal-company-address') as HTMLTextAreaElement).value;
        const phone = (document.getElementById('swal-company-phone') as HTMLInputElement).value;
        const telegramBotToken = (document.getElementById('swal-tg-token') as HTMLInputElement).value;
        const telegramChatId = (document.getElementById('swal-tg-chatid') as HTMLInputElement).value;
        const namaBank = (document.getElementById('swal-bank-name') as HTMLInputElement).value;
        const nomorRekening = (document.getElementById('swal-account-number') as HTMLInputElement).value;
        const atasNama = (document.getElementById('swal-account-name') as HTMLInputElement).value;
        const logoInput = document.getElementById('swal-company-logo') as HTMLInputElement;
        const logoFile = logoInput.files?.[0];

        return new Promise((resolve) => {
          if (logoFile) {
            const reader = new FileReader();
            reader.onload = (e) => {
              resolve({
                name,
                address,
                phone,
                telegramBotToken,
                telegramChatId,
                namaBank,
                nomorRekening,
                atasNama,
                logo: e.target?.result as string
              });
            };
            reader.readAsDataURL(logoFile);
          } else {
            resolve({
              name,
              address,
              phone,
              telegramBotToken,
              telegramChatId,
              namaBank,
              nomorRekening,
              atasNama,
              logo: companyInfo.logo // Keep old logo if no new one is selected
            });
          }
        });
      }
    }).then((result) => {
      if (result.isConfirmed && result.value) {
        setCompanyInfo(result.value as CompanyInfo);
        Swal.fire({
            title: 'Berhasil!',
            text: 'Pengaturan perusahaan telah diperbarui.',
            icon: 'success',
            customClass: {
              popup: '!bg-gray-800 !text-white !rounded-lg',
              title: '!text-white',
              confirmButton: '!bg-blue-600 hover:!bg-blue-700',
            }
        });
      }
    });
  };

  const handleLogoutClick = () => {
    Swal.fire({
      title: 'Konfirmasi Keluar',
      text: "Anda yakin ingin keluar dari aplikasi?",
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Ya, keluar!',
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
        onLogout();
      }
    });
  };

  const handleBack = () => {
    setActivePage('dashboard');
  };

  const handleGenerateInvoiceFromSirekap = (customer: Customer) => {
    setInvoiceInitialData({
        recipient: customer.nama,
        recipientPhone: customer.noHp,
        items: [{
            id: Date.now(),
            description: `Tagihan Internet - ${customer.jenisLangganan}`,
            qty: 1,
            price: Number(customer.harga)
        }]
    });
    setActivePage('invoice');
  };
  
  const getPageTitle = () => {
    switch (activePage) {
      case 'sirekap':
        return 'Sirekap';
      case 'laporan':
        return 'Laporan Bulanan';
      case 'invoice':
        return 'Invoice';
      case 'kasCadangan':
        return 'Kas Cadangan';
      default:
        return 'Dasbor';
    }
  };

  const renderFinancialVisualisation = () => {
    if (financeHistory.length === 0) {
      const capitalizedUsername = username.charAt(0).toUpperCase() + username.slice(1);
      return (
        <div className="text-center text-gray-400">
          <p className="text-3xl">Selamat Datang, {capitalizedUsername}!</p>
          <p className="mt-4 text-gray-300 text-lg">Belum ada data keuangan untuk ditampilkan.</p>
        </div>
      );
    }
    
    // Calculate summary data
    const pemasukanEntries = financeHistory.filter(e => e.kategori === 'Pemasukan');
    const pengeluaranEntries = financeHistory.filter(e => e.kategori === 'Pengeluaran');

    const totalPemasukan = pemasukanEntries.reduce((acc, e) => acc + e.nominal, 0);
    const totalPengeluaran = pengeluaranEntries.reduce((acc, e) => acc + e.nominal, 0);
    
    const pemasukanTunai = pemasukanEntries
      .filter(e => e.metode === 'Tunai')
      .reduce((acc, e) => acc + e.nominal, 0);
    const pemasukanTransfer = pemasukanEntries
      .filter(e => e.metode === 'Transfer')
      .reduce((acc, e) => acc + e.nominal, 0);

    const pengeluaranTunai = pengeluaranEntries
      .filter(e => e.metode === 'Tunai')
      .reduce((acc, e) => acc + e.nominal, 0);
    const pengeluaranTransfer = pengeluaranEntries
      .filter(e => e.metode === 'Transfer')
      .reduce((acc, e) => acc + e.nominal, 0);
    
    // --- New Categorized Data Processing ---

    const getCategory = (entry: FinanceEntry): string => {
        const desc = entry.deskripsi.toLowerCase();
        if (entry.kategori === 'Pemasukan') {
            if (desc.includes('langganan')) return 'Pendapatan Langganan';
            if (desc.includes('pemasangan')) return 'Pendapatan Pemasangan';
            return 'Pemasukan Lainnya';
        } else { // Pengeluaran
            if (desc.includes('router') || desc.includes('alat')) return 'Belanja Modal';
            if (desc.includes('listrik') || desc.includes('gaji')) return 'Biaya Operasional';
            if (desc.includes('bagi hasil')) return 'Bagi Hasil';
            return 'Pengeluaran Lainnya';
        }
    };

    const dailyDataCategorized: { [key: string]: { [category: string]: number } } = {};
    const allIncomeCategories = new Set<string>();
    const allExpenseCategories = new Set<string>();

    financeHistory.forEach(entry => {
        const date = entry.tanggal;
        const category = getCategory(entry);

        if (entry.kategori === 'Pemasukan') {
            allIncomeCategories.add(category);
        } else {
            allExpenseCategories.add(category);
        }

        if (!dailyDataCategorized[date]) {
            dailyDataCategorized[date] = {};
        }

        if (!dailyDataCategorized[date][category]) {
            dailyDataCategorized[date][category] = 0;
        }
        dailyDataCategorized[date][category] += entry.nominal;
    });

    let cumulativeBalance = 0;
    const allCategories = [...allIncomeCategories, ...allExpenseCategories];

    const chartData = Object.keys(dailyDataCategorized)
        .sort((a, b) => new Date(a).getTime() - new Date(b).getTime())
        .map(date => {
            const dayData = dailyDataCategorized[date];
            let dailyIncome = 0;
            let dailyExpense = 0;

            const chartEntry: { [key: string]: any } = {
                date: new Date(date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', timeZone: 'UTC' }),
            };

            allCategories.forEach(cat => {
                const value = dayData[cat] || 0;
                chartEntry[cat] = value;
                if (allIncomeCategories.has(cat)) {
                    dailyIncome += value;
                } else {
                    dailyExpense += value;
                }
            });

            cumulativeBalance += dailyIncome - dailyExpense;
            chartEntry.Saldo = cumulativeBalance;

            return chartEntry;
        });
    
    const categoryColors: { [key: string]: string } = {
        'Pendapatan Langganan': '#22c55e',
        'Pendapatan Pemasangan': '#4ade80',
        'Pemasukan Lainnya': '#86efac',
        'Belanja Modal': '#ef4444',
        'Biaya Operasional': '#f87171',
        'Bagi Hasil': '#fca5a5',
        'Pengeluaran Lainnya': '#fecaca',
    };

    const formatYAxis = (value: number) => new Intl.NumberFormat('id-ID', { notation: 'compact', compactDisplay: 'short' }).format(value);

    return (
       <div className="bg-black/20 rounded-lg p-4 sm:p-8 w-full flex-grow">
          <h2 className="text-2xl sm:text-3xl font-semibold mb-6 text-center">Ringkasan Keuangan</h2>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 text-center">
              <div className="bg-green-500/10 p-4 rounded-lg">
                  <p className="text-sm text-green-400 font-semibold">Total Pemasukan</p>
                  <p className="text-xl sm:text-2xl font-bold text-white">Rp {totalPemasukan.toLocaleString('id-ID')}</p>
                   <div className="mt-2 text-xs text-gray-300 space-y-1">
                      <p>Tunai: Rp {pemasukanTunai.toLocaleString('id-ID')}</p>
                      <p>Transfer: Rp {pemasukanTransfer.toLocaleString('id-ID')}</p>
                  </div>
              </div>
              <div className="bg-red-500/10 p-4 rounded-lg">
                  <p className="text-sm text-red-400 font-semibold">Total Pengeluaran</p>
                  <p className="text-xl sm:text-2xl font-bold text-white">Rp {totalPengeluaran.toLocaleString('id-ID')}</p>
                  <div className="mt-2 text-xs text-gray-300 space-y-1">
                      <p>Tunai: Rp {pengeluaranTunai.toLocaleString('id-ID')}</p>
                      <p>Transfer: Rp {pengeluaranTransfer.toLocaleString('id-ID')}</p>
                  </div>
              </div>
              <div className="bg-sky-500/10 p-4 rounded-lg">
                  <p className="text-sm text-sky-400 font-semibold">Saldo Akhir</p>
                  <p className={`text-xl sm:text-2xl font-bold ${saldoAkhir >= 0 ? 'text-white' : 'text-red-400'}`}>
                    Rp {saldoAkhir.toLocaleString('id-ID')}
                  </p>
              </div>
              <div className="bg-slate-500/10 p-4 rounded-lg">
                  <p className="text-sm text-slate-400 font-semibold">Kas Cadangan</p>
                  <p className="text-xl sm:text-2xl font-bold text-white">
                    Rp {kasCadangan.toLocaleString('id-ID')}
                  </p>
              </div>
          </div>

          {/* New Recharts Composed Chart with Stacked Bars */}
          <div className="w-full h-72 sm:h-80 mt-8">
            <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                    data={chartData}
                    margin={{
                        top: 5,
                        right: 5,
                        left: 5,
                        bottom: 5,
                    }}
                >
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
                    <XAxis dataKey="date" stroke="#9ca3af" tick={{ fontSize: 10 }} />
                    <YAxis 
                        yAxisId="left" 
                        orientation="left" 
                        stroke="#9ca3af"
                        tickFormatter={formatYAxis}
                        width={45}
                        tick={{ fontSize: 10 }}
                    />
                     <YAxis 
                        yAxisId="right" 
                        orientation="right" 
                        stroke="#38bdf8"
                        tickFormatter={formatYAxis}
                        width={45}
                        tick={{ fontSize: 10 }}
                    />
                    <Tooltip
                        cursor={{ fill: 'rgba(107, 114, 128, 0.1)' }}
                        contentStyle={{
                            backgroundColor: 'rgba(31, 41, 55, 0.9)',
                            borderColor: '#4b5563',
                            borderRadius: '0.5rem',
                        }}
                        labelStyle={{ color: '#d1d5db', fontWeight: 'bold' }}
                        formatter={(value: number, name: string) => [`Rp ${value.toLocaleString('id-ID')}`, name]}
                    />
                    <Legend wrapperStyle={{ color: '#d1d5db', paddingTop: '10px', fontSize: '12px' }} />
                    
                    {Array.from(allIncomeCategories).map(cat => (
                        <Bar key={cat} yAxisId="left" dataKey={cat} stackId="pemasukan" fill={categoryColors[cat] || '#22c55e'} />
                    ))}

                    {Array.from(allExpenseCategories).map(cat => (
                        <Bar key={cat} yAxisId="left" dataKey={cat} stackId="pengeluaran" fill={categoryColors[cat] || '#ef4444'} />
                    ))}

                    <Line yAxisId="right" type="monotone" dataKey="Saldo" stroke="#38bdf8" strokeWidth={2} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                </ComposedChart>
            </ResponsiveContainer>
        </div>
      </div>
    );
  }

  return (
    <div
      className="relative min-h-screen bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: "url('https://picsum.photos/1920/1000?random=1&grayscale&blur=3')" }}
    >
      <div className="absolute inset-0 bg-black opacity-50"></div>
      
      {/* Full-screen content container */}
      <div className="relative z-10 w-full min-h-screen flex flex-col p-4 sm:p-8 text-white">
        
        {/* Header Section */}
        <header className="flex flex-col sm:flex-row justify-between items-start mb-8 gap-4 sm:gap-0">
          <div className="flex items-center gap-4">
            {companyInfo.logo && <img src={companyInfo.logo} alt="Company Logo" className="h-10 w-10 sm:h-12 sm:w-12 object-contain" />}
            <h1 className="text-3xl sm:text-4xl font-bold tracking-wider">{getPageTitle()}</h1>
          </div>
          <div className="flex items-center gap-2 self-end">
            <button
              onClick={handleSettingsClick}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
              aria-label="Pengaturan"
              title="Pengaturan"
            >
              <SettingsIcon className="w-5 h-5 sm:w-6 sm:h-6 text-white"/>
            </button>
            <button
              onClick={handleLogoutClick}
              className="py-2 px-5 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-transform transform hover:scale-105"
            >
              Keluar
            </button>
          </div>
        </header>

        {activePage === 'sirekap' ? (
          <SirekapPage 
            onBack={handleBack} 
            customers={customers}
            setCustomers={setCustomers}
            financeHistory={financeHistory}
            setFinanceHistory={setFinanceHistory}
            onPaymentSuccess={handlePaymentSuccessNotification}
            onNewCustomer={handleNewCustomerNotification}
            onNewFinanceEntry={handleNewFinanceEntryNotification}
            companyInfo={companyInfo}
            onGenerateInvoice={handleGenerateInvoiceFromSirekap}
          />
        ) : activePage === 'laporan' ? (
          <LaporanBulananPage 
            onBack={handleBack} 
            financeHistory={financeHistory}
            companyInfo={companyInfo}
            profitSharingData={profitSharingData}
            setFinanceHistory={setFinanceHistory}
            setProfitSharingData={setProfitSharingData}
            kasCadangan={kasCadangan}
            onProfitShareProcessed={handleProfitShareNotification}
          />
        ) : activePage === 'invoice' ? (
          <InvoicePage
            onBack={handleBack}
            companyInfo={companyInfo}
            initialData={invoiceInitialData}
          />
        ) : activePage === 'kasCadangan' ? (
          <KasCadanganPage
            onBack={handleBack}
            kasCadangan={kasCadangan}
            setKasCadangan={setKasCadangan}
            saldoAkhir={saldoAkhir}
            financeHistory={financeHistory}
            setFinanceHistory={setFinanceHistory}
            onKasActivity={handleKasCadanganNotification}
          />
        ) : (
          <>
            {/* Menu Section */}
            <div className="mb-8 overflow-x-auto">
              <nav>
                <ul className="flex flex-nowrap sm:flex-wrap gap-x-4 sm:gap-x-6 gap-y-2">
                  <li>
                    <a 
                      href="#" 
                      onClick={(e) => { e.preventDefault(); setActivePage('sirekap'); }}
                      className="text-base sm:text-lg text-white font-medium hover:text-sky-300 transition-colors duration-300 pb-1 border-b-2 border-transparent hover:border-sky-400 whitespace-nowrap">
                      Sirekap
                    </a>
                  </li>
                  <li>
                    <a 
                      href="#" 
                      onClick={(e) => { e.preventDefault(); setActivePage('laporan'); }}
                      className="text-base sm:text-lg text-white font-medium hover:text-sky-300 transition-colors duration-300 pb-1 border-b-2 border-transparent hover:border-sky-400 whitespace-nowrap">
                      Laporan Bulanan
                    </a>
                  </li>
                  <li>
                    <a 
                      href="#" 
                      onClick={(e) => { 
                          e.preventDefault(); 
                          setInvoiceInitialData(null); // Clear any previous pre-filled data
                          setActivePage('invoice'); 
                      }}
                      className="text-base sm:text-lg text-white font-medium hover:text-sky-300 transition-colors duration-300 pb-1 border-b-2 border-transparent hover:border-sky-400 whitespace-nowrap">
                      Invoice
                    </a>
                  </li>
                  <li>
                    <a 
                      href="#" 
                      onClick={(e) => { e.preventDefault(); setActivePage('kasCadangan'); }}
                      className="text-base sm:text-lg text-white font-medium hover:text-sky-300 transition-colors duration-300 pb-1 border-b-2 border-transparent hover:border-sky-400 whitespace-nowrap">
                      Kas Cadangan
                    </a>
                  </li>
                </ul>
              </nav>
            </div>

            {/* Main Content Area */}
            <main className="flex-grow flex flex-col justify-center items-center">
              {renderFinancialVisualisation()}
            </main>
          </>
        )}
        
      </div>
    </div>
  );
};

export default DashboardPage;
