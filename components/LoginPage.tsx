
import React, { useState } from 'react';
import UserIcon from './icons/UserIcon';
import LockIcon from './icons/LockIcon';
import EyeIcon from './icons/EyeIcon';
import EyeOffIcon from './icons/EyeOffIcon';

interface LoginPageProps {
  onLoginSuccess: (username: string) => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (username === 'admin' && password === 'damar') {
      setError('');
      onLoginSuccess(username);
    } else {
      setError('Username atau kata sandi salah.');
    }
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
          <h1 className="text-4xl font-bold text-white tracking-wider">Selamat Datang</h1>
          <p className="mt-2 text-gray-300">Masuk untuk melanjutkan ke dasbor Anda</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && <p className="text-center text-sm text-red-400 bg-red-500/20 py-2 rounded-lg">{error}</p>}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <UserIcon className="w-5 h-5 text-gray-300" />
            </div>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="w-full pl-10 pr-3 py-3 text-white bg-white/20 border border-gray-500 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-blue-400 focus:outline-none transition duration-300 placeholder-gray-400"
              placeholder="Masukkan Username Anda"
              autoComplete="username"
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
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-transform transform hover:scale-105"
            >
              Masuk
            </button>
          </div>
        </form>
        <p className="text-sm text-center text-gray-400">
          Belum punya akun?{' '}
          <a href="#" className="font-medium text-blue-400 hover:text-blue-300">
            Daftar di sini
          </a>
        </p>
      </div>
    </div>
  );
};

export default LoginPage;