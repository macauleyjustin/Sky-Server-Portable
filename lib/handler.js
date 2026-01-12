const fs = require('fs');
const path = require('path');
const { parseRequest } = require('./protocol');

const CONTENT_DIR = path.join(__dirname, '../content');

async function handleRequest(requestLine, socket) {
    console.log('Processing:', requestLine);

    try {
        const { url, driftToken, driftSize, isDrift } = parseRequest(requestLine);

        if (isDrift) {
            // Return drift info to server.js loop
            return { isDrift: true, driftToken, driftSize };
        }

        // Standard Request Handling
        // Parse URL to find file
        // For simplicity in this v0.1, we'll strip scheme/host and look at path
        let targetPath = url;

        // Handle absolute URLs (required by spec)
        if (url.includes('://')) {
            try {
                const parsedUrl = new URL(url);
                targetPath = parsedUrl.pathname;
            } catch (e) {
                // Invalid URL
                socket.write('59 Bad Request\r\n\r\nInvalid URL format');
                socket.end();
                return;
            }
        }

        // Security: Prevent directory traversal
        // Normalize and ensure it stays within content root
        let safeSuffix = path.normalize(targetPath).replace(/^(\.\.[\/\\])+/, '');
        // If path is root '/', map to index
        if (safeSuffix === '/' || safeSuffix === '.' || safeSuffix === '\\') safeSuffix = 'index.sky';

        let filePath = path.join(CONTENT_DIR, safeSuffix);

        // Directory index resolution
        if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
            filePath = path.join(filePath, 'index.sky');
        } else if (!fs.existsSync(filePath) && fs.existsSync(filePath + '.sky')) {
            filePath += '.sky';
        }

        if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
            const content = fs.readFileSync(filePath, 'utf8');

            // 1. Determine MIME
            const ext = path.extname(filePath).toLowerCase();
            let mime = 'text/sky';
            if (ext === '.txt') mime = 'text/plain';
            if (ext === '.md') mime = 'text/markdown';
            if (ext === '.json') mime = 'application/json';

            // 2. Check for Metadata (Sidecar file)
            let headers = '';
            const metaPath = filePath + '.meta';
            if (fs.existsSync(metaPath)) {
                const metaContent = fs.readFileSync(metaPath, 'utf8').trim();
                // Headers are key: value lines separated by CRLF
                headers = metaContent + '\r\n';
            }

            // Construct Response: Status [Meta] CRLF [Headers CRLF] Body
            // Meta is usually MIME. 
            // Header block ends with blank line if headers exist, or just the blank line after status/meta.

            // Spec: <Status><Space><Meta><CRLF><Headers><CRLF><body>
            // If headers are empty, it's just CRLF before body? 
            // Actually spec says Headers are optional lines.

            let responseHead = `20 ${mime}\r\n`;
            if (headers) {
                responseHead += headers;
            }
            // End of headers
            responseHead += '\r\n';

            socket.write(responseHead + content);
            socket.end();
        } else {
            console.log('404 Not Found:', filePath);
            socket.write('40 Not Found\r\n\r\nResource not found: ' + safeSuffix);
            socket.end();
        }

    } catch (error) {
        console.error("Protocol Error:", error);
        socket.write('59 Bad Request\r\n\r\n' + error.message);
        socket.end();
    }

    return null; // Not drift
}

async function handleDrift(url, token, size, socket) {
    // Kept for reference but logic moved to server.js stream handler
}

module.exports = { handleRequest };
