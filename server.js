const tls = require('tls');
const fs = require('fs');
const path = require('path');
const { handleRequest } = require('./lib/handler');
const crypto = require('crypto');

const PORT = 1966;
const HOST = '0.0.0.0';

const options = {
    key: fs.readFileSync('key.pem'),
    cert: fs.readFileSync('cert.pem'),
    minVersion: 'TLSv1.2', // Relaxed to 1.2 for compatibility with older clients
    rejectUnauthorized: false,
    requestCert: false // Optional mutual TLS not strictly enforced for basic server
};

const TOKEN_FILE = path.join(__dirname, 'drift_token.txt');
let VALID_TOKEN = '';

// Load or Generate Drift Token
if (fs.existsSync(TOKEN_FILE)) {
    VALID_TOKEN = fs.readFileSync(TOKEN_FILE, 'utf8').trim();
    console.log('Loaded Drift Token from drift_token.txt');
} else {
    // Generate 256-bit (64 hex chars) token
    VALID_TOKEN = crypto.randomBytes(32).toString('hex');
    fs.writeFileSync(TOKEN_FILE, VALID_TOKEN);
    console.log('Generated new Drift Token:', VALID_TOKEN);
    console.log('Saved to drift_token.txt');
}

const server = tls.createServer(options, (socket) => {
    console.log(`New connection from ${socket.remoteAddress}:${socket.remotePort}`);

    // Binary safe handling
    // socket.setEncoding('utf8'); // REMOVED to support binary Drift

    let buffer = Buffer.alloc(0);
    // State: 0 = Waiting for request, 1 = Drift Body, 2 = Done
    let state = 0;
    let driftRemaining = 0;
    let driftToken = null;
    let driftStream = null;

    socket.on('data', (data) => {
        // Concatenate new data to buffer
        buffer = Buffer.concat([buffer, data]);

        // Simple state machine for request parsing
        if (state === 0) {
            // Looking for Request Headers (Text)
            let lineEndIndex;
            // Iterate as long as we find newlines and are in state 0
            while ((lineEndIndex = buffer.indexOf('\n')) !== -1 && state === 0) {

                // Extract line buffer
                const lineBuf = buffer.subarray(0, lineEndIndex);
                const lineStr = lineBuf.toString('utf8').trim();

                // Move buffer forward (skip \n)
                buffer = buffer.subarray(lineEndIndex + 1);

                if (lineStr === '') {
                    continue; // Ignore empty lines
                }

                // Check if this is an Accept header
                if (lineStr.toLowerCase().startsWith('accept:')) {
                    continue;
                }

                // Handle the request
                handleRequest(lineStr, socket)
                    .then((result) => {
                        if (result && result.isDrift) {
                            // Enforce Token
                            if (result.driftToken !== VALID_TOKEN) {
                                console.log('Invalid Drift Token attempt:', result.driftToken);
                                socket.write('50 Permanent failure\r\n\r\nInvalid Drift Token');
                                socket.end();
                                state = 2;
                                return; // Stop processing
                            }

                            state = 1;
                            driftRemaining = result.driftSize;
                            driftToken = result.driftToken;

                            // Process any remaining buffer content as body
                            if (buffer.length > 0) processDriftBody();
                        } else {
                            state = 2;
                        }
                    })
                    .catch(err => {
                        console.error('Error handling request:', err);
                        socket.write('50 Permanent failure\r\n\r\nInternal Server Error');
                        socket.end();
                        state = 2;
                    });

                if (state !== 0) break;
            }
        } else if (state === 1) {
            processDriftBody();
        }
    });

    function processDriftBody() {
        if (driftRemaining <= 0) return;

        // Calculate chunk size
        const chunkLen = Math.min(buffer.length, driftRemaining);
        const chunk = buffer.subarray(0, chunkLen);

        if (!driftStream) {
            // First chunk, open file
            const uploadPath = path.join(__dirname, 'content/uploads', `drift_${Date.now()}_${Math.random().toString(36).substr(2, 5)}.sky`);
            driftStream = fs.createWriteStream(uploadPath); // Binary default
            console.log('Receiving Drift to:', uploadPath);
        }

        driftStream.write(chunk);

        // Advance buffer and decrease remaining count
        buffer = buffer.subarray(chunkLen);
        driftRemaining -= chunkLen;

        if (driftRemaining <= 0) {
            if (driftStream) driftStream.end();
            driftStream = null;

            socket.write('20 text/sky\r\n\r\nDrift Upload Successful');
            socket.end();
            state = 2;
        }
    }

    socket.on('end', () => {
        console.log('Client disconnected');
    });

    socket.on('error', (err) => {
        console.error('Socket error:', err);
    });
});

server.listen(PORT, HOST, () => {
    console.log(`Sky Protocol Server listening on sky://${HOST}:${PORT}`);
});
