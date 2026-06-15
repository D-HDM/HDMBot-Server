const dns = require('node:dns');
dns.setDefaultResultOrder('ipv4first');
dns.setServers(['1.1.1.1', '8.8.8.8']);

// Suppress deprecation warnings
process.removeAllListeners('warning');
process.on('warning', (warning) => {
  if (warning.name === 'DeprecationWarning' && warning.message.includes('punycode')) {
    return;
  }
  console.warn(warning.name, warning.message);
});

// Suppress Baileys session noise but keep connection logs
const originalConsoleLog = console.log;
console.log = function(...args) {
  // First check if it's a string message we want to keep
  const firstArg = String(args[0] || '');
  
  // KEEP these important logs
  const keepPatterns = [
    'Connected',
    'QR ready',
    'Connecting',
    'Logged out',
    'Disconnected',
    'Reconnecting',
    'Restored',
    'Backed up',
    'MongoDB session',
    'Local session',
    'No session',
  ];
  
  for (const pattern of keepPatterns) {
    if (firstArg.includes(pattern)) {
      originalConsoleLog.apply(console, args);
      return;
    }
  }
  
  // Suppress if called from Baileys internals
  const stack = new Error().stack || '';
  if (stack.includes('node_modules/@whiskeysockets') || 
      stack.includes('node_modules/libsignal') ||
      stack.includes('/baileys/') ||
      stack.includes('/libsignal/')) {
    return;
  }
  
  originalConsoleLog.apply(console, args);
};

// Suppress decryption errors
const originalConsoleError = console.error;
console.error = function(...args) {
  const stack = new Error().stack || '';
  if (stack.includes('node_modules/@whiskeysockets') || 
      stack.includes('node_modules/libsignal')) {
    return;
  }
  originalConsoleError.apply(console, args);
};

console.log('🌐 DNS configured');