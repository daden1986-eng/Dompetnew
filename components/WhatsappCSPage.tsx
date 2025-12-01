
import React, { useState, useEffect } from 'react';
import ArrowLeftIcon from './icons/ArrowLeftIcon';
import { CompanyInfo } from './DashboardPage';

declare const Swal: any;

interface WhatsappCSPageProps {
  onBack: () => void;
  companyInfo: CompanyInfo;
  setCompanyInfo: React.Dispatch<React.SetStateAction<CompanyInfo>>;
}

const WhatsappCSPage: React.FC<WhatsappCSPageProps> = ({ onBack, companyInfo, setCompanyInfo }) => {
  const [webhookUrl, setWebhookUrl] = useState('');
  const [verifyToken, setVerifyToken] = useState('');
  const [geminiKey, setGeminiKey] = useState('');

  useEffect(() => {
    setWebhookUrl(companyInfo.whatsappWebhookUrl || '');
    setVerifyToken(companyInfo.whatsappVerifyToken || '');
    setGeminiKey(companyInfo.geminiApiKey || '');
  }, [companyInfo]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    // Save to global app state (which persists to localStorage via App.tsx)
    setCompanyInfo(prev => ({
        ...prev,
        whatsappWebhookUrl: webhookUrl,
        whatsappVerifyToken: verifyToken,
        geminiApiKey: geminiKey
    }));

    Swal.fire({
      title: 'Konfigurasi Disimpan',
      text: 'Pengaturan WhatsApp Gateway dan AI telah berhasil diperbarui.',
      icon: 'success',
      customClass: {
          popup: '!bg-gray-800 !text-white !rounded-lg',
          title: '!text-white',
          confirmButton: '!bg-blue-600 hover:!bg-blue-700',
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
        <div className="text-center mb-6">
            <h2 className="text-3xl font-semibold text-white mb-2">Gerbang WhatsApp & Layanan Otomatis</h2>
            <p className="text-gray-400">Konfigurasi untuk integrasi WhatsApp Business API dan Balasan Cerdas AI</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Form Section */}
            <div className="bg-white/5 p-6 rounded-lg">
                <h3 className="text-xl font-semibold mb-6 text-sky-400">Pengaturan Kredensial</h3>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label htmlFor="webhookUrl" className="block text-sm font-medium text-gray-300 mb-1">WhatsApp Webhook URL</label>
                        <input
                            type="url"
                            id="webhookUrl"
                            value={webhookUrl}
                            onChange={(e) => setWebhookUrl(e.target.value)}
                            className="w-full pl-4 pr-3 py-3 text-white bg-white/10 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-blue-400 focus:outline-none transition duration-300 placeholder-gray-500"
                            placeholder="https://api.whatsapp.com/..."
                        />
                        <p className="text-xs text-gray-500 mt-1">URL Callback yang disediakan oleh penyedia layanan WA Gateway Anda.</p>
                    </div>

                    <div>
                        <label htmlFor="verifyToken" className="block text-sm font-medium text-gray-300 mb-1">WhatsApp Verify Token</label>
                        <input
                            type="text"
                            id="verifyToken"
                            value={verifyToken}
                            onChange={(e) => setVerifyToken(e.target.value)}
                            className="w-full pl-4 pr-3 py-3 text-white bg-white/10 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-blue-400 focus:outline-none transition duration-300 placeholder-gray-500"
                            placeholder="Token verifikasi kustom Anda"
                        />
                         <p className="text-xs text-gray-500 mt-1">Token rahasia untuk memverifikasi permintaan webhook.</p>
                    </div>

                    <div className="pt-4 border-t border-gray-700">
                        <label htmlFor="geminiKey" className="block text-sm font-medium text-gray-300 mb-1">Google Gemini API Key</label>
                        <input
                            type="password"
                            id="geminiKey"
                            value={geminiKey}
                            onChange={(e) => setGeminiKey(e.target.value)}
                            className="w-full pl-4 pr-3 py-3 text-white bg-white/10 border border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-400 focus:border-purple-400 focus:outline-none transition duration-300 placeholder-gray-500"
                            placeholder="AIzaSy..."
                        />
                         <p className="text-xs text-gray-500 mt-1">Digunakan untuk memproses pesan pelanggan dan menghasilkan balasan otomatis cerdas.</p>
                    </div>

                    <button
                        type="submit"
                        className="w-full py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-transform transform hover:scale-105"
                    >
                        Simpan Konfigurasi
                    </button>
                </form>
            </div>

            {/* Instruction Section */}
            <div className="space-y-6">
                <div className="bg-sky-500/10 p-6 rounded-lg border border-sky-500/20">
                    <h3 className="text-lg font-semibold text-sky-400 mb-3">Cara Kerja Layanan Otomatis</h3>
                    <ul className="list-disc list-inside text-sm text-gray-300 space-y-2">
                        <li>Aplikasi ini memerlukan <strong>Backend Server</strong> yang berjalan 24/7 untuk menerima pesan dari WhatsApp.</li>
                        <li>Saat pelanggan mengirim pesan (misal: "Cek tagihan saya"), WhatsApp akan mengirim data ke <strong>Webhook URL</strong> di atas.</li>
                        <li>Backend akan memvalidasi menggunakan <strong>Verify Token</strong>.</li>
                        <li>Pesan kemudian dikirim ke <strong>Gemini AI</strong> untuk dipahami maksudnya.</li>
                        <li>Sistem akan membalas otomatis dengan data tagihan atau jawaban umum yang relevan.</li>
                    </ul>
                </div>

                <div className="bg-yellow-500/10 p-6 rounded-lg border border-yellow-500/20">
                    <h3 className="text-lg font-semibold text-yellow-400 mb-3">Catatan Penting</h3>
                    <p className="text-sm text-gray-300 leading-relaxed">
                        Halaman ini hanya untuk menyimpan konfigurasi <strong>Frontend</strong>. Agar fitur ini berfungsi penuh:
                    </p>
                    <ol className="list-decimal list-inside text-sm text-gray-300 mt-2 space-y-1">
                        <li>Anda harus mendaftar di <strong>Meta for Developers</strong> (WhatsApp API).</li>
                        <li>Anda perlu memiliki server (Node.js/Python) yang menghosting Webhook.</li>
                        <li>Masukkan URL Webhook server Anda di kolom sebelah kiri.</li>
                    </ol>
                </div>
            </div>
        </div>
      </main>
    </div>
  );
};

export default WhatsappCSPage;
