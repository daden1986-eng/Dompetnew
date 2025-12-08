import React, { useState } from 'react';
import UserIcon from './icons/UserIcon';
import LockIcon from './icons/LockIcon';
import EyeIcon from './icons/EyeIcon';
import EyeOffIcon from './icons/EyeOffIcon';
import { supabase } from '../supabaseClient'; // Import supabase client
import Swal from 'sweetalert2'; // Assuming Swal is globally available or imported

interface LoginPageProps {
  // companyInfo prop is no longer needed here as App.tsx handles company info after login
}

const LoginPage: React.FC<LoginPageProps> = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleAuth = async (isRegister: boolean) => {
    setLoading(true);
    setError('');
    try {
      let response;
      if (isRegister) {
        response = await supabase.auth.signUp({
          email,
          password,
        });
      } else {
        response = await supabase.auth.signInWithPassword({
          email,
          password,
        });
      }

      if (response.error) {
        throw response.error;
      }

      if (isRegister) {
        Swal.fire({
          title: 'Registrasi Berhasil!',
          text: 'Silakan cek email Anda untuk verifikasi dan kemudian login.',
          icon: 'success',
          customClass: {
            popup: '!bg-gray-800 !text-white !rounded-lg',
            title: '!text-white',
            htmlContainer: '!text-gray-300',
            confirmButton: '!bg-blue-600 hover:!bg-blue-700',
          },
        });
      }
      // App.tsx's auth listener will handle session change and redirection
    } catch (err: any) {
      console.error('Auth error:', err.message);
      let errorMessage = 'Terjadi kesalahan. Silakan coba lagi.';
      if (err.message.includes('Invalid login credentials')) {
        errorMessage = 'Email atau kata sandi salah.';
      } else if (err.message.includes('User already registered')) {
        errorMessage = 'Email sudah terdaftar. Silakan login atau gunakan email lain.';
      } else if (err.message.includes('AuthApiError: Email not confirmed')) {
        errorMessage = 'Email belum dikonfirmasi. Silakan cek email Anda.';
      } else if (err.message.includes('Password should be at least 6 characters')) {
        errorMessage = 'Kata sandi minimal 6 karakter.';
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    handleAuth(false); // Call login
  };

  return (
    <div
      className="relative flex items-center justify-center min-h-screen overflow-hidden"
    >
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat bg-animated"
        style={{ backgroundImage: "url('https://picsum.photos/1920/1080?random=1&grayscale&blur=3')" }}
      ></div>
      <div className="absolute inset-0 bg-black opacity-50"></div>
      <div className="relative z-10 w-full max-w-md p-8 space-y-6 bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl">
        <div className="text-center">
          {/* Company logo/name from default, will be overridden after login */}
          <h1 className="text-4xl font-bold text-white tracking-wider mb-4">DompetKu</h1>
          <h1 className="text-3xl font-bold text-white tracking-wider">Selamat Datang</h1>
          <p className="mt-2 text-gray-300">Masuk untuk melanjutkan ke dasbor Anda</p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && <p className="text-center text-sm text-red-400 bg-red-500/20 py-2 rounded-lg" aria-live="assertive">{error}</p>}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <UserIcon className="w-5 h-5 text-gray-300" />
            </div>
            <input
              type="email" // Changed to email type
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full pl-10 pr-3 py-3 text-white bg-white/20 border border-gray-500 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-blue-400 focus:outline-none transition duration-300 placeholder-gray-400"
              placeholder="Masukkan Email Anda"
              autoComplete="email"
            />
          </div>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <LockIcon className="w-5 h-5 text-gray-300" />
            </div>
            <input
              type={showPassword ? 'text' : 'password'}
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full pl-10 pr-10 py-3 text-white bg-white/20 border border-gray-500 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-blue-400 focus:outline-none transition duration-300 placeholder-gray-400"
              placeholder="Masukkan Kata Sandi Anda"
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-300 hover:text-white"
              aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
            >
              {showPassword ? <EyeOffIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
            </button>
          </div>
          <div className="flex items-center justify-between">
            <label htmlFor="remember-me" className="flex items-center">
              <input id="remember-me" name="remember-me" type="checkbox" className="h-4 w-4 text-blue-500 bg-gray-700 border-gray-600 rounded focus:ring-blue-600"/>
              <span className="ml-2 text-sm text-gray-300">Ingat saya</span>
            </label>
            <div className="text-sm">
              <a href="#" className="font-medium text-blue-400 hover:text-blue-300">
                Lupa kata sandi?
              </a>
            </div>
          </div>
          <div>
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-transform transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : 'Masuk'}
            </button>
          </div>
        </form>

        <p className="text-sm text-center text-gray-400">
          Belum punya akun?{' '}
          <button
            onClick={() => handleAuth(true)} // Call register
            disabled={loading}
            className="font-medium text-blue-400 hover:text-blue-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Daftar di sini
          </button>
        </p>
      </div>
    </div>
  );
};

export default LoginPage;