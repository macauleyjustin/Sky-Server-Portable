function parseRequest(line) {
    line = line.trim();

    // Check for Drift: DRIFT size=...;token=...
    if (line.startsWith('DRIFT')) {
        const parts = line.split(/\s+/);
        if (parts.length < 2) throw new Error('Malformed DRIFT request');

        const params = parts[1];
        const sizeMatch = params.match(/size=(\d+)/);
        const tokenMatch = params.match(/token=([a-fA-F0-9]+)/);

        if (!sizeMatch || !tokenMatch) throw new Error('Missing size or token in DRIFT');

        return {
            isDrift: true,
            url: null, // Drift doesn't have a URL in the request line typically? Spec says: "DRIFT size=;token= CRLF"
            // Wait, spec doesn't show URL in Drift line. 
            // "Drift upload (OPTIONAL): DRIFT size=;token= CRLF [Body]"
            // This implies the server assigns the URL or it's context-dependent?
            // Actually, the spec is lightweight. Usually uploads target a resource?
            // Re-reading spec: "DRIFT size=;token= CRLF"
            // It seems it might be a global upload or the context isn't clear in that snippet.
            // Let's assume for now it uploads to a new location.
            driftSize: parseInt(sizeMatch[1]),
            driftToken: tokenMatch[1]
        };
    }

    // Standard Request: [Accept: CRLF] CRLF URL CRLF
    // But simplified one-line view for core logic often treats the whole line.
    // Spec: "Standard request: [Accept: CRLF] CRLF"
    // Wait, the spec formatting is:
    // [Accept: <mime> CRLF]
    // <URL> CRLF
    // So there can be an optional Accept header line composed of "Accept: ...", 
    // FOLLOWED by the URL line.
    // Our server logic in server.js split by newline and took the first line. 
    // This needs to be smarter to handle the optional Accept header.

    // However, for MVP/v1, let's look at the line we got.
    // If it starts with "Accept:", we should ignore it and look for the next line as URL.
    // This logic needs to move to server.js accumulator probably, or we handle it here if passed strictly.

    // Standard Request
    // The server loop filters out 'Accept:' lines before calling this.
    // So 'line' is either DRIFT or a URL.

    // Basic verification of absolute URL
    // Sky spec: "URL MUST be absolute (including scheme) on initial connection."
    // We can enforce this.

    return {
        url: line,
        isDrift: false
    };
}

module.exports = { parseRequest };
