import React, { useState, useEffect, useMemo, useCallback } from 'react';
import SirekapPage from './SirekapPage';
import LaporanBulananPage from './LaporanBulananPage';
import InvoicePage, { InvoiceInitialData } from './InvoicePage';
import KasCadanganPage from './KasCadanganPage';
import VoucherPage from './VoucherPage';
import * as Recharts from 'recharts';
import SettingsIcon from './icons/SettingsIcon';
import TicketIcon from './icons/TicketIcon';
import { CompanyInfo } from '../App';
import { supabase } from '../supabaseClient';
import Swal from 'sweetalert2'; // Import Swal for consistent module loading

// Declare jspdf to inform TypeScript about the global variable from the CDN script
// Removed declare const jspdf: any;

// Destructure components from the Recharts namespace
const { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ComposedChart, Line } = Recharts;

// Interfaces defined locally as they are heavily used here
export interface Customer {
  id: number;
  user_id?: string; // Add user_id for Supabase
  nama: string;
  noHp: string;
  jenisLangganan: string;
  alamat: string;
  harga: string;
  status: 'Lunas' | 'Belum Lunas';
  tunggakan: number;
  dueDate: string; // Added dueDate
}

export interface FinanceEntry {
  id: number;
  user_id?: string; // Add user_id for Supabase
  deskripsi: string;
  tanggal: string;
  kategori: string;
  metode: string;
  nominal: number;
}

// Moved ProfitShare definition here to break circular dependency
export interface ProfitShare {
    id?: number; // Supabase ID
    user_id?: string;
    nama: string;
    jumlah: number;
}

interface DashboardPageProps {
  onLogout: () => void;
  username: string;
  companyInfo: CompanyInfo;
  setCompanyInfo: (newInfo: CompanyInfo) => Promise<boolean>; // Updated to reflect async Supabase call
  userId: string; // Pass userId from App.tsx
}

const CUSTOMERS_TABLE = 'customers';
const FINANCE_HISTORY_TABLE = 'finance_history';
const PROFIT_SHARE_TABLE = 'profit_share';
const KAS_CADANGAN_TABLE = 'kas_cadangan';


const DashboardPage: React.FC<DashboardPageProps> = ({ onLogout, username, companyInfo, setCompanyInfo, userId }) => {
  const [activePage, setActivePage] = useState<'dashboard' | 'sirekap' | 'laporan' | 'invoice' | 'kasCadangan' | 'voucher'>('dashboard');
  const [invoiceInitialData, setInvoiceInitialData] = useState<InvoiceInitialData | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string>('all'); // State for month filter

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [financeHistory, setFinanceHistory] = useState<FinanceEntry[]>([]);
  const [profitSharingData, setProfitSharingData] = useState<ProfitShare[]>([]);
  const [kasCadangan, setKasCadangan] = useState<number>(0);
  const [loadingData, setLoadingData] = useState(true);

  // --- Supabase Data Operations ---
  const fetchData = useCallback(async () => {
    setLoadingData(true);
    try {
      // Fetch Customers
      const { data: customersData, error: customersError } = await supabase
        .from<Customer>(CUSTOMERS_TABLE)
        .select('*')
        .eq('user_id', userId);
      if (customersError) throw customersError;
      setCustomers(customersData || []);

      // Fetch Finance History
      const { data: financeData, error: financeError } = await supabase
        .from<FinanceEntry>(FINANCE_HISTORY_TABLE)
        .select('*')
        .eq('user_id', userId);
      if (financeError) throw financeError;
      setFinanceHistory(financeData || []);

      // Fetch Profit Sharing Data
      const { data: profitShareData, error: profitShareError } = await supabase
        .from<ProfitShare>(PROFIT_SHARE_TABLE)
        .select('*')
        .eq('user_id', userId);
      if (profitShareError) throw profitShareError;
      setProfitSharingData(profitShareData || []);

      // Fetch Kas Cadangan
      const { data: kasCadanganData, error: kasCadanganError } = await supabase
        .from<{id?: number; user_id: string; amount: number}>(KAS_CADANGAN_TABLE)
        .select('id, amount')
        .eq('user_id', userId)
        .single();
      if (kasCadanganError && kasCadanganError.code !== 'PGRST116') throw kasCadanganError; // PGRST116 means no rows found
      setKasCadangan(kasCadanganData ? kasCadanganData.amount : 0);
      if (!kasCadanganData) { // If no kas cadangan exists, create a default one
        const { error: insertKasError } = await supabase
          .from(KAS_CADANGAN_TABLE)
          .insert({ user_id: userId, amount: 0 });
        if (insertKasError) console.error("Error inserting default kas cadangan:", insertKasError.message);
      }

    } catch (error: any) {
      console.error('Error fetching data:', error.message);
      Swal.fire({
        title: 'Error Memuat Data',
        text: 'Terjadi kesalahan saat memuat data Anda. Silakan coba refresh halaman.',
        icon: 'error',
        customClass: { popup: '!bg-gray-800 !text-white', title: '!text-white' }
      });
    } finally {
      setLoadingData(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // General upsert/delete wrappers for components
  const updateCustomerSupabase = useCallback(async (customer: Omit<Customer, 'user_id'> & {id?: number}) => {
    const customerWithUser = { ...customer, user_id: userId };
    if (customerWithUser.id) {
        // Update existing
        const { data, error } = await supabase
            .from(CUSTOMERS_TABLE)
            .update(customerWithUser)
            .eq('id', customerWithUser.id)
            .eq('user_id', userId) // Ensure user owns the data
            .select()
            .single();
        if (error) throw error;
        setCustomers(prev => prev.map(c => c.id === data.id ? data : c));
        return data;
    } else {
        // Insert new
        const { data, error } = await supabase
            .from(CUSTOMERS_TABLE)
            .insert(customerWithUser)
            .select()
            .single();
        if (error) throw error;
        setCustomers(prev => [...prev, data]);
        return data;
    }
  }, [userId]);

  const deleteCustomerSupabase = useCallback(async (id: number) => {
    const { error } = await supabase
      .from(CUSTOMERS_TABLE)
      .delete()
      .eq('id', id)
      .eq('user_id', userId);
    if (error) throw error;
    setCustomers(prev => prev.filter(c => c.id !== id));
  }, [userId]);

  const updateFinanceEntrySupabase = useCallback(async (entry: Omit<FinanceEntry, 'user_id'> & {id?: number}) => {
    const entryWithUser = { ...entry, user_id: userId };
    if (entryWithUser.id) {
        const { data, error } = await supabase
            .from(FINANCE_HISTORY_TABLE)
            .update(entryWithUser)
            .eq('id', entryWithUser.id)
            .eq('user_id', userId)
            .select()
            .single();
        if (error) throw error;
        setFinanceHistory(prev => prev.map(e => e.id === data.id ? data : e));
        return data;
    } else {
        const { data, error } = await supabase
            .from(FINANCE_HISTORY_TABLE)
            .insert(entryWithUser)
            .select()
            .single();
        if (error) throw error;
        setFinanceHistory(prev => [...prev, data]);
        return data;
    }
  }, [userId]);

  const deleteFinanceEntrySupabase = useCallback(async (id: number) => {
    const { error } = await supabase
      .from(FINANCE_HISTORY_TABLE)
      .delete()
      .eq('id', id)
      .eq('user_id', userId);
    if (error) throw error;
    setFinanceHistory(prev => prev.filter(e => e.id !== id));
  }, [userId]);

  const updateProfitSharingDataSupabase = useCallback(async (profitShares: ProfitShare[]) => {
    // Supabase doesn't have a direct "update all if exists, insert if not" for arrays of objects that are not already in DB.
    // For simplicity, we'll delete existing for this user and re-insert the new set.
    // In a real app, this might involve more complex logic to compare and upsert.
    const { error: deleteError } = await supabase
      .from(PROFIT_SHARE_TABLE)
      .delete()
      .eq('user_id', userId);
    if (deleteError) throw deleteError;

    const profitSharesWithUser = profitShares.map(ps => ({ ...ps, user_id: userId }));
    const { data, error: insertError } = await supabase
      .from(PROFIT_SHARE_TABLE)
      .insert(profitSharesWithUser)
      .select();
    if (insertError) throw insertError;
    setProfitSharingData(data || []);
    return data;
  }, [userId]);

  const updateKasCadanganSupabase = useCallback(async (amount: number) => {
    const { data, error } = await supabase
      .from(KAS_CADANGAN_TABLE)
      .upsert({ user_id: userId, amount }, { onConflict: 'user_id' })
      .select('amount')
      .single();
    if (error) throw error;
    setKasCadangan(data.amount);
    return data.amount;
  }, [userId]);

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
    reader.onload = async (e) => { // Made onload async
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
            }).then(async (result: any) => { // Made then block async
                if (result.isConfirmed) {
                    try {
                        // Clear existing data in Supabase for this user
                        await supabase.from(CUSTOMERS_TABLE).delete().eq('user_id', userId);
                        await supabase.from(FINANCE_HISTORY_TABLE).delete().eq('user_id', userId);
                        await supabase.from(PROFIT_SHARE_TABLE).delete().eq('user_id', userId);
                        // For kas_cadangan and company_info, we upsert, so no explicit delete is needed unless the ID changes.

                        // Insert/Update with restored data
                        if (parsedData.companyInfo) {
                            await setCompanyInfo(parsedData.companyInfo); // This handles upsert
                        }
                        const customersToInsert = parsedData.customers.map((c: Customer) => ({ ...c, user_id: userId, id: undefined })); // Remove old IDs
                        const financeToInsert = parsedData.financeHistory.map((f: FinanceEntry) => ({ ...f, user_id: userId, id: undefined })); // Remove old IDs
                        const profitShareToInsert = parsedData.profitSharingData ? parsedData.profitSharingData.map((ps: ProfitShare) => ({ ...ps, user_id: userId, id: undefined })) : []; // Remove old IDs

                        if (customersToInsert.length > 0) await supabase.from(CUSTOMERS_TABLE).insert(customersToInsert);
                        if (financeToInsert.length > 0) await supabase.from(FINANCE_HISTORY_TABLE).insert(financeToInsert);
                        if (profitShareToInsert.length > 0) await supabase.from(PROFIT_SHARE_TABLE).insert(profitShareToInsert);
                        
                        if (parsedData.kasCadangan !== undefined) {
                            await updateKasCadanganSupabase(parsedData.kasCadangan); // This handles upsert
                        }

                        await fetchData(); // Re-fetch all data to update UI

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
                    } catch (dbError: any) {
                        console.error("Gagal melakukan operasi Supabase saat restore:", dbError.message);
                        Swal.fire({
                            title: 'Restore Gagal (Database)',
                            text: `Terjadi kesalahan saat menyimpan data ke database: ${dbError.message}`,
                            icon: 'error',
                            customClass: {
                                popup: '!bg-gray-800 !text-white !rounded-lg',
                                title: '!text-white',
                                confirmButton: '!bg-red-600 hover:!bg-red-700',
                            },
                        });
                    }
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
          <div>
            <label for="swal-company-stamp" class="block text-sm font-medium mb-1">Stempel Perusahaan</label>
            <div class="flex items-center gap-4">
              <img id="swal-stamp-preview" src="${companyInfo.stampLogo || 'https://via.placeholder.com/150/1f2937/FFFFFF?text=Stempel'}" alt="Stamp Preview" class="h-20 w-20 object-contain rounded-md bg-gray-700"/>
              <input id="swal-company-stamp" type="file" accept="image/*" class="block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-500/20 file:text-blue-300 hover:file:bg-blue-600/30 cursor-pointer">
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
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium mb-2">Backup Lokal (File)</label>
              <div class="flex flex-col sm:flex-row gap-2">
                <button id="swal-backup-all" class="swal2-styled w-full !bg-green-600 hover:!bg-green-700 !m-0">Download Semua Data</button>
                <button id="swal-backup-data" class="swal2-styled w-full !bg-green-800 hover:!bg-green-900 !m-0">Download Data Transaksi Saja</button>
              </div>
            </div>
            <div>
              <label for="swal-restore-file" class="block text-sm font-medium mb-2">Restore Lokal (File)</label>
               <input id="swal-restore-file" type="file" accept=".json" class="block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-yellow-500/20 file:text-yellow-300 hover:file:bg-yellow-600/30 cursor-pointer">
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

        const stampInput = document.getElementById('swal-company-stamp') as HTMLInputElement;
        const stampPreview = document.getElementById('swal-stamp-preview') as HTMLImageElement;
        stampInput.onchange = () => {
          const file = stampInput.files?.[0];
          if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
              stampPreview.src = e.target?.result as string;
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

        const stampInput = document.getElementById('swal-company-stamp') as HTMLInputElement;
        const stampFile = stampInput.files?.[0];

        return new Promise((resolve) => {
          let logoBase64: string | null = companyInfo.logo;
          let stampBase64: string | null = companyInfo.stampLogo;
          let filesToProcess = 0;
          let filesProcessed = 0;

          const checkCompletion = () => {
            filesProcessed++;
            if (filesProcessed === filesToProcess) {
              resolve({
                name,
                address,
                phone,
                telegramBotToken,
                telegramChatId,
                namaBank,
                nomorRekening,
                atasNama,
                logo: logoBase64,
                stampLogo: stampBase64,
              });
            }
          };

          if (logoFile) {
            filesToProcess++;
            const reader = new FileReader();
            reader.onload = (e) => {
              logoBase64 = e.target?.result as string;
              checkCompletion();
            };
            reader.readAsDataURL(logoFile);
          }

          if (stampFile) {
            filesToProcess++;
            const reader = new FileReader();
            reader.onload = (e) => {
              stampBase64 = e.target?.result as string;
              checkCompletion();
            };
            reader.readAsDataURL(stampFile);
          }
          
          if (filesToProcess === 0) { // No files to upload
            resolve({
                ...companyInfo, // Keep existing ID and user_id
                name,
                address,
                phone,
                telegramBotToken,
                telegramChatId,
                namaBank,
                nomorRekening,
                atasNama,
            });
          }
        });
      }
    }).then(async (result) => { // Made then block async
      if (result.isConfirmed && result.value) {
        const success = await setCompanyInfo(result.value as CompanyInfo);
        if (success) {
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
        } else {
            Swal.fire({
                title: 'Gagal!',
                text: 'Gagal memperbarui pengaturan perusahaan. Silakan coba lagi.',
                icon: 'error',
                customClass: {
                  popup: '!bg-gray-800 !text-white !rounded-lg',
                  title: '!text-white',
                  confirmButton: '!bg-red-600 hover:!bg-red-700',
                }
            });
        }
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
        }],
        invoiceDueDate: customer.dueDate, // Pass the customer's due date
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
      case 'voucher':
        return 'Pendapatan Voucher';
      default:
        return 'Dasbor';
    }
  };

  // Extract unique month-year keys for filtering
  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    financeHistory.forEach(entry => {
      const date = new Date(entry.tanggal);
      months.add(date.toLocaleString('id-ID', { month: 'long', year: 'numeric', timeZone: 'UTC' }));
    });
    return ['all', ...Array.from(months).sort((a,b) => { // Sort chronologically
      const [monthA, yearA] = a.split(' ');
      const [monthB, yearB] = b.split(' ');
      const dateA = new Date(Date.parse(`${monthA} 1, ${yearA}`));
      const dateB = new Date(Date.parse(`${monthB} 1, ${yearB}`));
      return dateA.getTime() - dateB.getTime();
    }).reverse()]; // Newest first
  }, [financeHistory]);


  const filteredFinanceHistoryByMonth = useMemo(() => {
    if (selectedMonth === 'all') {
      return financeHistory;
    }
    return financeHistory.filter(entry => {
      const entryDate = new Date(entry.tanggal);
      const entryMonthYear = entryDate.toLocaleString('id-ID', { month: 'long', year: 'numeric', timeZone: 'UTC' });
      return entryMonthYear === selectedMonth;
    });
  }, [financeHistory, selectedMonth]);


  const renderFinancialVisualisation = () => {
    if (loadingData) {
      return (
        <div className="text-center text-gray-400 mt-8">
          <p className="text-3xl">Memuat data...</p>
          <svg className="animate-spin h-8 w-8 text-white mx-auto mt-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
      );
    }
    
    if (financeHistory.length === 0 && customers.length === 0) { // Check both finance and customers
      const capitalizedUsername = username.charAt(0).toUpperCase() + username.slice(1);
      return (
        <div className="text-center text-gray-400">
          <p className="text-3xl">Selamat Datang, {capitalizedUsername}!</p>
          <p className="mt-4 text-gray-300 text-lg">Belum ada data keuangan atau pelanggan untuk ditampilkan.</p>
        </div>
      );
    }
    
    // Calculate summary data from filteredFinanceHistoryByMonth
    const pemasukanEntries = filteredFinanceHistoryByMonth.filter(e => e.kategori === 'Pemasukan');
    const pengeluaranEntries = filteredFinanceHistoryByMonth.filter(e => e.kategori === 'Pengeluaran');

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
    
    // Calculate voucher revenue specific
    const totalVoucherRevenue = filteredFinanceHistoryByMonth
      .filter(e => e.kategori === 'Pemasukan' && e.deskripsi.toLowerCase().includes('voucher'))
      .reduce((acc, e) => acc + e.nominal, 0);

    // New customer counts
    const totalActiveCustomers = customers.length;
    const totalPaidCustomers = customers.filter(c => c.status === 'Lunas').length;
    const totalUnpaidCustomers = customers.filter(c => c.status === 'Belum Lunas').length;
    
    // --- New Categorized Data Processing ---

    const getCategory = (entry: FinanceEntry): string => {
        const desc = entry.deskripsi.toLowerCase();
        if (entry.kategori === 'Pemasukan') {
            if (desc.includes('voucher')) return 'Pendapatan Voucher'; // Explicit voucher category
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

    filteredFinanceHistoryByMonth.forEach(entry => {
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
    const allCategories = [...Array.from(allIncomeCategories), ...Array.from(allExpenseCategories)];

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
        'Pendapatan Voucher': '#a855f7', // Purple for Voucher
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
          <h2 className="text-2xl sm:text-3xl font-semibold mb-6 text-center">Ringkasan Keuangan & Pelanggan</h2>
          {/* Month Filter */}
          <div className="flex justify-center mb-6">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-4 py-2 rounded-lg bg-gray-700/50 border border-gray-600 text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              <option value="all">Semua Waktu</option>
              {availableMonths.map(month => (
                <option key={month} value={month}>{month}</option>
              ))}
            </select>
          </div>
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
                  <p className={`text-xl sm:text-2xl font-bold ${totalPemasukan - totalPengeluaran >= 0 ? 'text-white' : 'text-red-400'}`}>
                    Rp {(totalPemasukan - totalPengeluaran).toLocaleString('id-ID')}
                  </p>
              </div>
              <div className="bg-slate-500/10 p-4 rounded-lg">
                  <p className="text-sm text-slate-400 font-semibold">Kas Cadangan</p>
                  <p className="text-xl sm:text-2xl font-bold text-white">
                    Rp {kasCadangan.toLocaleString('id-ID')}
                  </p>
              </div>
              
              <div className="bg-indigo-500/10 p-4 rounded-lg">
                  <p className="text-sm text-indigo-400 font-semibold">Pendapatan Voucher</p>
                  <p className="text-xl sm:text-2xl font-bold text-white">
                    Rp {totalVoucherRevenue.toLocaleString('id-ID')}
                  </p>
              </div>

              <div className="bg-purple-500/10 p-4 rounded-lg">
                  <p className="text-sm text-purple-400 font-semibold">Total Pelanggan</p>
                  <p className="text-xl sm:text-2xl font-bold text-white">
                    {totalActiveCustomers}
                  </p>
              </div>
              <div className="bg-teal-500/10 p-4 rounded-lg">
                  <p className="text-sm text-teal-400 font-semibold">Pelanggan Lunas</p>
                  <p className="text-xl sm:text-2xl font-bold text-white">
                    {totalPaidCustomers}
                  </p>
              </div>
              <div className="bg-amber-500/10 p-4 rounded-lg">
                  <p className="text-sm text-amber-400 font-semibold">Pelanggan Belum Lunas</p>
                  <p className="text-xl sm:text-2xl font-bold text-white">
                    {totalUnpaidCustomers}
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
            setCustomers={setCustomers} // This will be replaced by updateCustomerSupabase etc.
            financeHistory={financeHistory}
            setFinanceHistory={setFinanceHistory} // This will be replaced by updateFinanceEntrySupabase etc.
            onPaymentSuccess={handlePaymentSuccessNotification}
            onNewCustomer={handleNewCustomerNotification}
            onNewFinanceEntry={handleNewFinanceEntryNotification}
            companyInfo={companyInfo}
            onGenerateInvoice={handleGenerateInvoiceFromSirekap}
            // Pass Supabase interaction functions
            onAddUpdateCustomer={updateCustomerSupabase}
            onDeleteCustomer={deleteCustomerSupabase}
            onAddUpdateFinanceEntry={updateFinanceEntrySupabase}
            onDeleteFinanceEntry={deleteFinanceEntrySupabase}
            userId={userId}
          />
        ) : activePage === 'laporan' ? (
          <LaporanBulananPage 
            onBack={handleBack} 
            financeHistory={financeHistory}
            companyInfo={companyInfo}
            profitSharingData={profitSharingData}
            setFinanceHistory={setFinanceHistory} // Will use direct supabase interaction
            setProfitSharingData={setProfitSharingData} // Will use direct supabase interaction
            kasCadangan={kasCadangan}
            onProfitShareProcessed={handleProfitShareNotification}
            selectedMonth={selectedMonth} // Pass selectedMonth to LaporanBulananPage
            // Pass Supabase interaction functions
            onAddUpdateFinanceEntry={updateFinanceEntrySupabase}
            onUpdateProfitSharingData={updateProfitSharingDataSupabase}
            saldoAkhir={saldoAkhir}
            userId={userId}
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
            setKasCadangan={setKasCadangan} // Will use direct supabase interaction
            saldoAkhir={saldoAkhir}
            financeHistory={financeHistory}
            setFinanceHistory={setFinanceHistory} // Will use direct supabase interaction
            onKasActivity={handleKasCadanganNotification}
            // Pass Supabase interaction functions
            onAddUpdateFinanceEntry={updateFinanceEntrySupabase}
            onUpdateKasCadangan={updateKasCadanganSupabase}
          />
        ) : activePage === 'voucher' ? (
          <VoucherPage
            onBack={handleBack}
            financeHistory={financeHistory}
            setFinanceHistory={setFinanceHistory} // Will use direct supabase interaction
            onNewFinanceEntry={handleNewFinanceEntryNotification}
            // Pass Supabase interaction functions
            onAddUpdateFinanceEntry={updateFinanceEntrySupabase}
            onDeleteFinanceEntry={deleteFinanceEntrySupabase}
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
                  <li>
                    <a 
                      href="#" 
                      onClick={(e) => { e.preventDefault(); setActivePage('voucher'); }}
                      className="text-base sm:text-lg text-white font-medium hover:text-sky-300 transition-colors duration-300 pb-1 border-b-2 border-transparent hover:border-sky-400 whitespace-nowrap flex items-center gap-1">
                      <TicketIcon className="w-4 h-4" />
                      Pendapatan Voucher
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
}

export default DashboardPage;