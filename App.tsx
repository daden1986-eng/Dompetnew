

import React, { useState, useEffect } from 'react';
import LoginPage from './components/LoginPage';
import DashboardPage from './components/DashboardPage';

// Define the CompanyInfo interface as the single source of truth
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
    stampLogo: string | null;
}

export interface FinanceEntry {
  id: number;
  deskripsi: string;
  tanggal: string;
  kategori: string;
  metode: string;
  nominal: number;
  isConsolidated?: boolean; // New optional field for voucher revenue consolidation
}

// Moved from DashboardPage.tsx and SirekapPage.tsx to ensure a single source of truth.
export interface Customer {
  id: number;
  nama: string;
  noHp: string;
  jenisLangganan: string;
  alamat: string;
  harga: string;
  status: 'Lunas' | 'Belum Lunas';
  tunggakan: number;
  dueDate: string; // Added dueDate
}

// Utility function to check if localStorage is available and accessible
export function isLocalStorageAvailable(): boolean {
  try {
    const testKey = '__test_localStorage__';
    localStorage.setItem(testKey, testKey);
    localStorage.removeItem(testKey);
    return true;
  } catch (e) {
    return false;
  }
}

const COMPANY_INFO_KEY = 'sidompet_companyInfo';

const defaultCompanyInfo: CompanyInfo = {
    name: 'DompetKu',
    address: 'Jl. Internet Cepat No. 42, Jakarta',
    phone: '021-555-0123',
    logo: null,
    telegramBotToken: '',
    telegramChatId: '',
    namaBank: '',
    nomorRekening: '',
    atasNama: '',
    stampLogo: null,
};


function App() {
  const [loggedInUser, setLoggedInUser] = useState<string | null>(null);
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo>(() => {
    if (!isLocalStorageAvailable()) {
      console.warn("localStorage tidak tersedia, menggunakan info perusahaan default.");
      return defaultCompanyInfo;
    }
    try {
        const saved = localStorage.getItem(COMPANY_INFO_KEY);
        if (saved) {
            const parsed = JSON.parse(saved);
            return { 
                ...defaultCompanyInfo, 
                ...parsed,
            };
        }
    } catch (error) {
        console.error("Gagal memuat info perusahaan dari localStorage, kembali ke default.", error);
    }
    return defaultCompanyInfo;
  });

  useEffect(() => {
    if (!isLocalStorageAvailable()) {
      // localStorage not available, skip saving
      return;
    }
    try {
        localStorage.setItem(COMPANY_INFO_KEY, JSON.stringify(companyInfo));
    } catch (error) {
        console.error("Gagal menyimpan info perusahaan ke localStorage", error);
    }
  }, [companyInfo]);

  const handleLoginSuccess = (username: string) => {
    setLoggedInUser(username);
  };

  const handleLogout = () => {
    setLoggedInUser(null);
  };

  return (
    <div className="min-h-screen bg-gray-900">
      {loggedInUser ? (
        <DashboardPage
          onLogout={handleLogout}
          username={loggedInUser}
          companyInfo={companyInfo}
          setCompanyInfo={setCompanyInfo}
        />
      ) : (
        <LoginPage 
          onLoginSuccess={handleLoginSuccess} 
          companyInfo={companyInfo} // Pass companyInfo to LoginPage
        />
      )}
      <footer className="fixed bottom-0 left-0 right-0 p-4 text-center text-gray-400 text-sm bg-gray-900/50 backdrop-blur-sm z-50">
        Hak Cipta © {new Date().getFullYear()} {companyInfo.name}. Seluruh hak cipta dilindungi.
      </footer>
    </div>
  );
}

export default App;