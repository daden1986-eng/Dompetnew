

import React, { useState } from 'react';
import ArrowLeftIcon from './icons/ArrowLeftIcon';
import WhatsappIcon from './icons/WhatsappIcon';
import DownloadIcon from './icons/DownloadIcon';
import DocumentIcon from './icons/DocumentIcon';
import { CompanyInfo } from '../App';
import { Customer, FinanceEntry } from './DashboardPage'; // Import interfaces from DashboardPage
import Swal from 'sweetalert2'; // Import Swal for consistent module loading

// Declare jspdf to inform TypeScript about the global variable from the CDN script
// Removed declare const jspdf: any;

interface SirekapPageProps {
  onBack: () => void;
  customers: Customer[];
  // setCustomers: React.Dispatch<React.SetStateAction<Customer[]>>; // No longer directly used
  financeHistory: FinanceEntry[];
  // setFinanceHistory: React.Dispatch<React.SetStateAction<FinanceEntry[]>>; // No longer directly used
  onPaymentSuccess: (customer: Customer, amount: number) => void;
  onNewCustomer: (customer: Customer) => void;
  onNewFinanceEntry: (entry: FinanceEntry) => void;
  companyInfo: CompanyInfo;
  onGenerateInvoice: (customer: Customer) => void;
  // New props for Supabase interaction
  onAddUpdateCustomer: (customer: Omit<Customer, 'user_id'> & {id?: number}) => Promise<Customer>;
  onDeleteCustomer: (id: number) => Promise<void>;
  onAddUpdateFinanceEntry: (entry: Omit<FinanceEntry, 'user_id'> & {id?: number}) => Promise<FinanceEntry>;
  onDeleteFinanceEntry: (id: number) => Promise<void>;
  userId: string;
}

const SirekapPage: React.FC<SirekapPageProps> = ({ 
  onBack, 
  customers, 
  financeHistory, 
  onPaymentSuccess, 
  onNewCustomer, 
  onNewFinanceEntry, 
  companyInfo, 
  onGenerateInvoice,
  onAddUpdateCustomer,
  onDeleteCustomer,
  onAddUpdateFinanceEntry,
  onDeleteFinanceEntry,
  userId,
}) => {
  const [activeMenu, setActiveMenu] = useState('daftar'); // 'daftar', 'input', 'keuangan', or 'riwayat'
  
  // State for the new customer form
  const [nama, setNama] = useState('');
  const [noHp, setNoHp] = useState('');
  const [jenisLangganan, setJenisLangganan] = useState('PPPoE');
  const [alamat, setAlamat] = useState('');
  const [harga, setHarga] = useState('');
  const [dueDateInput, setDueDateInput] = useState<string>(() => {
    const today = new Date();
    let defaultDate = new Date(today.getFullYear(), today.getMonth(), 24); // Default to 24th
    if (today.getDate() > 24) { // If today is past the 24th, set to next month's 24th
        defaultDate.setMonth(defaultDate.getMonth() + 1);
    }
    return defaultDate.toISOString().split('T')[0];
  });
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  // State for the new finance form
  const [deskripsi, setDeskripsi] = useState('');
  const [tanggal, setTanggal] = useState(new Date().toISOString().split('T')[0]);
  const [kategori, setKategori] = useState('Pemasukan');
  const [metode, setMetode] = useState('Transfer');
  const [nominal, setNominal] = useState('');

  // State for editing finance entry
  const [editingEntry, setEditingEntry] = useState<FinanceEntry | null>(null);

  // State for filtering and visibility
  const [searchTerm, setSearchTerm] = useState('');
  const [filterJenisLangganan, setFilterJenisLangganan] = useState('Semua');
  const [filterStatus, setFilterStatus] = useState('Semua'); // New state for status filter
  const [isListVisible, setIsListVisible] = useState(true);

  // State for finance history filtering
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [financeSearchTerm, setFinanceSearchTerm] = useState('');
  const [isHistoryVisible, setIsHistoryVisible] = useState(true);

  // Derived state for filtered customers
  const filteredCustomers = customers.filter(customer => {
    const matchesSearchTerm = customer.nama.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesJenisLangganan = filterJenisLangganan === 'Semua' || customer.jenisLangganan === filterJenisLangganan;
    const matchesStatus = filterStatus === 'Semua' || customer.status === filterStatus;
    return matchesSearchTerm && matchesJenisLangganan && matchesStatus;
  });


  const resetCustomerForm = () => {
    setNama('');
    setNoHp('');
    setJenisLangganan('PPPoE');
    setAlamat('');
    setHarga('');
    const today = new Date();
    let defaultDate = new Date(today.getFullYear(), today.getMonth(), 24); // Default to 24th
    if (today.getDate() > 24) { // If today is past the 24th, set to next month's 24th
        defaultDate.setMonth(defaultDate.getMonth() + 1);
    }
    setDueDateInput(defaultDate.toISOString().split('T')[0]);
    setEditingCustomer(null);
  };

  const handleCustomerFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
        if (editingCustomer) {
            await Swal.fire({
                title: 'Perbarui data pelanggan ini?',
                icon: 'question',
                showCancelButton: true,
                confirmButtonColor: '#3085d6',
                cancelButtonColor: '#d33',
                confirmButtonText: 'Ya, perbarui',
                cancelButtonText: 'Batal',
            }).then(async (result: any) => {
                if (result.isConfirmed) {
                    const updatedCustomer = { 
                        ...editingCustomer, 
                        nama, noHp, jenisLangganan, alamat, 
                        harga: harga || '0', 
                        dueDate: dueDateInput,
                        user_id: userId, // Ensure user_id is passed for consistency
                    };
                    await onAddUpdateCustomer(updatedCustomer);
                    Swal.fire({
                        title: 'Berhasil!',
                        text: 'Data pelanggan berhasil diperbarui.',
                        icon: 'success',
                        confirmButtonColor: '#3085d6',
                    });
                    resetCustomerForm();
                    setActiveMenu('daftar');
                    setIsListVisible(true);
                }
            });
        } else {
            const newCustomer = {
                nama,
                noHp,
                jenisLangganan,
                alamat,
                harga: harga || '0',
                status: 'Belum Lunas' as const,
                tunggakan: 0,
                dueDate: dueDateInput,
                user_id: userId, // Set user_id for new customer
            };
            const addedCustomer = await onAddUpdateCustomer(newCustomer);
            onNewCustomer(addedCustomer); // Notify dashboard
            Swal.fire({
                title: 'Berhasil!',
                text: 'Pelanggan baru berhasil ditambahkan.',
                icon: 'success',
                confirmButtonColor: '#3085d6',
            });
            resetCustomerForm();
            setActiveMenu('daftar');
            setIsListVisible(true);
        }
    } catch (error: any) {
        console.error("Error saving customer:", error.message);
        Swal.fire({
            title: 'Error!',
            text: `Gagal menyimpan data pelanggan: ${error.message}`,
            icon: 'error',
            confirmButtonColor: '#d33',
        });
    }
  };
  
  const resetFinanceForm = () => {
    setDeskripsi('');
    setTanggal(new Date().toISOString().split('T')[0]);
    setKategori('Pemasukan');
    setMetode('Transfer');
    setNominal('');
    setEditingEntry(null);
  };

  const handleFinanceFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
        const nominalValue = Number(nominal);
        if (editingEntry) {
            const updatedEntry = {
                ...editingEntry,
                deskripsi, tanggal, kategori, metode,
                nominal: nominalValue,
                user_id: userId, // Ensure user_id is passed for consistency
            };
            await onAddUpdateFinanceEntry(updatedEntry);
            Swal.fire('Berhasil!', 'Catatan keuangan berhasil diperbarui.', 'success');
        } else {
            const newFinanceEntry = {
                deskripsi,
                tanggal,
                kategori,
                metode,
                nominal: nominalValue,
                user_id: userId, // Set user_id for new entry
            };
            const addedEntry = await onAddUpdateFinanceEntry(newFinanceEntry);
            onNewFinanceEntry(addedEntry); // Notify dashboard
            Swal.fire('Berhasil!', 'Catatan keuangan berhasil ditambahkan.', 'success');
        }
        resetFinanceForm();
        setActiveMenu('riwayat');
    } catch (error: any) {
        console.error("Error saving finance entry:", error.message);
        Swal.fire({
            title: 'Error!',
            text: `Gagal menyimpan catatan keuangan: ${error.message}`,
            icon: 'error',
            confirmButtonColor: '#d33',
        });
    }
  };

  const handleStartEdit = (entry: FinanceEntry) => {
    setEditingEntry(entry);
    setDeskripsi(entry.deskripsi);
    setTanggal(entry.tanggal);
    setKategori(entry.kategori);
    setMetode(entry.metode);
    setNominal(String(entry.nominal));
    setActiveMenu('keuangan');
  };

  const handleDeleteEntry = async (id: number) => {
    await Swal.fire({
      title: 'Apakah Anda yakin?',
      text: "Anda tidak akan dapat mengembalikan ini!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Ya, hapus!',
      cancelButtonText: 'Batal'
    }).then(async (result: any) => {
      if (result.isConfirmed) {
        try {
            await onDeleteFinanceEntry(id);
            Swal.fire(
                'Dihapus!',
                'Catatan keuangan telah dihapus.',
                'success'
            );
        } catch (error: any) {
            console.error("Error deleting finance entry:", error.message);
            Swal.fire({
                title: 'Error!',
                text: `Gagal menghapus catatan keuangan: ${error.message}`,
                icon: 'error',
                confirmButtonColor: '#d33',
            });
        }
      }
    });
  };

  const handleStartEditCustomer = (customer: Customer) => {
    setEditingCustomer(customer);
    setNama(customer.nama);
    setNoHp(customer.noHp);
    setJenisLangganan(customer.jenisLangganan);
    setAlamat(customer.alamat);
    setHarga(customer.harga);
    setDueDateInput(customer.dueDate); // Set dueDateInput when editing
    setActiveMenu('input');
  };

  const handleDeleteCustomer = async (id: number) => {
    await Swal.fire({
      title: 'Apakah Anda yakin?',
      text: "Data pelanggan akan dihapus secara permanen!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Ya, hapus!',
      cancelButtonText: 'Batal'
    }).then(async (result: any) => {
      if (result.isConfirmed) {
        try {
            await onDeleteCustomer(id);
            Swal.fire(
                'Dihapus!',
                'Data pelanggan telah berhasil dihapus.',
                'success'
            );
        } catch (error: any) {
            console.error("Error deleting customer:", error.message);
            Swal.fire({
                title: 'Error!',
                text: `Gagal menghapus data pelanggan: ${error.message}`,
                icon: 'error',
                confirmButtonColor: '#d33',
            });
        }
      }
    });
  };

  const handlePayment = async (customer: Customer) => {
    if (customer.status === 'Lunas') return;

    const totalTagihan = Number(customer.harga) + customer.tunggakan;

    await Swal.fire({
      title: 'Pilih Metode Pembayaran',
      html: `Total tagihan untuk <strong>${customer.nama}</strong> adalah <strong>Rp ${totalTagihan.toLocaleString('id-ID')}</strong>.`,
      input: 'radio',
      inputOptions: {
        'Tunai': 'Tunai',
        'Transfer': 'Transfer'
      },
      inputValue: 'Tunai',
      showCancelButton: true,
      confirmButtonText: 'Konfirmasi Pembayaran',
      cancelButtonText: 'Batal',
      customClass: {
        popup: '!bg-gray-800 !text-white !rounded-lg',
        title: '!text-white',
        htmlContainer: '!text-gray-300',
        confirmButton: '!bg-green-600 hover:!bg-green-700',
        cancelButton: '!bg-gray-600 hover:!bg-gray-700',
        input: '!text-gray-300 !ml-[-1em] !mt-4',
        inputLabel: '!text-gray-300'
      },
      inputValidator: (value: any) => {
        if (!value) {
          return 'Anda harus memilih metode pembayaran!'
        }
      }
    }).then(async (result: any) => {
      if (result.isConfirmed && result.value) {
        const metodePembayaran = result.value;

        try {
            const newPaymentEntry = {
                deskripsi: `Pembayaran langganan - ${customer.nama}`,
                tanggal: new Date().toISOString().split('T')[0],
                kategori: 'Pemasukan' as const,
                metode: metodePembayaran,
                nominal: totalTagihan,
                user_id: userId,
            };
            await onAddUpdateFinanceEntry(newPaymentEntry);

            const nextDueDate = new Date();
            nextDueDate.setMonth(nextDueDate.getMonth() + 1);
            nextDueDate.setDate(24);
            const updatedCustomer = { 
                ...customer, 
                status: 'Lunas' as const, 
                tunggakan: 0, 
                dueDate: nextDueDate.toISOString().split('T')[0],
                user_id: userId,
            };
            await onAddUpdateCustomer(updatedCustomer);
            onPaymentSuccess(customer, totalTagihan);

            Swal.fire({
                icon: 'success',
                title: 'Pembayaran Berhasil',
                text: `Pembayaran untuk ${customer.nama} sebesar Rp ${totalTagihan.toLocaleString('id-ID')} (${metodePembayaran}) berhasil dicatat.`,
                customClass: {
                    popup: '!bg-gray-800 !text-white !rounded-lg',
                    title: '!text-white',
                    confirmButton: '!bg-blue-600 hover:!bg-blue-700',
                }
            }).then(() => {
                Swal.fire({
                    title: 'Kirim Notifikasi Lunas?',
                    text: `Kirim pemberitahuan pembayaran lunas ke ${customer.nama} melalui WhatsApp?`,
                    icon: 'question',
                    showCancelButton: true,
                    confirmButtonText: 'Ya, Kirim Notifikasi',
                    cancelButtonText: 'Jangan Kirim',
                    confirmButtonColor: '#25D366',
                    cancelButtonColor: '#6b7280',
                    customClass: {
                        popup: '!bg-gray-800 !text-white !rounded-lg',
                        title: '!text-white',
                        htmlContainer: '!text-gray-300',
                        confirmButton: '!bg-green-600 hover:!bg-green-700',
                        cancelButton: '!bg-gray-600 hover:!bg-gray-700',
                    },
                }).then((waResult: any) => {
                    if (waResult.isConfirmed) {
                        handleSendPaymentConfirmationWhatsApp(customer, totalTagihan);
                    }
                });
            });
        } catch (error: any) {
            console.error("Error processing payment:", error.message);
            Swal.fire({
                title: 'Error!',
                text: `Gagal memproses pembayaran: ${error.message}`,
                icon: 'error',
                confirmButtonColor: '#d33',
            });
        }
      }
    });
  };
  
  const handleNewBillingCycle = async () => {
    if (customers.length === 0) {
        Swal.fire({
          icon: 'error',
          title: 'Oops...',
          text: 'Tidak ada pelanggan untuk memulai siklus tagihan.',
        });
        return;
    }

    await Swal.fire({
      title: 'Mulai Siklus Tagihan Baru?',
      text: "Pelanggan yang belum lunas akan diakumulasikan tunggakannya dan semua status direset ke 'Belum Lunas'. Tanggal jatuh tempo akan diperbarui ke tanggal 24 bulan yang sama. Lanjutkan?",
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Ya, mulai!',
      cancelButtonText: 'Batal',
      customClass: {
        popup: '!bg-gray-800 !text-white !rounded-lg',
        title: '!text-white',
        htmlContainer: '!text-gray-300',
        confirmButton: '!bg-blue-600 hover:!bg-blue-700',
        cancelButton: '!bg-gray-600 hover:!bg-gray-700',
      },
    }).then(async (result: any) => {
      if (result.isConfirmed) {
        try {
            const updatedCustomersPromises = customers.map(c => {
                const newTunggakan = c.status === 'Belum Lunas' ? c.tunggakan + Number(c.harga) : c.tunggakan;
                
                const today = new Date();
                const currentMonthDueDate = new Date(today.getFullYear(), today.getMonth(), 24); 

                const updatedCustomer = {
                    ...c,
                    status: 'Belum Lunas' as const,
                    tunggakan: newTunggakan,
                    dueDate: currentMonthDueDate.toISOString().split('T')[0],
                    user_id: userId,
                };
                return onAddUpdateCustomer(updatedCustomer); // Use onAddUpdateCustomer for update
            });
            await Promise.all(updatedCustomersPromises); // Wait for all updates to complete

            Swal.fire(
              'Berhasil!',
              'Siklus tagihan baru telah dimulai. Semua status pelanggan direset menjadi "Belum Lunas" dan tanggal jatuh tempo diperbarui.',
              'success'
            );
        } catch (error: any) {
            console.error("Error starting new billing cycle:", error.message);
            Swal.fire({
                title: 'Error!',
                text: `Gagal memulai siklus tagihan baru: ${error.message}`,
                icon: 'error',
                confirmButtonColor: '#d33',
            });
        }
      }
    });
  };
    
  const handleSendWhatsApp = (customer: Customer) => {
    let formattedPhone = customer.noHp.trim();
    if (formattedPhone.startsWith('0')) {
        formattedPhone = '62' + formattedPhone.substring(1);
    }
    formattedPhone = formattedPhone.replace(/\D/g, '');

    const totalTagihan = Number(customer.harga) + customer.tunggakan;
    
    let paymentInfo = "Pembayaran dapat dilakukan melalui transfer atau tunai.";
    if (companyInfo.namaBank && companyInfo.nomorRekening && companyInfo.atasNama) {
        paymentInfo = `Mohon untuk segera melakukan pembayaran agar layanan Anda tetap berjalan lancar. Pembayaran dapat dilakukan melalui transfer ke rekening berikut:

*Bank:* ${companyInfo.namaBank}
*No. Rekening:* ${companyInfo.nomorRekening}
*Atas Nama:* ${companyInfo.atasNama}`;
    }

    const dueDateFormatted = new Date(customer.dueDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

    const message = encodeURIComponent(
`*Pemberitahuan Tagihan Internet*

Yth. Bpk/Ibu ${customer.nama},

Kami ingin mengingatkan mengenai tagihan layanan internet Anda untuk periode ini.

Rincian Tagihan:
- Jenis Langganan: ${customer.jenisLangganan}
- Total Tagihan: *Rp ${totalTagihan.toLocaleString('id-ID')}*
- Jatuh Tempo: *${dueDateFormatted}*

${paymentInfo}

Terima kasih atas perhatian dan kerjasamanya.

Hormat kami,
${companyInfo.name}`
    );

    const whatsappUrl = `https://wa.me/${formattedPhone}?text=${message}`;
    window.open(whatsappUrl, '_blank');
  };

  const handleSendPaymentConfirmationWhatsApp = (customer: Customer, amountPaid: number) => {
    let formattedPhone = customer.noHp.trim();
    if (formattedPhone.startsWith('0')) {
        formattedPhone = '62' + formattedPhone.substring(1);
    }
    formattedPhone = formattedPhone.replace(/\D/g, '');

    const message = encodeURIComponent(
`*Konfirmasi Pembayaran Lunas*

Yth. Bpk/Ibu ${customer.nama},

Terima kasih. Pembayaran tagihan Anda sebesar *Rp ${amountPaid.toLocaleString('id-ID')}* telah kami terima dan berhasil dicatat pada tanggal ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}.

Status tagihan Anda saat ini adalah *LUNAS*.

Kami sangat menghargai pembayaran tepat waktu Anda.

Hormat kami,
${companyInfo.name}`
    );

    const whatsappUrl = `https://wa.me/${formattedPhone}?text=${message}`;
    window.open(whatsappUrl, '_blank');
};

  const handleDownloadCustomerData = () => {
    if (filteredCustomers.length === 0) {
        Swal.fire({
            title: 'Tidak Ada Data',
            text: 'Tidak ada data pelanggan yang cocok dengan filter untuk diunduh.',
            icon: 'info',
            customClass: {
                popup: '!bg-gray-800 !text-white !rounded-lg',
                title: '!text-white',
                confirmButton: '!bg-blue-600 hover:!bg-blue-700',
            }
        });
        return;
    }

    try {
        const { jsPDF } = (window as any).jspdf; // Use window.jspdf
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();

        // --- HEADER ---
        if (companyInfo.logo) {
            try { doc.addImage(companyInfo.logo, 'PNG', 15, 10, 20, 20); } catch(e) {}
        }
        
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text(companyInfo.name, 40, 18);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(companyInfo.address, 40, 24);
        doc.text(companyInfo.phone ? `Telp: ${companyInfo.phone}` : '', 40, 29);

        doc.setLineWidth(0.5);
        doc.line(15, 35, pageWidth - 15, 35);

        // --- TITLE ---
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text(`DAFTAR PELANGGAN`, pageWidth / 2, 45, { align: 'center' });
        
        // --- FILTER INFO ---
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        let filterText = `Filter: Status (${filterStatus}), Jenis (${filterJenisLangganan})`;
        if(searchTerm) filterText += `, Pencarian ("${searchTerm}")`;
        doc.text(filterText, 15, 52);

        // --- TABLE ---
        const tableData = filteredCustomers.map((c, index) => {
            const totalTagihan = Number(c.harga) + c.tunggakan;
            const dueDateFormatted = new Date(c.dueDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
            
            return [
                (index + 1).toString(),
                c.nama,
                c.noHp,
                c.jenisLangganan,
                c.alamat,
                `Rp ${Number(c.harga).toLocaleString('id-ID')}`,
                c.status,
                `Rp ${c.tunggakan.toLocaleString('id-ID')}`,
                dueDateFormatted
            ];
        });

        (doc as any).autoTable({
            head: [['No', 'Nama', 'No HP', 'Jenis', 'Alamat', 'Harga', 'Status', 'Tunggakan', 'Jatuh Tempo']],
            body: tableData,
            startY: 55,
            theme: 'grid',
            headStyles: { fillColor: [44, 62, 80] },
            styles: { fontSize: 8, cellPadding: 2 },
            columnStyles: {
                0: { cellWidth: 10 },
                1: { cellWidth: 25 },
                2: { cellWidth: 25 },
                3: { cellWidth: 20 },
                4: { cellWidth: 'auto' }, // Alamat flexible
                5: { cellWidth: 20 },
                6: { cellWidth: 15 },
                7: { cellWidth: 20 },
                8: { cellWidth: 20 },
            }
        });

        // Save
        const date = new Date().toISOString().split('T')[0];
        doc.save(`daftar_pelanggan_${filterStatus}_${date}.pdf`);

    } catch (error) {
        console.error("Gagal membuat PDF:", error);
        Swal.fire({
            title: 'Gagal',
            text: 'Terjadi kesalahan saat membuat file PDF.',
            icon: 'error',
            customClass: {
                popup: '!bg-gray-800 !text-white !rounded-lg',
                title: '!text-white',
                confirmButton: '!bg-red-600 hover:!bg-red-700',
            }
        });
    }
  };

  const filteredFinanceHistory = financeHistory.filter(entry => {
    const entryDate = new Date(entry.tanggal);
    const startDate = filterStartDate ? new Date(filterStartDate) : null;
    const endDate = filterEndDate ? new Date(filterEndDate) : null;

    if(startDate) startDate.setUTCHours(0,0,0,0);
    if(endDate) endDate.setUTCHours(23,59,59,999);
    
    const dateMatch = (!startDate || entryDate >= startDate) && (!endDate || entryDate <= endDate);

    const searchMatch = !financeSearchTerm ||
        entry.deskripsi.toLowerCase().includes(financeSearchTerm.toLowerCase()) ||
        String(entry.nominal).includes(financeSearchTerm);
        
    return dateMatch && searchMatch;
  });

  // Fix: The previous comment indicated a syntax error.
  // The root `return` of `renderCustomerList` should be a single JSX element or `React.Fragment`.
  const renderCustomerList = () => {
    if (customers.length === 0) {
      return (
        <div className="text-center text-gray-400 mt-8">
          <p>Belum ada data pelanggan yang diinput.</p>
          <p>Silakan tambahkan pelanggan baru melalui menu "Input Pelanggan Baru".</p>
        </div>
      );
    }

    if (filteredCustomers.length === 0) {
      return (
        <div className="text-center text-gray-400 mt-8">
          <p>Tidak ada data pelanggan yang cocok dengan filter Anda.</p>
        </div>
      );
    }
    
    return (
      <div className="space-y-4 md:hidden">
      {filteredCustomers.map((customer, index) => {
        const totalTagihan = Number(customer.harga) + customer.tunggakan;
        const dueDateFormatted = new Date(customer.dueDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
        const isOverdue = customer.status === 'Belum Lunas' && new Date(customer.dueDate) < new Date(new Date().setHours(0,0,0,0));

        return (
          <div key={customer.id} className="bg-white/5 p-4 rounded-lg shadow">
            <div className="flex justify-between items-start">
              <span className="font-bold text-lg text-white">#{index + 1}. {customer.nama}</span>
              <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                  customer.status === 'Lunas' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'
              }`}>
                  {customer.status}
              </span>
            </div>
            <div className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-400">Jenis Langganan</span><span>{customer.jenisLangganan}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">Harga</span><span>Rp {Number(customer.harga).toLocaleString('id-ID')}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">Tunggakan</span><span>Rp {customer.tunggakan.toLocaleString('id-ID')}</span></div>
              <div className="flex justify-between font-bold text-base"><span className="text-gray-300">Total Tagihan</span><span>Rp {totalTagihan.toLocaleString('id-ID')}</span></div>
              <div className="flex justify-between">
                  <span className="text-gray-400">Jatuh Tempo</span>
                  <span className={isOverdue ? 'text-red-400 font-semibold' : 'text-white'}>
                      {dueDateFormatted} {isOverdue && '(Terlambat)'}
                  </span>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-gray-700 flex justify-between items-center gap-2">
              <div className="flex-1 flex gap-2">
                 <button 
                      onClick={() => handlePayment(customer)} 
                      disabled={customer.status === 'Lunas'}
                      className="flex-1 font-medium text-green-400 hover:text-green-300 disabled:text-gray-500 disabled:cursor-not-allowed transition-colors text-xs py-2 px-2 rounded bg-green-500/10 hover:bg-green-500/20 disabled:bg-gray-500/10"
                  >
                      Bayar
                  </button>
                  <button 
                      onClick={() => handleStartEditCustomer(customer)} 
                      className="flex-1 font-medium text-blue-400 hover:text-blue-300 transition-colors text-xs py-2 px-2 rounded bg-blue-500/10 hover:bg-blue-500/20"
                  >
                      Edit
                  </button>
                  <button 
                      onClick={() => handleDeleteCustomer(customer.id)} 
                      className="flex-1 font-medium text-red-400 hover:text-red-300 transition-colors text-xs py-2 px-2 rounded bg-red-500/10 hover:bg-red-500/20"
                  >
                      Hapus
                  </button>
              </div>
              <div className="flex gap-2">
                  <button 
                    onClick={() => onGenerateInvoice(customer)} 
                    className="font-medium text-purple-400 hover:text-purple-300 transition-colors p-2 rounded-full bg-purple-500/10 hover:bg-purple-500/20"
                    title="Buat Invoice"
                  >
                    <DocumentIcon className="w-5 h-5" />
                  </button>
                  {customer.status === 'Belum Lunas' && (
                    <button 
                      onClick={() => handleSendWhatsApp(customer)} 
                      className="font-medium text-teal-400 hover:text-teal-300 transition-colors p-2 rounded-full bg-teal-500/10 hover:bg-teal-500/20"
                      title="Kirim Pengingat Tagihan WhatsApp"
                    >
                      <WhatsappIcon className="w-5 h-5" />
                    </button>
                  )}
              </div>
            </div>
          </div>
        );
      })}
      </div>
    );
  }

  const renderCustomerTable = () => {
    return (
      <div className="overflow-x-auto hidden md:block">
        <table className="min-w-full text-sm text-left text-gray-300">
          <thead className="text-xs text-white uppercase bg-white/10">
            <tr>
              <th scope="col" className="px-6 py-3">No.</th>
              <th scope="col" className="px-6 py-3">Nama Pelanggan</th>
              <th scope="col" className="px-6 py-3">Jenis Langganan</th>
              <th scope="col" className="px-6 py-3">Status</th>
              <th scope="col" className="px-6 py-3 text-right">Harga (Rp)</th>
              <th scope="col" className="px-6 py-3 text-right">Tunggakan (Rp)</th>
              <th scope="col" className="px-6 py-3 text-right">Total Tagihan (Rp)</th>
              <th scope="col" className="px-6 py-3 text-right">Jatuh Tempo</th>
              <th scope="col" className="px-6 py-3 text-center">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {filteredCustomers.map((customer, index) => {
              const totalTagihan = Number(customer.harga) + customer.tunggakan;
              const dueDateFormatted = new Date(customer.dueDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
              const isOverdue = customer.status === 'Belum Lunas' && new Date(customer.dueDate) < new Date(new Date().setHours(0,0,0,0));

              return (
              <tr key={customer.id} className="border-b border-gray-700 hover:bg-white/5">
                <td className="px-6 py-4">{index + 1}</td>
                <th scope="row" className="px-6 py-4 font-medium text-white whitespace-nowrap">{customer.nama}</th>
                <td className="px-6 py-4">{customer.jenisLangganan}</td>
                 <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        customer.status === 'Lunas' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'
                    }`}>
                        {customer.status}
                    </span>
                     {customer.status === 'Belum Lunas' && (
                        <button 
                            onClick={() => handleSendWhatsApp(customer)} 
                            className="font-medium text-teal-400 hover:text-teal-300 transition-colors p-1 rounded-full bg-teal-500/10 hover:bg-teal-500/20"
                            title="Kirim Pengingat Tagihan WhatsApp"
                        >
                            <WhatsappIcon className="w-4 h-4" />
                        </button>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 text-right">{Number(customer.harga).toLocaleString('id-ID')}</td>
                <td className="px-6 py-4 text-right">{customer.tunggakan.toLocaleString('id-ID')}</td>
                <td className="px-6 py-4 text-right font-bold">{totalTagihan.toLocaleString('id-ID')}</td>
                <td className={`px-6 py-4 text-right ${isOverdue ? 'text-red-400 font-semibold' : 'text-white'}`}>
                  {dueDateFormatted}
                </td>
                <td className="px-6 py-4 text-center space-x-2">
                    <button 
                        onClick={() => handlePayment(customer)} 
                        disabled={customer.status === 'Lunas'}
                        className="font-medium text-green-400 hover:text-green-300 disabled:text-gray-500 disabled:cursor-not-allowed transition-colors text-xs py-1 px-2 rounded bg-green-500/10 hover:bg-green-500/20 disabled:bg-gray-500/10"
                    >
                        Bayar
                    </button>
                    <button 
                        onClick={() => handleStartEditCustomer(customer)} 
                        className="font-medium text-blue-400 hover:text-blue-300 transition-colors text-xs py-1 px-2 rounded bg-blue-500/10 hover:bg-blue-500/20"
                    >
                        Edit
                    </button>
                    <button 
                        onClick={() => handleDeleteCustomer(customer.id)} 
                        className="font-medium text-red-400 hover:text-red-300 transition-colors text-xs py-1 px-2 rounded bg-red-500/10 hover:bg-red-500/20"
                    >
                        Hapus
                    </button>
                    <button 
                        onClick={() => onGenerateInvoice(customer)} 
                        className="font-medium text-purple-400 hover:text-purple-300 transition-colors text-xs py-1 px-2 rounded bg-purple-500/10 hover:bg-purple-500/20"
                        title="Buat Invoice"
                    >
                        Invoice
                    </button>
                </td>
              </tr>
            )})}
          </tbody>
        </table>
      </div>
    );
  }

  // Fix: Removed the misplaced `</main>` and `</div>` tags that were incorrectly closing the parent component's JSX
  // within this function's return statement.
  const renderFinanceHistory = () => {
    if (financeHistory.length === 0) {
        return (
            <div className="text-center text-gray-400 mt-8">
                <p>Belum ada riwayat transaksi yang tercatat.</p>
                <p>Silakan tambahkan catatan baru melalui menu "Catatan Keuangan".</p>
            </div>
        );
    }
    
    // Calculate summary
    let totalPemasukan = 0;
    let totalPengeluaran = 0;
    let pemasukanTunai = 0;
    let pemasukanTransfer = 0;
    let pengeluaranTunai = 0;
    let pengeluaranTransfer = 0;
    
    filteredFinanceHistory.forEach(entry => {
        if (entry.kategori === 'Pemasukan') {
            totalPemasukan += entry.nominal;
            if (entry.metode === 'Tunai') {
                pemasukanTunai += entry.nominal;
            } else if (entry.metode === 'Transfer') {
                pemasukanTransfer += entry.nominal;
            }
        } else if (entry.kategori === 'Pengeluaran') {
            totalPengeluaran += entry.nominal;
            if (entry.metode === 'Tunai') {
                pengeluaranTunai += entry.nominal;
            } else if (entry.metode === 'Transfer') {
                pengeluaranTransfer += entry.nominal;
            }
        }
    });
    
    const saldoKeseluruhan = totalPemasukan - totalPengeluaran;

    return (
      <React.Fragment>
        {/* Filter Section */}
        <div className="flex flex-col sm:flex-row flex-wrap gap-4 mb-6 p-4 bg-white/5 rounded-lg items-end">
            <div className="flex-grow w-full sm:w-auto" style={{ minWidth: '200px' }}>
                <label htmlFor="financeSearch" className="block text-sm font-medium text-gray-400 mb-1">Cari Transaksi</label>
                <input
                  type="text"
                  id="financeSearch"
                  placeholder="Cari deskripsi atau nominal..."
                  value={financeSearchTerm}
                  onChange={(e) => setFinanceSearchTerm(e.target.value)}
                  className="w-full pl-4 pr-3 py-2 text-white bg-white/10 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-blue-400 focus:outline-none transition duration-300 placeholder-gray-400"
                />
            </div>
            <div className="flex-grow w-full sm:w-auto">
                <label htmlFor="filterStartDate" className="block text-sm font-medium text-gray-400 mb-1">Dari Tanggal</label>
                <input
                  type="date"
                  id="filterStartDate"
                  value={filterStartDate}
                  onChange={(e) => setFilterStartDate(e.target.value)}
                  className="w-full pl-4 pr-3 py-2 text-white bg-white/10 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-blue-400 focus:outline-none transition duration-300"
                />
            </div>
            <div className="flex-grow w-full sm:w-auto">
                <label htmlFor="filterEndDate" className="block text-sm font-medium text-gray-400 mb-1">Sampai Tanggal</label>
                <input
                  type="date"
                  id="filterEndDate"
                  value={filterEndDate}
                  onChange={(e) => setFilterEndDate(e.target.value)}
                  className="w-full pl-4 pr-3 py-2 text-white bg-white/10 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-blue-400 focus:outline-none transition duration-300"
                />
            </div>
            <div className="w-full sm:w-auto">
                <button
                    onClick={() => setIsHistoryVisible(!isHistoryVisible)}
                    className="w-full py-2 px-5 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-sky-600 hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-sky-500 transition-colors"
                >
                    {isHistoryVisible ? 'Sembunyikan' : 'Tampilkan'}
                </button>
            </div>
        </div>
        
        {isHistoryVisible && (
          <React.Fragment>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-green-500/10 p-4 rounded-lg">
                    <p className="text-sm text-green-400 font-semibold">Total Pemasukan</p>
                    <p className="text-xl font-bold text-white">Rp {totalPemasukan.toLocaleString('id-ID')}</p>
                    <div className="mt-2 text-xs text-gray-300 space-y-1">
                        <p>Tunai: Rp {pemasukanTunai.toLocaleString('id-ID')}</p>
                        <p>Transfer: Rp {pemasukanTransfer.toLocaleString('id-ID')}</p>
                    </div>
                </div>
                <div className="bg-red-500/10 p-4 rounded-lg">
                    <p className="text-sm text-red-400 font-semibold">Total Pengeluaran</p>
                    <p className="text-xl font-bold text-white">Rp {totalPengeluaran.toLocaleString('id-ID')}</p>
                    <div className="mt-2 text-xs text-gray-300 space-y-1">
                        <p>Tunai: Rp {pengeluaranTunai.toLocaleString('id-ID')}</p>
                        <p>Transfer: Rp {pengeluaranTransfer.toLocaleString('id-ID')}</p>
                    </div>
                </div>
                <div className="bg-sky-500/10 p-4 rounded-lg">
                    <p className="text-sm text-sky-400 font-semibold">Saldo (sesuai filter)</p>
                    <p className={`text-xl font-bold ${saldoKeseluruhan >= 0 ? 'text-white' : 'text-red-400'}`}>
                        Rp {saldoKeseluruhan.toLocaleString('id-ID')}
                    </p>
                </div>
            </div>

            {filteredFinanceHistory.length === 0 ? (
              <div className="text-center text-gray-400 mt-8">
                <p>Tidak ada data transaksi yang cocok dengan filter tanggal Anda.</p>
              </div>
            ) : (
              <React.Fragment>
                {/* Mobile Card View */}
                <div className="space-y-4 md:hidden">
                  {filteredFinanceHistory.map(entry => (
                    <div key={entry.id} className="bg-white/5 p-4 rounded-lg shadow">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <p className="font-bold text-base text-white break-words">{entry.deskripsi}</p>
                          <p className="text-xs text-gray-400">{new Date(entry.tanggal).toLocaleDateString('id-ID', { timeZone: 'UTC', day: '2-digit', month: 'long', year: 'numeric' })}</p>
                        </div>
                         <span className={`ml-2 flex-shrink-0 px-2 py-1 rounded-full text-xs font-semibold ${
                            entry.kategori === 'Pemasukan' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                        }`}>
                            {entry.kategori}
                        </span>
                      </div>
                      <div className="mt-3 flex justify-between items-center">
                        <p className="text-sm text-gray-300">{entry.metode}</p>
                        <p className={`text-lg font-semibold ${entry.kategori === 'Pemasukan' ? 'text-green-400' : 'text-red-400'}`}>
                          {entry.kategori === 'Pemasukan' ? '+' : '-'} Rp {entry.nominal.toLocaleString('id-ID')}
                        </p>
                      </div>
                       <div className="mt-4 pt-3 border-t border-gray-700 flex justify-end items-center gap-4">
                          <button onClick={() => handleStartEdit(entry)} className="font-medium text-blue-400 hover:text-blue-300 transition-colors">Edit</button>
                          <button onClick={() => handleDeleteEntry(entry.id)} className="font-medium text-red-400 hover:text-red-300 transition-colors">Hapus</button>
                       </div>
                    </div>
                  ))}
                </div>

                {/* Desktop Table View */}
                <div className="overflow-x-auto hidden md:block">
                  <table className="min-w-full text-sm text-left text-gray-300">
                      <thead className="text-xs text-white uppercase bg-white/10">
                          <tr>
                              <th scope="col" className="px-6 py-3">Tanggal</th>
                              <th scope="col" className="px-6 py-3">Deskripsi</th>
                              <th scope="col" className="px-6 py-3">Kategori</th>
                              <th scope="col" className="px-6 py-3">Metode</th>
                              <th scope="col" className="px-6 py-3 text-right">Nominal (Rp)</th>
                              <th scope="col" className="px-6 py-3 text-center">Aksi</th>
                          </tr>
                      </thead>
                      <tbody>
                          {filteredFinanceHistory.map((entry) => (
                              <tr key={entry.id} className="border-b border-gray-700 hover:bg-white/5">
                                  <td className="px-6 py-4">{new Date(entry.tanggal).toLocaleDateString('id-ID', { timeZone: 'UTC', day: '2-digit', month: 'long', year: 'numeric' })}</td>
                                  <th scope="row" className="px-6 py-4 font-medium text-white whitespace-nowrap">{entry.deskripsi}</th>
                                  <td className="px-6 py-4">
                                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                          entry.kategori === 'Pemasukan' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                                      }`}>
                                          {entry.kategori}
                                      </span>
                                  </td>
                                  <td className="px-6 py-4">{entry.metode}</td>
                                  <td className={`px-6 py-4 text-right font-semibold ${entry.kategori === 'Pemasukan' ? 'text-green-400' : 'text-red-400'}`}>
                                      {entry.kategori === 'Pemasukan' ? '+' : '-'} {entry.nominal.toLocaleString('id-ID')}
                                  </td>
                                  <td className="px-6 py-4 text-center space-x-4">
                                    <button onClick={() => handleStartEdit(entry)} className="font-medium text-blue-400 hover:text-blue-300 transition-colors">Edit</button>
                                    <button onClick={() => handleDeleteEntry(entry.id)} className="font-medium text-red-400 hover:text-red-300 transition-colors">Hapus</button>
                                  </td>
                              </tr>
                          ))}
                      </tbody>
                  </table>
              </div>
            </React.Fragment>
            )}
          </React.Fragment>
        )}
      </React.Fragment>
    );
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
      
      <main className="flex-grow flex flex-col bg-black/20 rounded-lg p-6 sm:p-8 space-y-8">
        {activeMenu === 'daftar' && (
          <React.Fragment>
            {/* Filter Section */}
            <div className="flex flex-col sm:flex-row flex-wrap gap-4 mb-6 p-4 bg-white/5 rounded-lg items-end">
              <div className="flex-grow w-full sm:w-auto" style={{ minWidth: '150px' }}>
                <label htmlFor="searchCustomer" className="block text-sm font-medium text-gray-400 mb-1">Cari Pelanggan</label>
                <input
                  type="text"
                  id="searchCustomer"
                  placeholder="Nama atau No. HP..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-4 pr-3 py-2 text-white bg-white/10 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-blue-400 focus:outline-none transition duration-300 placeholder-gray-400"
                />
              </div>
              <div className="flex-grow w-full sm:w-auto">
                <label htmlFor="filterJenisLangganan" className="block text-sm font-medium text-gray-400 mb-1">Jenis Langganan</label>
                <select
                  id="filterJenisLangganan"
                  value={filterJenisLangganan}
                  onChange={(e) => setFilterJenisLangganan(e.target.value)}
                  className="w-full pl-4 pr-3 py-2 text-white bg-white/10 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-blue-400 focus:outline-none transition duration-300"
                >
                  <option>Semua</option>
                  <option>PPPoE</option>
                  <option>Hotspot</option>
                  <option>Dedicated</option>
                </select>
              </div>
              <div className="flex-grow w-full sm:w-auto">
                <label htmlFor="filterStatus" className="block text-sm font-medium text-gray-400 mb-1">Status Pembayaran</label>
                <select
                  id="filterStatus"
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full pl-4 pr-3 py-2 text-white bg-white/10 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-blue-400 focus:outline-none transition duration-300"
                >
                  <option>Semua</option>
                  <option>Lunas</option>
                  <option>Belum Lunas</option>
                </select>
              </div>
              <div className="w-full sm:w-auto">
                <button
                  onClick={() => setIsListVisible(!isListVisible)}
                  className="w-full py-2 px-5 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-sky-600 hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-sky-500 transition-colors"
                >
                  {isListVisible ? 'Sembunyikan' : 'Tampilkan'}
                </button>
              </div>
            </div>
            
            {isListVisible && (
                <React.Fragment>
                    {customers.length === 0 ? (
                        <div className="text-center text-gray-400 mt-8">
                            <p>Belum ada data pelanggan yang diinput.</p>
                            <p>Silakan tambahkan pelanggan baru melalui menu "Input Pelanggan Baru".</p>
                        </div>
                    ) : (
                        <React.Fragment>
                            {renderCustomerTable()}
                            {renderCustomerList()}
                        </React.Fragment>
                    )}
                </React.Fragment>
            )}
            <div className="mt-8 flex flex-col sm:flex-row gap-4">
              <button
                onClick={handleNewBillingCycle}
                className="w-full sm:w-auto py-2 px-4 bg-yellow-600 hover:bg-yellow-700 rounded-lg text-white font-medium transition-colors"
              >
                Mulai Siklus Tagihan Baru
              </button>
              <button
                onClick={handleDownloadCustomerData}
                className="w-full sm:w-auto flex items-center justify-center gap-2 py-2 px-4 bg-green-600 hover:bg-green-700 rounded-lg text-white font-medium transition-colors"
              >
                <DownloadIcon className="w-5 h-5" /> Unduh Data Pelanggan (PDF)
              </button>
            </div>
          </React.Fragment>
        )}

        {activeMenu === 'input' && (
          <div className="bg-white/5 p-6 rounded-lg">
            <h2 className="text-2xl font-semibold mb-6 text-sky-400">{editingCustomer ? 'Edit Pelanggan' : 'Input Pelanggan Baru'}</h2>
            <form onSubmit={handleCustomerFormSubmit} className="space-y-4">
              <div>
                <label htmlFor="nama" className="block text-sm font-medium text-gray-300 mb-1">Nama Pelanggan</label>
                <input
                  type="text"
                  id="nama"
                  value={nama}
                  onChange={(e) => setNama(e.target.value)}
                  required
                  className="w-full pl-4 pr-3 py-2 text-white bg-white/10 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-blue-400 focus:outline-none transition duration-300 placeholder-gray-400"
                  placeholder="Nama lengkap pelanggan"
                />
              </div>
              <div>
                <label htmlFor="noHp" className="block text-sm font-medium text-gray-300 mb-1">Nomor HP (WhatsApp)</label>
                <input
                  type="tel"
                  id="noHp"
                  value={noHp}
                  onChange={(e) => setNoHp(e.target.value)}
                  required
                  className="w-full pl-4 pr-3 py-2 text-white bg-white/10 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-blue-400 focus:outline-none transition duration-300 placeholder-gray-400"
                  placeholder="Contoh: 081234567890"
                />
              </div>
              <div>
                <label htmlFor="jenisLangganan" className="block text-sm font-medium text-gray-300 mb-1">Jenis Langganan</label>
                <select
                  id="jenisLangganan"
                  value={jenisLangganan}
                  onChange={(e) => setJenisLangganan(e.target.value)}
                  className="w-full pl-4 pr-3 py-2 text-white bg-white/10 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-blue-400 focus:outline-none transition duration-300"
                >
                  <option>PPPoE</option>
                  <option>Hotspot</option>
                  <option>Dedicated</option>
                </select>
              </div>
              <div>
                <label htmlFor="alamat" className="block text-sm font-medium text-gray-300 mb-1">Alamat Pemasangan</label>
                <textarea
                  id="alamat"
                  value={alamat}
                  onChange={(e) => setAlamat(e.target.value)}
                  required
                  rows={3}
                  className="w-full pl-4 pr-3 py-2 text-white bg-white/10 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-blue-400 focus:outline-none transition duration-300 placeholder-gray-400"
                  placeholder="Alamat lengkap pemasangan internet"
                ></textarea>
              </div>
              <div>
                <label htmlFor="harga" className="block text-sm font-medium text-gray-300 mb-1">Harga Langganan (Rp)</label>
                <input
                  type="number"
                  id="harga"
                  value={harga}
                  onChange={(e) => setHarga(e.target.value)}
                  required
                  className="w-full pl-4 pr-3 py-2 text-white bg-white/10 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-blue-400 focus:outline-none transition duration-300 placeholder-gray-400"
                  placeholder="0"
                />
              </div>
              <div>
                <label htmlFor="dueDate" className="block text-sm font-medium text-gray-300 mb-1">Tanggal Jatuh Tempo</label>
                <input
                  type="date"
                  id="dueDate"
                  value={dueDateInput}
                  onChange={(e) => setDueDateInput(e.target.value)}
                  required
                  className="w-full pl-4 pr-3 py-2 text-white bg-white/10 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-blue-400 focus:outline-none transition duration-300"
                />
              </div>
              <div className="flex gap-4">
                <button
                  type="submit"
                  className="flex-grow py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-blue-500 transition-transform transform hover:scale-105"
                >
                  {editingCustomer ? 'Perbarui Pelanggan' : 'Tambah Pelanggan'}
                </button>
                {editingCustomer && (
                  <button
                    type="button"
                    onClick={resetCustomerForm}
                    className="flex-grow py-3 px-4 border border-gray-500 rounded-lg shadow-sm text-sm font-medium text-white hover:bg-gray-700/50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-gray-500 transition-colors"
                  >
                    Batal Edit
                  </button>
                )}
              </div>
            </form>
          </div>
        )}

        {activeMenu === 'keuangan' && (
          <div className="bg-white/5 p-6 rounded-lg">
            <h2 className="text-2xl font-semibold mb-6 text-sky-400">{editingEntry ? 'Edit Catatan Keuangan' : 'Input Catatan Keuangan Baru'}</h2>
            <form onSubmit={handleFinanceFormSubmit} className="space-y-4">
              <div>
                <label htmlFor="deskripsi" className="block text-sm font-medium text-gray-300 mb-1">Deskripsi</label>
                <input
                  type="text"
                  id="deskripsi"
                  value={deskripsi}
                  onChange={(e) => setDeskripsi(e.target.value)}
                  required
                  className="w-full pl-4 pr-3 py-2 text-white bg-white/10 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-blue-400 focus:outline-none transition duration-300 placeholder-gray-400"
                  placeholder="Contoh: Pembelian router, Gaji karyawan"
                />
              </div>
              <div>
                <label htmlFor="tanggal" className="block text-sm font-medium text-gray-300 mb-1">Tanggal</label>
                <input
                  type="date"
                  id="tanggal"
                  value={tanggal}
                  onChange={(e) => setTanggal(e.target.value)}
                  required
                  className="w-full pl-4 pr-3 py-2 text-white bg-white/10 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-blue-400 focus:outline-none transition duration-300"
                />
              </div>
              <div>
                <label htmlFor="kategori" className="block text-sm font-medium text-gray-300 mb-1">Kategori</label>
                <select
                  id="kategori"
                  value={kategori}
                  onChange={(e) => setKategori(e.target.value)}
                  className="w-full pl-4 pr-3 py-2 text-white bg-white/10 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-blue-400 focus:outline-none transition duration-300"
                >
                  <option>Pemasukan</option>
                  <option>Pengeluaran</option>
                </select>
              </div>
              <div>
                <label htmlFor="metode" className="block text-sm font-medium text-gray-300 mb-1">Metode Pembayaran/Transaksi</label>
                <select
                  id="metode"
                  value={metode}
                  onChange={(e) => setMetode(e.target.value)}
                  className="w-full pl-4 pr-3 py-2 text-white bg-white/10 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-blue-400 focus:outline-none transition duration-300"
                >
                  <option>Transfer</option>
                  <option>Tunai</option>
                  <option>Internal</option> {/* For kas cadangan transfers */}
                </select>
              </div>
              <div>
                <label htmlFor="nominal" className="block text-sm font-medium text-gray-300 mb-1">Nominal (Rp)</label>
                <input
                  type="number"
                  id="nominal"
                  value={nominal}
                  onChange={(e) => setNominal(e.target.value)}
                  required
                  className="w-full pl-4 pr-3 py-2 text-white bg-white/10 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-blue-400 focus:outline-none transition duration-300 placeholder-gray-400"
                  placeholder="0"
                />
              </div>
              <div className="flex gap-4">
                <button
                  type="submit"
                  className="flex-grow py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-blue-500 transition-transform transform hover:scale-105"
                >
                  {editingEntry ? 'Perbarui Catatan' : 'Tambah Catatan'}
                </button>
                {editingEntry && (
                  <button
                    type="button"
                    onClick={resetFinanceForm}
                    className="flex-grow py-3 px-4 border border-gray-500 rounded-lg shadow-sm text-sm font-medium text-white hover:bg-gray-700/50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-gray-500 transition-colors"
                  >
                    Batal Edit
                  </button>
                )}
              </div>
            </form>
          </div>
        )}

        {activeMenu === 'riwayat' && (
          renderFinanceHistory()
        )}
      </main>
    </div>
  );
};

export default SirekapPage;
