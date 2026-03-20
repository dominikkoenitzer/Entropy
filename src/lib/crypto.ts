/**
 * Cryptographically secure password generation utilities
 * Uses Web Crypto API (crypto.getRandomValues) for true randomness
 */

const CHAR_SETS = {
  uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  lowercase: 'abcdefghijklmnopqrstuvwxyz',
  numbers: '0123456789',
  symbols: '!@#$%^&*()_+-=[]{}|;:,.<>?',
} as const;

const CHARSET_SIZES = {
  uppercase: 26,
  lowercase: 26,
  numbers: 10,
  symbols: 32, // Approximate
} as const;

const REPEAT_CHECK = {
  maxAttempts: 10,
  minConsecutive: 3,
} as const;

const CRACK_TIME_CONFIG = {
  guessesPerSecond: 100_000_000_000, // 100 billion guesses/second - modern GPU cluster
  heatDeathThreshold: 50, // Exponent threshold for "heat death" message
} as const;

export type CharSetKey = keyof typeof CHAR_SETS;

export interface PasswordOptions {
  length: number;
  uppercase: boolean;
  lowercase: boolean;
  numbers: boolean;
  symbols: boolean;
}

/**
 * Generate a cryptographically secure random integer in range [0, max)
 */
function secureRandomInt(max: number): number {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  return array[0] % max;
}

/**
 * Fisher-Yates shuffle using crypto.getRandomValues
 */
function secureShuffle<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = secureRandomInt(i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Generate a password with the given options
 * Ensures at least one character from each selected set
 */
export function generatePassword(options: PasswordOptions): string {
  const { length, uppercase, lowercase, numbers, symbols } = options;
  
  // Build character pool
  let pool = '';
  const required: string[] = [];
  
  if (uppercase) {
    pool += CHAR_SETS.uppercase;
    required.push(CHAR_SETS.uppercase[secureRandomInt(CHAR_SETS.uppercase.length)]);
  }
  if (lowercase) {
    pool += CHAR_SETS.lowercase;
    required.push(CHAR_SETS.lowercase[secureRandomInt(CHAR_SETS.lowercase.length)]);
  }
  if (numbers) {
    pool += CHAR_SETS.numbers;
    required.push(CHAR_SETS.numbers[secureRandomInt(CHAR_SETS.numbers.length)]);
  }
  if (symbols) {
    pool += CHAR_SETS.symbols;
    required.push(CHAR_SETS.symbols[secureRandomInt(CHAR_SETS.symbols.length)]);
  }
  
  if (pool.length === 0) {
    return '';
  }
  
  // Generate remaining characters
  const remaining = length - required.length;
  const chars: string[] = [...required];
  
  for (let i = 0; i < remaining; i++) {
    chars.push(pool[secureRandomInt(pool.length)]);
  }
  
  // Shuffle to randomize position of required characters
  let password = secureShuffle(chars).join('');
  
  // Prevent 3+ consecutive identical characters (regenerate if found)
  let attempts = 0;
  while (/(.)\1{2,}/.test(password) && attempts < REPEAT_CHECK.maxAttempts) {
    password = secureShuffle(chars).join('');
    attempts++;
  }
  
  // If still has repeats after 10 attempts, manually fix them
  if (/(.)\1{2,}/.test(password)) {
    const passwordArray = password.split('');
    for (let i = 2; i < passwordArray.length; i++) {
      if (passwordArray[i] === passwordArray[i-1] && passwordArray[i] === passwordArray[i-2]) {
        // Replace with a different random character from pool
        let replacement = pool[secureRandomInt(pool.length)];
        while (replacement === passwordArray[i]) {
          replacement = pool[secureRandomInt(pool.length)];
        }
        passwordArray[i] = replacement;
      }
    }
    password = passwordArray.join('');
  }
  
  return password;
}

/**
 * Calculate password entropy in bits
 */
export function calculateEntropy(password: string, options: PasswordOptions): number {
  let poolSize = 0;
  
  if (options.uppercase) poolSize += 26;
  if (options.lowercase) poolSize += 26;
  if (options.numbers) poolSize += 10;
  if (options.symbols) poolSize += CHAR_SETS.symbols.length;
  
  if (poolSize === 0) return 0;
  
  return password.length * Math.log2(poolSize);
}

export interface StrengthResult {
  score: number; // 0-4
  label: string;
  crackTime: string;
  issues: string[];
  entropy: number;
}

const COMMON_PATTERNS = [
  /^(.)\1+$/, // All same character
  /^(012|123|234|345|456|567|678|789|890)+$/i, // Sequential numbers
  /^(abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz)+$/i, // Sequential letters
  /^(qwerty|asdf|zxcv|password|admin|letmein|welcome|master|login)/i,
  /^(19|20)\d{2}$/, // Years
  /^(\d)\1{3,}$/, // Repeated digits
];

const COMMON_PASSWORDS = [
  'password', '123456', '12345678', 'qwerty', 'abc123', 'letmein', 'master', 'admin', 'welcome', 'login', 'password1', '123456789',
];

/**
 * Analyze password strength
 */
export function analyzePassword(password: string): StrengthResult {
  const issues: string[] = [];
  let score = 0;
  
  if (!password) {
    return { score: 0, label: '', crackTime: '', issues: [], entropy: 0 };
  }
  
  const length = password.length;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSymbol = /[^A-Za-z0-9]/.test(password);
  
  // Calculate entropy based on actual character types present
  let poolSize = 0;
  if (hasUpper) poolSize += CHARSET_SIZES.uppercase;
  if (hasLower) poolSize += CHARSET_SIZES.lowercase;
  if (hasNumber) poolSize += CHARSET_SIZES.numbers;
  if (hasSymbol) poolSize += CHARSET_SIZES.symbols;
  
  const entropy = length * Math.log2(poolSize || 1);
  
  // Check for issues
  if (length < 8) {
    issues.push('Too short — aim for at least 12 characters');
  } else if (length < 12) {
    issues.push('A bit short — 12+ characters is safer');
  }
  
  if (!hasUpper && !hasLower) {
    issues.push('No letters — adds predictability');
  } else if (!hasUpper) {
    issues.push('No uppercase — easy pattern to guess');
  } else if (!hasLower) {
    issues.push('No lowercase — limits complexity');
  }
  
  if (!hasNumber) {
    issues.push('No numbers — reduces possible combinations');
  }
  
  if (!hasSymbol) {
    issues.push('No symbols — missing a whole character class');
  }
  
  // Check for common patterns
  for (const pattern of COMMON_PATTERNS) {
    if (pattern.test(password)) {
      issues.push('Contains predictable patterns');
      break;
    }
  }
  
  // Check against common passwords
  if (COMMON_PASSWORDS.some(p => password.toLowerCase().includes(p))) {
    issues.push('Contains a commonly used password');
  }
  
  // Check for repeated characters
  if (/(.)\1{2,}/.test(password)) {
    issues.push('Repeated characters weaken the password');
  }
  
  // Calculate score
  if (entropy >= 80 && issues.length === 0) {
    score = 4;
  } else if (entropy >= 60 && issues.length <= 1) {
    score = 3;
  } else if (entropy >= 40 && issues.length <= 2) {
    score = 2;
  } else if (entropy >= 25) {
    score = 1;
  } else {
    score = 0;
  }
  
  // Strength labels with personality
  const labels = [
    "Weak. Don't.",
    "Okay, but risky.",
    "Solid.",
    "Annoyingly strong.",
    "Okay, relax.",
  ];
  
  // Estimate crack time (assuming 100 billion guesses/second - modern GPU cluster)
  const guessesPerSecond = CRACK_TIME_CONFIG.guessesPerSecond;
  const combinations = Math.pow(poolSize || 1, length);
  const seconds = combinations / guessesPerSecond / 2; // Average case
  
  const minute = 60;
  const hour = 3600;
  const day = 86400;
  const year = 31536000;
  const thousand = 1000;
  const million = 1000000;
  const billion = 1000000000;
  const trillion = 1000000000000;
  const quadrillion = 1000000000000000;
  
  let crackTime: string;
  if (seconds < 0.001) {
    crackTime = 'instantly';
  } else if (seconds < 1) {
    crackTime = `${(seconds * 1000).toFixed(0)}ms`;
  } else if (seconds < minute) {
    crackTime = `${Math.round(seconds)} seconds`;
  } else if (seconds < hour) {
    crackTime = `${Math.round(seconds / minute)} minutes`;
  } else if (seconds < day) {
    crackTime = `${Math.round(seconds / hour)} hours`;
  } else if (seconds < year) {
    crackTime = `${Math.round(seconds / day)} days`;
  } else if (seconds < year * thousand) {
    crackTime = `${Math.round(seconds / year)} years`;
  } else if (seconds < year * million) {
    const k = Math.round(seconds / year / thousand);
    crackTime = `${k} thousand years`;
  } else if (seconds < year * billion) {
    const m = Math.round(seconds / year / million);
    crackTime = `${m} million years`;
  } else if (seconds < year * trillion) {
    const b = Math.round(seconds / year / billion);
    crackTime = `${b} billion years`;
  } else if (seconds < year * quadrillion) {
    const t = Math.round(seconds / year / trillion);
    crackTime = `${t} trillion years`;
  } else {
    // Universe age: 13.8 billion years. Heat death: ~10^100 years
    const exponent = Math.floor(Math.log10(seconds / year));
    if (exponent > CRACK_TIME_CONFIG.heatDeathThreshold) {
      crackTime = 'heat death of the universe';
    } else {
      crackTime = `10^${exponent} years`;
    }
  }
  
  return {
    score,
    label: labels[score],
    crackTime,
    issues,
    entropy: Math.round(entropy),
  };
}

/**
 * Copy text to clipboard
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback for older browsers
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    document.body.appendChild(textArea);
    textArea.select();
    try {
      document.execCommand('copy');
      return true;
    } catch {
      return false;
    } finally {
      document.body.removeChild(textArea);
    }
  }
}
