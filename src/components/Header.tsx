import React from 'react';
import Link from 'next/link';
import { User } from '@supabase/supabase-js';

interface HeaderProps {
  user: User | null;
  onLogin: () => void;
  onLogout: () => void;
}

const Header: React.FC<HeaderProps> = ({ user, onLogin, onLogout }) => {
  return (
    <header className="bg-white shadow-md">
      <div className="container mx-auto px-4 py-4 sm:py-6 flex justify-between items-center">
        <Link href="/" className="text-xl sm:text-2xl font-bold text-green-600">신선마켓 몽당몽당열매</Link>
        <div className="flex items-center space-x-4">
          {user ? (
            <>
              <Link href="/profile" className="text-green-600 hover:text-green-700">
                프로필
              </Link>
              <button onClick={onLogout} className="text-green-600 hover:text-green-700">
                로그아웃
              </button>
            </>
          ) : (
            <button onClick={onLogin} className="text-green-600 hover:text-green-700">
              간편 로그인
            </button>
          )}
          <a href="https://www.instagram.com/name_your.price/" target="_blank" rel="noopener noreferrer" className="text-green-600 hover:text-green-700">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="feather feather-instagram">
              <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
              <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
              <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
            </svg>
          </a>
        </div>
      </div>
    </header>
  );
};

export default Header;
