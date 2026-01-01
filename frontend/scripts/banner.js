const os = require('os');
const { networkInterfaces } = os;

// Get Local IP
const getLocalExternalIP = () => {
    const nets = networkInterfaces();
    for (const name of Object.keys(nets)) {
        for (const net of nets[name]) {
            // Skip over non-IPv4 and internal (i.e. 127.0.0.1) addresses
            if (net.family === 'IPv4' && !net.internal) {
                return net.address;
            }
        }
    }
    return '0.0.0.0';
};

const ip = getLocalExternalIP();

console.log('\n\x1b[36m%s\x1b[0m', '=======================================================');
console.log('\x1b[1m\x1b[31m%s\x1b[0m', '  4 in Juan Vital Sign - System Startup');
console.log('\x1b[36m%s\x1b[0m', '=======================================================');
console.log('');
console.log('  \x1b[33m%s\x1b[0m', 'System Access Points:');
console.log('');
console.log('  \x1b[1m4-in-Juan-Vital-Sign-Kiosk  \x1b[0m: \x1b[36mhttp://localhost:3000\x1b[0m');
console.log('  \x1b[1m4-in-Juan-Vital-Sign-Remote \x1b[0m: \x1b[36mhttp://' + ip + ':3000\x1b[0m');
console.log('');
console.log('\x1b[90m%s\x1b[0m', '  Note: For remote devices, ensure they are on the');
console.log('\x1b[90m%s\x1b[0m', '  same Wi-Fi network (' + ip + ')');
console.log('');
console.log('\x1b[36m%s\x1b[0m', '=======================================================\n');
