'use client';

import { useState, useEffect } from 'react';
import { analyzePassword, type StrengthResult } from '@/lib/crypto';

const COMMON_PASSWORDS = [
  'password', '12345678', 'password123', 'qwerty', 'abc123',
  'letmein', '123456', 'admin', 'welcome',
] as const;

const KEYBOARD_PATTERNS = /qwerty|asdfgh|zxcvbn|qazwsx|123456|654321/i;
const SEQUENTIAL_PATTERNS = /012|123|234|345|456|567|678|789|987|876|765|654|543|432|321|210/;
const YEAR_PATTERN = /19\d{2}|20\d{2}/;
const NAME_YEAR_PATTERN = /^[A-Z][a-z]+[0-9]{2,4}$/;

const STRENGTH_THRESHOLDS = {
  paranoid: 50,
  weakScore: 3,
} as const;

function getStrengthLabel(score: number, input: string): { label: string; class: string; message?: string } {
  // Easter eggs for common passwords
  const lowerInput = input.toLowerCase();
  
  if (COMMON_PASSWORDS.includes(lowerInput as typeof COMMON_PASSWORDS[number])) {
    return { label: "compromised", class: 'text-red-400', message: 'extremely common' };
  }
  
  // Repeated characters
  if (input === '00000000' || input === '11111111' || /^(.)\1+$/.test(input)) {
    return { label: "weak", class: 'text-red-400', message: 'same character repeated' };
  }
  
  // Keyboard patterns
  if (KEYBOARD_PATTERNS.test(input)) {
    return { label: "predictable", class: 'text-red-400', message: 'keyboard pattern' };
  }
  
  // All same type
  if (/^[a-z]+$/.test(input)) {
    return { label: "weak", class: 'text-amber-400', message: 'lowercase letters only' };
  }
  if (/^[A-Z]+$/.test(input)) {
    return { label: "weak", class: 'text-amber-400', message: 'uppercase letters only' };
  }
  if (/^\d+$/.test(input)) {
    return { label: "weak", class: 'text-red-400', message: 'digits only' };
  }
  if (/^[!@#$%^&*()_+\-=\[\]{};:,.<>?]+$/.test(input)) {
    return { label: "limited", class: 'text-amber-400', message: 'symbols only' };
  }
  
  // Sequential numbers
  if (SEQUENTIAL_PATTERNS.test(input)) {
    return { label: "weak", class: 'text-red-400', message: 'sequential pattern' };
  }
  
  // Date patterns
  if (YEAR_PATTERN.test(input)) {
    return { label: "predictable", class: 'text-amber-400', message: 'contains year' };
  }
  
  // Repeated words
  const words = input.match(/(.{3,})\1+/);
  if (words) {
    return { label: "weak", class: 'text-amber-400', message: 'pattern repetition' };
  }
  
  // Length extremes
  if (input.length > STRENGTH_THRESHOLDS.paranoid && score < STRENGTH_THRESHOLDS.weakScore) {
    return { label: "weak", class: 'text-amber-400', message: 'length alone insufficient' };
  }
  
  if (input.length > STRENGTH_THRESHOLDS.paranoid && score >= 4) {
    return { label: "very strong", class: 'text-cyan-400', message: 'extensive protection' };
  }
  
  // Name patterns (common patterns)
  if (NAME_YEAR_PATTERN.test(input)) {
    return { label: "predictable", class: 'text-red-400', message: 'name+year pattern' };
  }
  
  if (score <= 1) return { label: "weak", class: 'text-red-400' };
  if (score === 2) return { label: "fair", class: 'text-amber-400' };
  if (score === 3) return { label: "strong", class: 'text-green-400' };
  return { label: "excellent", class: 'text-cyan-400', message: 'well done' };
}

function getIssueText(issue: string): string {
  const issueMap: Record<string, string> = {
    'Too short': 'insufficient length',
    'Add uppercase letters': 'missing uppercase',
    'Add lowercase letters': 'missing lowercase',
    'Add numbers': 'missing digits',
    'Add special characters': 'missing symbols',
    'Avoid common patterns': 'pattern detected',
    'Avoid repeated characters': 'repetition detected',
    'Avoid sequential characters': 'sequence detected',
  };
  return issueMap[issue] || issue.toLowerCase();
}

export default function StrengthChecker() {
  const [input, setInput] = useState('');
  const [result, setResult] = useState<StrengthResult | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (input) {
      const analysis = analyzePassword(input);
      setResult(analysis);
    } else {
      setResult(null);
    }
  }, [input]);

  const strengthInfo = result ? getStrengthLabel(result.score, input) : null;
  const uniqueIssues = result ? [...new Set(result.issues.map(getIssueText))] : [];

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Input */}
      <div className="terminal-card p-3 sm:p-4">
        <div className="flex items-center gap-2 mb-2 sm:mb-3">
          <span className="text-green-500 text-[10px] sm:text-xs font-mono">$</span>
          <span className="text-zinc-600 text-[10px] sm:text-xs font-mono">analyze</span>
        </div>
        <div className="relative">
          <input
            type={showPassword ? 'text' : 'password'}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="paste password..."
            className="input-field min-h-[44px] sm:min-h-[auto]"
          />
          <button
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-400 transition-colors text-[10px] sm:text-xs font-mono touch-manipulation p-1"
          >
            [{showPassword ? 'hide' : 'show'}]
          </button>
        </div>
      </div>

      {/* Results */}
      {result && (
        <div className="space-y-2.5 sm:space-y-3 animate-fade-in">
          {/* Status */}
          <div className="terminal-card p-3 sm:p-4">
            <div className="flex items-center justify-between mb-2 sm:mb-3">
              <span className={`text-xs sm:text-sm font-mono ${strengthInfo?.class}`}>
                status: {strengthInfo?.label}
              </span>
            </div>
            <div className="mb-2 sm:mb-3 text-[10px] sm:text-xs font-mono text-zinc-500">
              crack time: <span className="text-zinc-400">{result.crackTime}</span>
            </div>
            
            {/* Bars */}
            <div className="flex gap-1 mb-2 sm:mb-3">
              {[0, 1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className={`h-1 flex-1 rounded-sm transition-all duration-300 ${
                    i <= result.score 
                      ? result.score <= 1 
                        ? 'bg-red-400' 
                        : result.score === 2 
                          ? 'bg-amber-400' 
                          : result.score === 3 
                            ? 'bg-green-400' 
                            : 'bg-cyan-400'
                      : 'bg-zinc-900'
                  }`}
                />
              ))}
            </div>
            
            {strengthInfo?.message && (
              <div className="text-[10px] sm:text-xs font-mono text-zinc-500">
                // {strengthInfo.message}
              </div>
            )}
          </div>

          {/* Issues */}
          {uniqueIssues.length > 0 && (
            <div className="terminal-card p-3 sm:p-4">
              <div className="flex items-center gap-2 mb-2 sm:mb-3">
                <span className="text-red-400 text-[10px] sm:text-xs font-mono">!</span>
                <span className="text-zinc-600 text-[10px] sm:text-xs font-mono">vulnerabilities</span>
              </div>
              <ul className="space-y-1.5">
                {uniqueIssues.map((issue, i) => (
                  <li
                    key={i}
                    className="text-[10px] sm:text-xs text-zinc-500 font-mono flex items-start gap-2 animate-slide-in"
                    style={{ animationDelay: `${i * 40}ms` }}
                  >
                    <span className="text-red-400/60">→</span>
                    <span className="leading-relaxed">{issue}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

        </div>
      )}

      {!result && (
        <p className="text-[10px] sm:text-xs text-zinc-700 text-center font-mono pt-4">
          // analysis runs locally
        </p>
      )}
    </div>
  );
}
