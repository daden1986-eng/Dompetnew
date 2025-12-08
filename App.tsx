import React, { useState, useEffect } from 'react';
import LoginPage from './components/LoginPage';
import DashboardPage from './components/DashboardPage';
import { supabase } from './supabaseClient'; // Import supabase client
import { User, Session } from '@supabase/supabase-js';

// Define the CompanyInfo interface as the single source of truth
export interface CompanyInfo {
    id?: number; // Supabase ID
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

const COMPANY_INFO_TABLE = 'company_info';
const KAS_CADANGAN_TABLE = 'kas_cadangan';

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
  const [session, setSession] = useState<Session | null>(null);
  const [loggedInUser, setLoggedInUser] = useState<User | null>(null);
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo>(defaultCompanyInfo);
  const [loadingApp, setLoadingApp] = useState(true);

  // Effect to handle initial session loading and auth state changes
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoggedInUser(session?.user || null);
      setLoadingApp(false);
    }).catch(() => setLoadingApp(false));

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setLoggedInUser(session?.user || null);
        setLoadingApp(false); // Ensure loading state is cleared after auth change
      }
    );

    return () => {
      authListener?.unsubscribe();
    };
  }, []);

  // Effect to load company info when user logs in
  useEffect(() => {
    async function loadCompanyInfo() {
      if (loggedInUser) {
        setLoadingApp(true); // Indicate loading for user-specific data
        try {
          const { data, error } = await supabase
            .from<CompanyInfo>(COMPANY_INFO_TABLE)
            .select('*')
            .eq('user_id', loggedInUser.id)
            .single();

          if (error && error.code !== 'PGRST116') { // PGRST116 means no rows found (new user)
            console.error('Error loading company info:', error.message);
            // Even if there's an error, use default and try to insert later
          }

          if (data) {
            setCompanyInfo({ ...defaultCompanyInfo, ...data });
          } else {
            // No company info found, create default for new user
            const { data: newCompanyData, error: insertError } = await supabase
              .from<CompanyInfo>(COMPANY_INFO_TABLE)
              .insert({ ...defaultCompanyInfo, user_id: loggedInUser.id })
              .select('*')
              .single();
            if (insertError) {
              console.error('Error inserting default company info:', insertError.message);
            } else if (newCompanyData) {
              setCompanyInfo(newCompanyData);
            }
          }
        } catch (error) {
          console.error('Unexpected error loading company info:', error);
        } finally {
          setLoadingApp(false);
        }
      } else {
        setCompanyInfo(defaultCompanyInfo); // Reset to default if logged out
      }
    }
    loadCompanyInfo();
  }, [loggedInUser]);

  const updateCompanyInfo = async (newInfo: CompanyInfo) => {
    if (!loggedInUser) return;
    try {
      const { data, error } = await supabase
        .from<CompanyInfo>(COMPANY_INFO_TABLE)
        .upsert({ ...newInfo, user_id: loggedInUser.id }, { onConflict: 'user_id' })
        .select('*')
        .single();
      if (error) throw error;
      if (data) {
        setCompanyInfo(data);
        return true;
      }
    } catch (error: any) {
      console.error('Error updating company info:', error.message);
      return false;
    }
    return false;
  };

  const handleLogout = async () => {
    setLoadingApp(true);
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Error logging out:', error.message);
    }
    setLoadingApp(false);
    setSession(null);
    setLoggedInUser(null);
    setCompanyInfo(defaultCompanyInfo); // Reset company info on logout
  };

  if (loadingApp) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
        <div className="flex flex-col items-center">
          <svg className="animate-spin h-10 w-10 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="mt-4 text-lg">Memuat aplikasi...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {loggedInUser && session ? (
        <DashboardPage
          onLogout={handleLogout}
          username={loggedInUser.email || 'User'}
          companyInfo={companyInfo}
          setCompanyInfo={updateCompanyInfo}
          userId={loggedInUser.id}
        />
      ) : (
        <LoginPage />
      )}
      <footer className="fixed bottom-0 left-0 right-0 p-4 text-center text-gray-400 text-sm bg-gray-900/50 backdrop-blur-sm z-50">
        Hak Cipta © {new Date().getFullYear()} {companyInfo.name}. Seluruh hak cipta dilindungi.
      </footer>
    </div>
  );
}

export default App;