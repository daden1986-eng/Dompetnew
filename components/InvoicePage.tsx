import React, { useState, useEffect } from 'react';
import ArrowLeftIcon from './icons/ArrowLeftIcon';
import DownloadIcon from './icons/DownloadIcon';
import WhatsappIcon from './icons/WhatsappIcon';
import { CompanyInfo } from '../App'; // Import CompanyInfo from App.tsx
import Swal from 'sweetalert2'; // Import Swal for consistent module loading

// Removed declare const jspdf: any;

interface InvoiceItem {
    id: number;
    description: string;
    qty: number;
    price: number;
}

export interface InvoiceInitialData {
    recipient: string;
    recipientPhone: string;
    items: InvoiceItem[];
    invoiceDueDate?: string; // Added invoiceDueDate
}

interface InvoicePageProps {
  onBack: () => void;
  companyInfo: CompanyInfo;
  initialData?: InvoiceInitialData | null;
}

const DRAFT_KEY = 'invoiceDraft';

const InvoicePage: React.FC<InvoicePageProps> = ({ onBack, companyInfo, initialData }) => {
    const [recipient, setRecipient] = useState('');
    const [recipientPhone, setRecipientPhone] = useState('');
    const [items, setItems] = useState<InvoiceItem[]>([
        { id: 1, description: '', qty: 1, price: 0 }
    ]);
    const [invoiceDueDate, setInvoiceDueDate] = useState<string>(() => {
        // Default to 24th of current/next month
        const today = new Date();
        let defaultDate = new Date(today.getFullYear(), today.getMonth(), 24);
        if (today.getDate() > 24) {
            defaultDate.setMonth(defaultDate.getMonth() + 1);
        }
        return defaultDate.toISOString().split('T')[0];
    });

    // Utility function to check if localStorage is available and accessible
    const isLocalStorageAvailable = (): boolean => {
      try {
        const testKey = '__test_localStorage__';
        localStorage.setItem(testKey, testKey);
        localStorage.removeItem(testKey);
        return true;
      } catch (e) {
        return false;
      }
    }
    
    // Load draft from localStorage on initial render OR use initialData
    useEffect(() => {
        if (initialData) {
            setRecipient(initialData.recipient);
            setRecipientPhone(initialData.recipientPhone);
            setItems(initialData.items);
            if (initialData.invoiceDueDate) {
                setInvoiceDueDate(initialData.invoiceDueDate);
            }
        } else {
            if (!isLocalStorageAvailable()) return;
            try {
                const savedDraft = localStorage.getItem(DRAFT_KEY);
                if (savedDraft) {
                    const draft = JSON.parse(savedDraft);
                    if (draft.recipient) setRecipient(draft.recipient);
                    if (draft.recipientPhone) setRecipientPhone(draft.recipientPhone);
                    if (draft.items && draft.items.length > 0) {
                        setItems(draft.items);
                    }
                    if (draft.invoiceDueDate) {
                        setInvoiceDueDate(draft.invoiceDueDate);
                    }
                }
            } catch (error) {
                console.error("Gagal memuat draf invoice, memulai dengan formulir kosong.", error);
            }
        }
    }, [initialData]);

    // Save draft to localStorage whenever it changes
    useEffect(() => {
        if (!isLocalStorageAvailable()) return;
        const draft = {
            recipient,
            recipientPhone,
            items,
            invoiceDueDate, // Include invoiceDueDate in draft
        };
        // Only save if there's something meaningful to save
        if (recipient || recipientPhone || items.some(item => item.description || item.price > 0) || invoiceDueDate) {
            localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
        } else {
            // If the form is completely empty, remove the draft to keep storage clean
            localStorage.removeItem(DRAFT_KEY);
        }
    }, [recipient, recipientPhone, items, invoiceDueDate]);

    const handleItemChange = (index: number, field: keyof Omit<InvoiceItem, 'id'>, value: string | number) => {
        const newItems = [...items];
        const numericValue = typeof value === 'string' ? parseFloat(value) : value;
        if (field === 'description') {
             (newItems[index] as any)[field] = value;
        } else {
            (newItems[index] as any)[field] = isNaN(numericValue) ? 0 : numericValue;
        }
        setItems(newItems);
    };
    
    const addItem = () => {
        setItems([...items, { id: Date.now(), description: '', qty: 1, price: 0 }]);
    };
    
    const removeItem = (id: number) => {
        setItems(items.filter(item => item.id !== id));
    };
    
    const calculateGrandTotal = () => {
        return items.reduce((total, item) => total + (item.qty * item.price), 0);
    };

    const handleClearForm = () => {
        Swal.fire({
            title: 'Bersihkan Formulir?',
            text: "Semua data pada invoice ini akan dihapus.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Ya, bersihkan!',
            cancelButtonText: 'Batal',
            customClass: {
                popup: '!bg-gray-800 !text-white !rounded-lg',
                title: '!text-white',
                confirmButton: '!bg-red-600 hover:!bg-red-700',
                cancelButton: '!bg-gray-600 hover:!bg-gray-700',
            },
        }).then((result: any) => {
            if (result.isConfirmed) {
                setRecipient('');
                setRecipientPhone('');
                setItems([{ id: Date.now(), description: '', qty: 1, price: 0 }]);
                const today = new Date();
                let defaultDate = new Date(today.getFullYear(), today.getMonth(), 24);
                if (today.getDate() > 24) {
                    defaultDate.setMonth(defaultDate.getMonth() + 1);
                }
                setInvoiceDueDate(defaultDate.toISOString().split('T')[0]); // Reset to default
                if (isLocalStorageAvailable()) {
                    localStorage.removeItem(DRAFT_KEY);
                }
            }
        });
    };

    const handleSendWhatsApp = () => {
        let formattedPhone = recipientPhone.trim();
        if (formattedPhone.startsWith('0')) {
            formattedPhone = '62' + formattedPhone.substring(1);
        }
        formattedPhone = formattedPhone.replace(/\D/g, '');

        const grandTotal = calculateGrandTotal();
        const dueDateFormatted = new Date(invoiceDueDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

        const message = encodeURIComponent(
`*Invoice Pemberitahuan*

Yth. Bpk/Ibu ${recipient},

Dengan hormat, kami sampaikan rincian tagihan Anda sebagai berikut:

*Total Tagihan: Rp ${grandTotal.toLocaleString('id-ID')}*
*Jatuh Tempo: ${dueDateFormatted}*

Invoice resmi dalam format PDF juga telah kami siapkan. Mohon konfirmasi jika Anda memerlukan salinan PDF untuk pencatatan Anda.

Terima kasih atas perhatian dan kerjasamanya.

Hormat kami,
*${companyInfo.name}*`
        );

        const whatsappUrl = `https://wa.me/${formattedPhone}?text=${message}`;
        window.open(whatsappUrl, '_blank');
    };

    const handleDownloadPDF = () => {
        const { jsPDF } = (window as any).jspdf; // Use window.jspdf
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();

        // === HEADER ===
        if (companyInfo.logo) {
            try {
                doc.addImage(companyInfo.logo, 'PNG', 15, 15, 25, 25);
            } catch(e) { console.error("Error adding logo:", e); }
        }
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.text(companyInfo.name, 45, 22);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(companyInfo.address, 45, 28);
        doc.text(`Telp: ${companyInfo.phone}`, 45, 33);

        doc.setFontSize(22);
        doc.setFont('helvetica', 'bold');
        doc.text('INVOICE', pageWidth - 15, 25, { align: 'right' });
        
        doc.setLineWidth(0.5);
        doc.line(15, 40, pageWidth - 15, 40);

        // === INVOICE DETAILS ===
        const invoiceNumber = `INV-${Date.now()}`;
        const today = new Date();
        const todayString = today.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
        
        // Use the invoiceDueDate from state
        const displayDueDate = new Date(invoiceDueDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
        
        let startY = 55;

        // Left Column (Recipient Info)
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text('DITAGIHKAN KEPADA:', 15, startY);
        doc.setFont('helvetica', 'normal');
        doc.text(recipient || 'N/A', 15, startY + 5);
        if (recipientPhone) {
            doc.text(recipientPhone, 15, startY + 10);
        }
        
        // Right Column (Invoice Info)
        const rightColX1 = pageWidth - 65;
        const rightColX2 = pageWidth - 15;
        doc.setFont('helvetica', 'bold');
        doc.text('No. Invoice:', rightColX1, startY);
        doc.text('Tanggal:', rightColX1, startY + 5);
        doc.text('Jatuh Tempo:', rightColX1, startY + 10);

        doc.setFont('helvetica', 'normal');
        doc.text(invoiceNumber, rightColX2, startY, { align: 'right' });
        doc.text(todayString, rightColX2, startY + 5, { align: 'right' });
        doc.text(displayDueDate, rightColX2, startY + 10, { align: 'right' }); // Use the invoiceDueDate state

        // === ITEMS TABLE ===
        const tableData = items.map(item => [
            item.description,
            item.qty.toString(),
            item.price.toLocaleString('id-ID'),
            (item.qty * item.price).toLocaleString('id-ID')
        ]);

        (doc as any).autoTable({
            head: [['Deskripsi', 'Qty', 'Harga (Rp)', 'Total (Rp)']],
            body: tableData,
            startY: startY + 20,
            headStyles: { fillColor: [31, 41, 55] },
            theme: 'grid',
            didDrawCell: (data: any) => {
                if (data.section === 'body' && data.column.index >= 2) {
                    data.cell.styles.halign = 'right';
                }
            }
        });

        // === TOTALS & PAYMENT INFO ===
        let finalY = (doc as any).lastAutoTable.finalY;
        const grandTotal = calculateGrandTotal();
        
        // Grand Total
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('Grand Total (Rp)', pageWidth - 70, finalY + 10);
        doc.text(grandTotal.toLocaleString('id-ID'), pageWidth - 15, finalY + 10, { align: 'right' });
        
        // Payment Info
        if (companyInfo.namaBank && companyInfo.nomorRekening && companyInfo.atasNama) {
            doc.setFontSize(10);
            doc.setFont('helvetica', 'bold');
            doc.text('Informasi Pembayaran:', 15, finalY + 15);
            doc.setFont('helvetica', 'normal');
            doc.text(`${companyInfo.namaBank} - No. Rek: ${companyInfo.nomorRekening}`, 15, finalY + 20);
            doc.text(`a/n ${companyInfo.atasNama}`, 15, finalY + 25);
        }

        // === SIGNATURE ===
        const signatureX = pageWidth - 70;
        const signatureY = finalY + 35; 
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text('Hormat kami,', signatureX, signatureY);
        
        // Add stamp logo if available
        if (companyInfo.stampLogo) {
            try {
                // Position stamp slightly above Director's signature line
                // Adjust coordinates (x, y, width, height) as needed
                doc.addImage(companyInfo.stampLogo, 'PNG', signatureX + 5, signatureY + 3, 25, 25); 
            } catch(e) {
                console.error("Error adding stamp logo to PDF:", e);
            }
        }

        doc.text('(___________________)', signatureX, signatureY + 20);
        doc.setFont('helvetica', 'bold');
        doc.text('Direktur', signatureX, signatureY + 25);
        
        doc.save(`invoice-${recipient.replace(/\s/g, '_')}-${invoiceNumber}.pdf`);
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
            
            <main className="flex-grow flex flex-col bg-black/20 rounded-lg p-4 sm:p-8">
                <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
                    <h2 className="text-2xl sm:text-3xl font-semibold text-center sm:text-left">Buat Invoice Baru</h2>
                    <div className="grid grid-cols-2 sm:flex sm:flex-wrap justify-end gap-2 w-full sm:w-auto">
                         <button
                            onClick={handleClearForm}
                            className="py-2 px-3 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-yellow-600 hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-yellow-500 transition-colors"
                            aria-label="Bersihkan Formulir"
                        >
                            <span>Bersihkan</span>
                        </button>
                        <button
                            onClick={handleDownloadPDF}
                            disabled={!recipient || items.length === 0 || calculateGrandTotal() <= 0}
                            className="flex items-center justify-center gap-2 py-2 px-3 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-green-500 transition-colors disabled:bg-gray-500 disabled:cursor-not-allowed"
                            aria-label="Unduh Invoice sebagai PDF"
                        >
                            <DownloadIcon className="w-5 h-5"/>
                            <span className="hidden sm:inline">Unduh PDF</span>
                        </button>
                        <button
                            onClick={handleSendWhatsApp}
                            disabled={!recipient || !recipientPhone || items.length === 0 || calculateGrandTotal() <= 0}
                            className="col-span-2 flex items-center justify-center gap-2 py-2 px-3 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-teal-500 transition-colors disabled:bg-gray-500 disabled:cursor-not-allowed"
                            aria-label="Kirim Invoice via WhatsApp"
                        >
                            <WhatsappIcon className="w-5 h-5"/>
                            <span>Kirim WhatsApp</span>
                        </button>
                    </div>
                </div>

                <div className="space-y-6">
                    {/* Recipient */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="md:col-span-1">
                            <label htmlFor="recipient" className="block text-sm font-medium text-gray-300 mb-1">Kepada</label>
                            <input
                                type="text"
                                id="recipient"
                                value={recipient}
                                onChange={(e) => setRecipient(e.target.value)}
                                className="w-full input-style"
                                placeholder="Nama pelanggan atau perusahaan"
                            />
                        </div>
                        <div className="md:col-span-1">
                            <label htmlFor="recipientPhone" className="block text-sm font-medium text-gray-300 mb-1">No. WhatsApp</label>
                            <input
                                type="tel"
                                id="recipientPhone"
                                value={recipientPhone}
                                onChange={(e) => setRecipientPhone(e.target.value)}
                                className="w-full input-style"
                                placeholder="Nomor WhatsApp penerima"
                            />
                        </div>
                        <div className="md:col-span-1">
                            <label htmlFor="invoiceDueDate" className="block text-sm font-medium text-gray-300 mb-1">Tanggal Jatuh Tempo</label>
                            <input
                                type="date"
                                id="invoiceDueDate"
                                value={invoiceDueDate}
                                onChange={(e) => setInvoiceDueDate(e.target.value)}
                                className="w-full input-style"
                            />
                        </div>
                    </div>


                    {/* Items Header */}
                    <div className="hidden md:grid md:grid-cols-12 gap-4 items-center px-2 py-1 text-xs text-white uppercase">
                        <div className="md:col-span-6">Deskripsi</div>
                        <div className="md:col-span-2 text-right">Qty</div>
                        <div className="md:col-span-2 text-right">Harga (Rp)</div>
                        <div className="md:col-span-2 text-right">Total (Rp)</div>
                    </div>

                    {/* Items List */}
                    <div className="space-y-4">
                        {items.map((item, index) => (
                            <div key={item.id} className="bg-white/5 p-3 rounded-lg flex flex-col gap-2 md:grid md:grid-cols-12 md:gap-4 md:items-center">
                                <div className="md:col-span-6">
                                    <label className="block text-xs font-medium text-gray-400 mb-1 md:hidden">Deskripsi</label>
                                    <textarea value={item.description} onChange={e => handleItemChange(index, 'description', e.target.value)} placeholder="Deskripsi item/layanan" className="w-full input-style" rows={2}></textarea>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-2 md:col-span-4 md:grid-cols-2 md:gap-4">
                                  <div className="">
                                      <label className="block text-xs font-medium text-gray-400 mb-1 md:hidden">Qty</label>
                                      <input type="number" value={item.qty} onChange={e => handleItemChange(index, 'qty', e.target.value)} placeholder="1" className="w-full input-style text-right"/>
                                  </div>
                                  <div className="">
                                      <label className="block text-xs font-medium text-gray-400 mb-1 md:hidden">Harga</label>
                                      <input type="number" value={item.price} onChange={e => handleItemChange(index, 'price', e.target.value)} placeholder="0" className="w-full input-style text-right"/>
                                  </div>
                                </div>

                                <div className="md:col-span-2 flex items-center justify-between mt-2 pt-2 border-t border-gray-700 md:border-none md:pt-0 md:mt-0">
                                    <div className='flex flex-col items-start md:items-end w-full'>
                                      <span className="md:hidden text-xs text-gray-400">Total:</span>
                                      <span className="font-semibold text-lg md:text-base">Rp {(item.qty * item.price).toLocaleString('id-ID')}</span>
                                    </div>
                                    <div className="ml-4 md:ml-0 md:hidden">
                                        <button onClick={() => removeItem(item.id)} className="text-red-400 hover:text-red-300 transition-colors font-bold text-2xl">&times;</button>
                                    </div>
                                </div>

                                 <div className="hidden md:flex md:col-span-1 justify-end">
                                    <button onClick={() => removeItem(item.id)} className="text-red-400 hover:text-red-300 transition-colors font-bold text-xl">&times;</button>
                                </div>
                            </div>
                        ))}
                    </div>

                     {/* Add Item Button & Grand Total */}
                    <div className="flex flex-col sm:flex-row justify-between items-center mt-6 gap-4">
                        <button onClick={addItem} className="w-full sm:w-auto py-2 px-4 border border-sky-500 rounded-lg text-sm font-medium text-sky-300 hover:bg-sky-500/20 focus:outline-none transition-colors">
                            + Tambah Baris
                        </button>
                        <div className="text-right w-full sm:w-auto bg-white/5 p-4 rounded-lg">
                            <p className="text-gray-400 font-medium">Grand Total</p>
                            <p className="text-2xl font-bold text-white">Rp {calculateGrandTotal().toLocaleString('id-ID')}</p>
                        </div>
                    </div>
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
                    box-shadow: 0 0 0 2px #60a5fa;
                    border-color: #60a5fa;
                }
                textarea.input-style {
                    min-height: 42px; /* Match height of other inputs */
                }
                input[type=number]::-webkit-inner-spin-button, 
                input[type=number]::-webkit-outer-spin-button { 
                  -webkit-appearance: none; 
                  margin: 0; 
                }
                input[type=number] {
                  -moz-appearance: textfield;
                }
            `}</style>
        </div>
    );
};

export default InvoicePage;