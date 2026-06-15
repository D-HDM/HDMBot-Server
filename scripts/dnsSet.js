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

// Suppress Baileys noise
const originalConsoleLog = console.log;
console.log = function(...args) {
  // Convert all args to string for checking
  const msg = args.map(a => {
    if (typeof a === 'object') return JSON.stringify(a).substring(0, 200);
    return String(a);
  }).join(' ');
  
  if (msg.includes('Closing session') || 
      msg.includes('SessionEntry') ||
      msg.includes('_chains') ||
      msg.includes('currentRatchet') ||
      msg.includes('indexInfo') ||
      msg.includes('registrationId') ||
      msg.includes('ephemeralKeyPair') ||
      msg.includes('baseKey') ||
      msg.includes('remoteIdentityKey') ||
      msg.includes('Closing open session') ||
      msg.includes('<Buffer') ||
      msg.includes('prekey bundle') ||
      msg.includes('Decrypted message with closed') ||
      msg.includes('pendingPreKey') ||
      msg.includes('signedKeyId') ||
      msg.includes('preKeyId') ||
      msg.includes('Backed up to MongoDB') ||
      msg.includes('lastRemoteEphemeralKey') ||
      msg.includes('previousCounter') ||
      msg.includes('rootKey')) {
    return;
  }
  originalConsoleLog.apply(console, args);
};

// Suppress decryption errors
const originalConsoleError = console.error;
console.error = function(...args) {
  const msg = args.map(a => String(a)).join(' ');
  if (msg.includes('Bad MAC') || 
      msg.includes('decrypt') ||
      msg.includes('Session error') ||
      msg.includes('Failed to decrypt')) {
    return;
  }
  originalConsoleError.apply(console, args);
};

console.log('🌐 DNS configured');