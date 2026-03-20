'use client';

import { useState, useEffect } from 'react';
import { generatePassword, calculateEntropy, copyToClipboard, type PasswordOptions } from '@/lib/crypto';

const DEFAULT_OPTIONS: PasswordOptions = {
  length: 16,
  uppercase: true,
  lowercase: true,
  numbers: true,
  symbols: true,
};

const LENGTH_LIMITS = {
  min: 8,
  max: 64,
} as const;

const ENTROPY_THRESHOLDS = {
  weak: 40,
  moderate: 60,
  strong: 80,
  overengineered: 100,
  maximum: 128,
} as const;

const COPY_FEEDBACK_DURATION = 2000;
const ANIMATION_FRAMES = 8;
const ANIMATION_FRAME_DURATION = 25;

function getEasterEgg(length: number, entropy: number, password: string, copyCount: number): string | null {
  // Special length triggers
  if (length > 50) return "who hurt you?";
  if (length === LENGTH_LIMITS.min && entropy > ENTROPY_THRESHOLDS.strong) return "efficient";
  
  // Copy behavior
  if (copyCount > 10) return "still looking?";
  if (copyCount === 1 && entropy > 90) return "perfect, first try";
  
  // Entropy-based
  if (entropy >= ENTROPY_THRESHOLDS.maximum) return "okay, relax.";
  if (entropy >= ENTROPY_THRESHOLDS.overengineered) return "overengineered";
  
  return null;
}

function getStrengthLabel(entropy: number, options: PasswordOptions, password: string): { label: string; class: string } {
  // Check for limited character sets
  const onlySymbols = options.symbols && !options.uppercase && !options.lowercase && !options.numbers;
  const onlyNumbers = options.numbers && !options.uppercase && !options.lowercase && !options.symbols;
  const allSameChar = password && new Set(password).size === 1;
  
  if (allSameChar) return { label: "limited", class: 'text-yellow-400' };
  if (onlySymbols) return { label: "symbols only", class: 'text-purple-400' };
  if (onlyNumbers) return { label: "numbers only", class: 'text-blue-400' };
  
  if (entropy < ENTROPY_THRESHOLDS.weak) return { label: "weak", class: 'text-red-400' };
  if (entropy < ENTROPY_THRESHOLDS.moderate) return { label: "moderate", class: 'text-amber-400' };
  if (entropy < ENTROPY_THRESHOLDS.strong) return { label: "strong", class: 'text-green-400' };
  return { label: "maximum", class: 'text-cyan-400' };
}

export default function PasswordGenerator() {
  const [password, setPassword] = useState('');
  const [options, setOptions] = useState<PasswordOptions>(DEFAULT_OPTIONS);
  const [copied, setCopied] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [copyCount, setCopyCount] = useState(0);
  const [regenCount, setRegenCount] = useState(0);

  useEffect(() => {
    regenerate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const animatePassword = (finalPassword: string) => {
    setIsAnimating(true);
    const chars = '!@#$%^&*ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let frame = 0;
    const frames = ANIMATION_FRAMES;
    
    const interval = setInterval(() => {
      if (frame >= frames) {
        clearInterval(interval);
        setPassword(finalPassword);
        setIsAnimating(false);
        return;
      }
      
      const scrambled = finalPassword
        .split('')
        .map((char, i) => {
          if (frame / frames > i / finalPassword.length) return char;
          return chars[Math.floor(Math.random() * chars.length)];
        })
        .join('');
      
      setPassword(scrambled);
      frame++;
    }, ANIMATION_FRAME_DURATION);
  };

  const regenerate = () => {
    const newPassword = generatePassword(options);
    animatePassword(newPassword);
    setCopied(false);
    setRegenCount(prev => prev + 1);
  };

  const handleCopy = async () => {
    if (password && !isAnimating) {
      const success = await copyToClipboard(password);
      if (success) {
        setCopied(true);
        setCopyCount(prev => prev + 1);
        if ('vibrate' in navigator) navigator.vibrate(50);
        setTimeout(() => setCopied(false), COPY_FEEDBACK_DURATION);
      }
    }
  };

  const updateOption = (key: keyof PasswordOptions, value: number | boolean) => {
    const newOptions = { ...options, [key]: value };
    setOptions(newOptions);
    const newPassword = generatePassword(newOptions);
    animatePassword(newPassword);
    setCopied(false);
  };

  const handleToggle = (key: keyof PasswordOptions) => {
    const activeCount = [options.uppercase, options.lowercase, options.numbers, options.symbols].filter(Boolean).length;
    if (activeCount > 1 || !options[key as keyof typeof options]) {
      updateOption(key, !options[key as keyof typeof options]);
    }
  };

  const entropy = password ? calculateEntropy(password, options) : 0;
  const progress = ((options.length - LENGTH_LIMITS.min) / (LENGTH_LIMITS.max - LENGTH_LIMITS.min)) * 100;
  const strengthInfo = getStrengthLabel(entropy, options, password);
  const easterEgg = getEasterEgg(options.length, entropy, password, copyCount);
  
  // Regeneration easter eggs
  let regenMessage = '';
  if (regenCount > 20) regenMessage = 'indecisive?';
  else if (regenCount > 50) regenMessage = 'just pick one';
  else if (regenCount === 10) regenMessage = 'still searching...';

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Password output */}
      <div className="terminal-card p-3 sm:p-4">
        <div className="flex items-center gap-2 mb-2 sm:mb-3">
          <span className="text-green-500 text-[10px] sm:text-xs font-mono">$</span>
          <span className="text-zinc-600 text-[10px] sm:text-xs font-mono">output</span>
        </div>
        <div className="password-display p-2.5 sm:p-3 pr-6 sm:pr-8">
          <p className="font-mono text-xs sm:text-sm break-all text-green-400 min-h-[18px] sm:min-h-[20px] leading-relaxed tracking-wide">
            {password || '...'}
          </p>
        </div>
        
        <div className="flex items-center justify-between mt-2 sm:mt-3 text-[10px] sm:text-xs font-mono">
          <span className={strengthInfo.class}>
            [{strengthInfo.label}]
          </span>
          <span className="text-zinc-600">
            {Math.round(entropy)} bits
          </span>
        </div>

        {easterEgg && (
          <p className="text-zinc-600 text-[10px] sm:text-xs text-center mt-2 font-mono animate-pulse">
            // {easterEgg}
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={regenerate}
          disabled={isAnimating}
          className="btn-secondary flex items-center justify-center gap-1.5 sm:gap-2 min-h-[44px] sm:min-h-[auto] active:scale-95 touch-manipulation"
        >
          <span className={isAnimating ? 'animate-spin' : ''}>↻</span>
          <span className="text-xs sm:text-sm">regenerate</span>
        </button>
        <button
          onClick={handleCopy}
          disabled={!password || isAnimating}
          className="btn-primary flex items-center justify-center gap-1.5 sm:gap-2 min-h-[44px] sm:min-h-[auto] active:scale-95 touch-manipulation"
        >
          <span>{copied ? '✓' : '⎘'}</span>
          <span className="text-xs sm:text-sm">{copied ? 'copied' : 'copy'}</span>
        </button>
      </div>

      {copied && (
        <p className="text-[10px] sm:text-xs text-zinc-600 text-center animate-fade-in font-mono">
          → {copyCount === 1 ? 'copied to clipboard' : copyCount < 5 ? 'copied again' : copyCount < 10 ? 'copied (again)' : 'you sure about this one?'}
        </p>
      )}

      {regenMessage && !copied && (
        <p className="text-[10px] sm:text-xs text-zinc-600 text-center animate-fade-in font-mono italic">
          // {regenMessage}
        </p>
      )}

      {/* Options */}
      <div className="terminal-card p-3 sm:p-4 space-y-3 sm:space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-green-500 text-[10px] sm:text-xs font-mono">$</span>
          <span className="text-zinc-600 text-[10px] sm:text-xs font-mono">config</span>
        </div>

        {/* Length */}
        <div>
          <div className="flex items-center justify-between mb-2 sm:mb-3">
            <span className="text-[10px] sm:text-xs font-mono text-zinc-500">length</span>
            <span className="font-mono text-sm sm:text-sm text-green-400 tabular-nums">
              {options.length}
            </span>
          </div>
          <input
            type="range"
            min={LENGTH_LIMITS.min}
            max={LENGTH_LIMITS.max}
            value={options.length}
            onChange={(e) => updateOption('length', parseInt(e.target.value))}
            className="slider"
            style={{ '--progress': `${progress}%` } as React.CSSProperties}
          />
          <div className="flex justify-between text-[9px] sm:text-[10px] text-zinc-700 mt-1 font-mono">
            <span>{LENGTH_LIMITS.min}</span>
            <span>{LENGTH_LIMITS.max}</span>
          </div>
        </div>

        {/* Toggles */}
        <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
          {(['uppercase', 'lowercase', 'numbers', 'symbols'] as const).map((key) => (
            <button
              key={key}
              onClick={() => handleToggle(key)}
              className={`toggle-chip min-h-[44px] sm:min-h-[auto] touch-manipulation ${options[key] ? 'active' : 'inactive'}`}
            >
              <span className="text-xs sm:text-sm">{key}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
