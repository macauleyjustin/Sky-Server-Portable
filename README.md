# Sky Server

This is a reference implementation of the Sky Protocol Server.

## Usage

### Prerequisites
- Node.js (Version 14 or higher recommended)

### Installation
1. Navigate to this directory.
2. Install dependencies (if any additional ones are added in `package.json`).
   ```bash
   npm install
   ```

### Running the Server
Start the server using:
```bash
node server.js
```
The server will listen on port 1966 by default (`sky://0.0.0.0:1966`).

### Authentication (Drift)
- On first run, the server generates a `drift_token.txt` file containing a secure, random hex token.
- This token is **REQUIRED** for uploading files via the Drift protocol.
- Keep this token secret.

### Content
- Place your `.sky` files in the `content/` directory.
- `content/index.sky` is served at the root URL.
- Uploaded files are stored in `content/uploads/`.

---

# Sky Protocol Specification
Version 1.0
January 11, 2026

## Abstract
Sky Protocol is a lightweight, text-oriented application protocol for distributed publication, retrieval, and curation of content. It follows a client-server model with mandatory encryption and a deliberate emphasis on client-side intelligence.

Sky extends the simplicity of protocols like Gemini while introducing practical features absent in earlier designs: client-curated overlays (inspired by Prospero’s virtual filesystem unions), organic discovery via beacons, advisory ephemerality (“fade”), optional lightweight uploads (“Drift”), and layered media extensions.

Servers are intentionally minimal; advanced features are realized primarily in clients. This design lowers barriers to hosting and encourages a decentralized, personal network of “skies.”

## 1. Introduction

### 1.1 Motivation
Modern web protocols have accumulated complexity that hinders privacy, performance, and individual publishing. Alternatives like Gopher and Gemini demonstrate demand for minimalism, but lack native mechanisms for:
* Personalized merging of distributed resources across hosts (Prospero’s unions, revived client-side).
* Easy, standardized publishing without external tools.
* Organic, decentralized discovery.
* Controlled ephemerality for temporary content.

Sky addresses these by keeping servers simple while empowering clients to curate views. Examples include:
* A personal dashboard: Base sky + overlays from friends’ journals + beacon-curated public feeds.
* Community gallery: Multiple individual skies merged into one coherent view.
* Temporary event space: Content that fades automatically post-event.
* Offline mesh: Cached skies shared peer-to-peer.

### 1.2 Requirements Language
The key words “MUST”, “MUST NOT”, “REQUIRED”, “SHALL”, “SHALL NOT”, “SHOULD”, “SHOULD NOT”, “RECOMMENDED”, “MAY”, and “OPTIONAL” in this document are to be interpreted as descriptive of design goals and implementation recommendations.

## 2. Sky URIs
Sky resources are identified by URIs with scheme “sky”.

**Syntax:**
`sky://authority[:port]/path[?query][#fragment]`

* Scheme: “sky” (lowercase).
* Connections MUST use TLS 1.3 or later.
* Authority: Hostname (extensions for content-addressed identifiers reserved).
* Path, query, fragment: Standard URI rules.
* Fragments: Client-side only (MUST NOT be sent to servers).
Fragments enable overlays, themes, and other client hints (see Section 5).

## 3. Protocol Operation
Sky operates over TCP/TLS. Default port: 1965 (shared with Gemini for compatibility; future registration requested for 1966).

### 3.1 Requests
Requests are line-based (CRLF terminated).

**Standard request:**
```
[Accept: <mime> CRLF]
<URL> CRLF
```

* Accept header OPTIONAL (comma-separated MIME with optional ;q= weights).
* URL MUST be absolute (including scheme) on initial connection.

**Drift upload (OPTIONAL):**
```
DRIFT size=<bytes>;token=<hex> CRLF
[Body]
```

* token: 64-character hexadecimal (256-bit random). Servers SHOULD rotate tokens.

### 3.2 Responses
```
<Status> <Meta> CRLF
[Header: Value CRLF]*
CRLF
[Body]
```

**Status codes (2-digit):**
* 2X Success (20 default: text/sky)
* 3X Redirect
* 4X Temporary failure
* 5X Permanent failure
* 6X Client certificate required (mutual TLS)

**Headers (case-insensitive, OPTIONAL):**
* Expires: <time> (“1h”, “7d”, “never”)
* Overlay-Hint: <url>@<host>
* Beacon: <tag>[,<tag>]*
* Cache-Mode: public | private | p2p

## 4. Primary Media Type: text/sky
“text/sky” extends “text/gemini”.

### 4.1 Core Syntax
Identical to text/gemini:
* #, ##, ### Headings
* => [label] Links
* Quotes
* * List items
* Blank lines for paragraphs

### 4.2 Extensions
* Special links:
    * => overlay:<url>@<host> [label]
    * => beacon:<tag> [label]
    * => fade:<time> [label]
* Typed preformatted layers:
```
layer: <type> [caption]
<content>
```
Types: visual (SVG), audio (data: URI or external), data (structured)

* Advisory comments: // Fade after: <time> // Expires: <time>

## 5. Client-Side Features

### 5.1 Overlays
Clients SHOULD merge when encountering overlay: links, Overlay-Hint headers, or #overlay= fragments.

#### 5.1.1 Merging Semantics and Examples
Clients merge content to create unified views. Rules:
* Directory listings: Alphabetical sort, de-duplicate exact paths, mark conflicts as “[conflict from @host]”.
* Text content: Append overlays after base with separator “— Drift from @host —”.
* Broken resources: Show “[faded drift]” or hide gracefully.
* Order: Base first, then overlays (fragment/header order).

Clients MAY provide configurable strategies.

### 5.2 Beacons
Beacon tags enable thematic discovery. Clients MAY index/follow them.

### 5.3 Fade (Ephemerality)
Fade is advisory only, providing social conventions and clutter reduction (no cryptographic guarantees).
* Clients SHOULD apply TTL from Expires headers or // Fade lines.
* Servers MAY refuse expired content (4X status).
* Users seeking stronger privacy SHOULD use self-hosted servers or end-to-end encryption.

### 5.4 Drift Uploads
OPTIONAL lightweight publishing. Servers supporting Drift SHOULD require strong hex tokens.

## 6. Security Considerations
* Mandatory TLS 1.3 mitigates passive attacks.
* TOFU default; clients SHOULD warn on first visit and persist pins.
* OPTIONAL mutual TLS (6X status + client certs) for higher trust.
* Clients MUST sanitize merged/layered content (sandbox SVG/audio).
* Drift tokens MUST be treated as secrets.
* Fade offers no deletion guarantees — archival clients may ignore.

## 7. Best Practices
* First-visit cert verification: Display fingerprint for out-of-band check.
* Overlay errors: Fail gracefully.
* Publishing: Use Drift for personal skies; external tools for complex sites.
* Discovery: Share beacon-tagged roots via out-of-band channels.
* Mesh use: Enable Cache-Mode: p2p for local sharing in disconnected environments.

## 8. Registration Considerations
This specification requests:
* “sky” URI scheme.
* Port 1966 (1965 interim).
* “text/sky” MIME (subtype of text/gemini).
