import React, { useState } from 'react';
import { Activity, Eye, ShieldCheck, UserCheck, Menu, X } from 'lucide-react';

interface HeaderProps {
  activeTab: 'feed' | 'watchlists' | 'architecture';
  setActiveTab: (tab: 'feed' | 'watchlists' | 'architecture') => void;
}

export const Header: React.FC<HeaderProps> = ({ activeTab, setActiveTab }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const tabs = [
    { id: 'feed' as const,         label: 'Catch-Up Feed',         Icon: Activity },
    { id: 'watchlists' as const,   label: 'Watchlists',            Icon: Eye },
    { id: 'architecture' as const, label: 'How it works',          Icon: ShieldCheck },
  ];

  const handleTab = (id: typeof activeTab) => {
    setActiveTab(id);
    setMobileMenuOpen(false);
  };

  return (
    <header className="bg-white border-b border-[#D8E7F2] sticky top-0 z-40 shadow-sm w-full">
      <div className="w-full max-w-none px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16">
        <div className="flex items-center justify-between h-14 sm:h-16">

          {/* Logo */}
          <button
            onClick={() => handleTab('feed')}
            className="flex items-center space-x-2.5 shrink-0"
          >
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-[#E8F3FB] border border-[#D8E7F2] flex items-center justify-center text-[#1677C8]">
              <Activity className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.5]" />
            </div>
            <div>
              <span className="font-extrabold text-lg sm:text-xl text-[#17324D] tracking-tight leading-none">
                Meanwhile
              </span>
            </div>
          </button>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-1.5 bg-[#F1F7FC] p-1 rounded-lg border border-[#D8E7F2]">
            {tabs.map(({ id, label, Icon }) => (
              <button
                key={id}
                onClick={() => handleTab(id)}
                className={`flex items-center space-x-2 px-3.5 py-1.5 text-sm font-semibold rounded-md transition-all whitespace-nowrap ${
                  activeTab === id
                    ? 'bg-white text-[#1677C8] shadow-xs font-extrabold border border-[#D8E7F2]'
                    : 'text-[#64788A] hover:text-[#17324D]'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{label}</span>
              </button>
            ))}
          </nav>

          {/* Right side: user badge + mobile menu toggle */}
          <div className="flex items-center space-x-2">
            <div className="hidden lg:flex items-center space-x-2 text-sm text-[#64788A] bg-[#F7FAFC] px-3.5 py-1.5 rounded-lg border border-[#D8E7F2]">
              <UserCheck className="w-4 h-4 text-[#1677C8]" />
              <span className="font-semibold text-[#17324D]">Demo Investor</span>
            </div>

            {/* Mobile hamburger */}
            <button
              className="md:hidden p-2 rounded-lg bg-[#F1F7FC] border border-[#D8E7F2] text-[#17324D]"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile dropdown nav */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-[#D8E7F2] bg-white w-full">
          {tabs.map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => handleTab(id)}
              className={`flex items-center space-x-3 w-full px-5 py-3.5 text-sm font-semibold border-b border-[#F1F7FC] transition-all ${
                activeTab === id
                  ? 'bg-[#E8F3FB] text-[#1677C8]'
                  : 'text-[#17324D] hover:bg-[#F7FAFC]'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{label}</span>
            </button>
          ))}
        </div>
      )}
    </header>
  );
};
