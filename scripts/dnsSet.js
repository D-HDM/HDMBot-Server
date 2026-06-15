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

// Suppress ALL Baileys session noise
const originalConsoleLog = console.log;
console.log = function(...args) {
  for (const arg of args) {
    // Check objects for Baileys patterns
    if (typeof arg === 'object' && arg !== null) {
      const str = JSON.stringify(arg).substring(0, 150);
      if (str.includes('SessionEntry') || 
          str.includes('_chains') ||
          str.includes('registrationId') ||
          str.includes('indexInfo') ||
          str.includes('currentRatchet') ||
          str.includes('ephemeralKeyPair') ||
          str.includes('lastRemoteEphemeralKey') ||
          str.includes('rootKey') ||
          str.includes('baseKey') ||
          str.includes('remoteIdentityKey') ||
          str.includes('pendingPreKey') ||
          str.includes('chainType') ||
          str.includes('messageKeys') ||
          str.includes('chainKey') ||
          str.includes('signedKeyId') ||
          str.includes('preKeyId') ||
          str.includes('previousCounter') ||
          str.includes('closed:')) {
        return;
      }
    }
    // Check strings
    if (typeof arg === 'string') {
      if (arg.includes('Closing session') ||
          arg.includes('Removing old closed') ||
          arg.includes('Decrypted message with closed') ||
          arg.includes('Closing open session') ||
          arg.includes('prekey bundle') ||
          arg.includes('Backed up to MongoDB')) {
        return;
      }
    }
  }
  originalConsoleLog.apply(console, args);
};

// Suppress decryption errors
const originalConsoleError = console.error;
console.error = function(...args) {
  const msg = args.map(a => {
    if (typeof a === 'object') return JSON.stringify(a).substring(0, 100);
    return String(a);
  }).join(' ');
  if (msg.includes('Bad MAC') || 
      msg.includes('decrypt') ||
      msg.includes('Session error') ||
      msg.includes('Failed to decrypt')) {
    return;
  }
  originalConsoleError.apply(console, args);
};

console.log('🌐 DNS configured');