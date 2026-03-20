'use client';

import { useState, useEffect } from 'react';
import PasswordGenerator from '@/components/PasswordGenerator';
import StrengthChecker from '@/components/StrengthChecker';

type Tab = 'generate' | 'check';

const KONAMI_CODE = [
  'ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown',
  'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight',
  'b', 'a'
] as const;

const TAB_SWITCH_THRESHOLD = 15;

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>('generate');
  const [tabSwitches, setTabSwitches] = useState(0);
  const [konamiUnlocked, setKonamiUnlocked] = useState(false);

  useEffect(() => {
    // Konami Code: ↑ ↑ ↓ ↓ ← → ← → B A
    let konamiIndex = 0;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === KONAMI_CODE[konamiIndex].toLowerCase()) {
        konamiIndex++;
        if (konamiIndex === KONAMI_CODE.length) {
          setKonamiUnlocked(true);
          console.log('%c 🎮 KONAMI CODE ACTIVATED! 🎮', 'color: #22c55e; font-size: 20px; font-weight: bold;');
          console.log('%c You found the secret. You are truly 1337.', 'color: #a1a1aa; font-style: italic;');
          konamiIndex = 0;
        }
      } else {
        konamiIndex = 0;
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    
    // Console Easter Eggs
    const styles = {
      title: 'color: #22c55e; font-size: 24px; font-weight: bold; font-family: monospace;',
      subtitle: 'color: #71717a; font-size: 12px; font-family: monospace;',
      info: 'color: #a1a1aa; font-size: 11px; font-family: monospace;',
      warning: 'color: #f59e0b; font-size: 11px; font-family: monospace;',
    };

    console.log('%c entropy', styles.title);
    console.log('%c → good passwords. zero nonsense.', styles.subtitle);
    console.log('%c', '');
    console.log('%c [info] all generation happens locally', styles.info);
    console.log('%c [info] no network requests, no tracking', styles.info);
    console.log('%c [info] open source & auditable', styles.info);
    console.log('%c', '');
    console.log('%c if (youFoundThis) { you.areAwesome(); }', 'color: #3b82f6; font-style: italic; font-family: monospace;');
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleTabSwitch = (tab: Tab) => {
    setActiveTab(tab);
    setTabSwitches(prev => prev + 1);
  };

  return (
    <main className="h-screen overflow-hidden flex flex-col safe-area">
      {/* Scanline effect */}
      <div className="scanlines" />
      
      {/* Noise texture overlay */}
      <div className="noise-overlay" />

      {/* Glow accent */}
      <div className="glow-orb" />

      <div className="flex-1 flex flex-col max-w-xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-8 relative z-10">
        {/* Header */}
        <header className="text-center mb-6 sm:mb-8">
          <div className="inline-flex items-center gap-2 mb-2">
            <span className="text-green-400 font-mono text-xs sm:text-sm animate-pulse">●</span>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-100 font-mono">
              {konamiUnlocked ? '1337' : 'entropy'}
            </h1>
          </div>
          <p className="text-zinc-600 text-[10px] sm:text-xs font-mono tracking-wider uppercase">
            {konamiUnlocked ? 'Hacker mode activated' : 'good passwords. zero nonsense.'}
          </p>
        </header>

        {/* Tab switcher */}
        <div className="flex gap-1 p-1 bg-zinc-900/80 rounded-lg mb-4 sm:mb-6 border border-zinc-800">
          <button
            onClick={() => handleTabSwitch('generate')}
            className={`flex-1 py-3 sm:py-2.5 px-3 sm:px-4 rounded-md text-xs sm:text-sm font-mono transition-all active:scale-95 ${
              activeTab === 'generate'
                ? 'bg-zinc-800 text-green-400 shadow-lg shadow-green-500/10'
                : 'text-zinc-500 hover:text-zinc-300 active:text-zinc-400'
            }`}
          >
            generate
          </button>
          <button
            onClick={() => handleTabSwitch('check')}
            className={`flex-1 py-3 sm:py-2.5 px-3 sm:px-4 rounded-md text-xs sm:text-sm font-mono transition-all active:scale-95 ${
              activeTab === 'check'
                ? 'bg-zinc-800 text-green-400 shadow-lg shadow-green-500/10'
                : 'text-zinc-500 hover:text-zinc-300 active:text-zinc-400'
            }`}
          >
            analyze
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden custom-scrollbar">
          {activeTab === 'generate' && <PasswordGenerator />}
          {activeTab === 'check' && <StrengthChecker />}
        </div>

        {/* Footer */}
        <footer className="pt-4 sm:pt-6 mt-auto">
          <div className="flex items-center justify-center gap-3 sm:gap-6 text-[10px] sm:text-xs font-mono text-zinc-700 flex-wrap">
            <span>local-only</span>
            <span className="text-zinc-800">|</span>
            <span>no tracking</span>
            <span className="hidden xs:inline text-zinc-800">|</span>
            <span className="hidden xs:inline">open source</span>
          </div>
          {tabSwitches > TAB_SWITCH_THRESHOLD && (
            <p className="text-[9px] text-zinc-800 text-center mt-2 font-mono italic animate-fade-in">
              // you like tabs, huh?
            </p>
          )}
        </footer>
      </div>
    </main>
  );
}
