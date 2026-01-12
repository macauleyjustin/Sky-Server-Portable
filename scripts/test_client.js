const tls = require('tls');
const fs = require('fs');

const options = {
    rejectUnauthorized: false
};

function makeRequest(label, payload) {
    return new Promise((resolve) => {
        console.log(`\n--- Test: ${label} ---`);
        const socket = tls.connect(1966, 'localhost', options, () => {
            console.log('Connected');
            socket.write(payload);
        });

        socket.setEncoding('utf8');
        socket.on('data', (data) => {
            console.log('Response:', data);
        });

        socket.on('end', () => {
            console.log('Connection closed');
            resolve();
        });

        socket.on('error', (err) => {
            console.error('Error:', err);
            resolve();
        });
    });
}

async function runTests() {
    // 1. Basic Request
    await makeRequest('Basic Request', 'sky://localhost/\r\n');

    // 2. Request with Accept Header
    await makeRequest('With Accept Header', 'Accept: text/sky\r\nsky://localhost/index.sky\r\n');

    // 3. Not Found
    await makeRequest('Not Found', 'sky://localhost/missing\r\n');

    // 4. Drift (Simulated)
    // "DRIFT size=5;token=ABC CRLF HELLO"
    // Note: size=5 matches "HELLO" length
    await makeRequest('Drift Upload', 'DRIFT size=5;token=ABC\r\nHELLO');
}

runTests();
