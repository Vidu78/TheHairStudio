const qrcode = require('qrcode-terminal');
const os = require('os');

// Trova IP locale
const nets = os.networkInterfaces();
let localIP = '0.0.0.0';
for (const name of Object.keys(nets)) {
  for (const net of nets[name]) {
    if (net.family === 'IPv4' && !net.internal) {
      localIP = net.address;
      break;
    }
  }
}

const expUrl = `exp://${localIP}:8081`;
console.log('\n========================================');
console.log('  THE HAIR STUDIO - App Demo');
console.log('========================================');
console.log('\nScansiona con EXPO GO per testare:');
console.log('URL: ' + expUrl);
console.log('');
qrcode.generate(expUrl, { small: true });
console.log('');
console.log('Credenziali Demo:');
console.log('  Admin: admin@thehairstudio.it / THS2024!');
console.log('  Cliente: qualsiasi nome + telefono');
console.log('========================================\n');
