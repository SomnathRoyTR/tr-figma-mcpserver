# tr-figma-mcpserver

Hosted MCP (Model Context Protocol) server for downloading Figma images using access tokens.

## Quick Start - Using the Hosted Service

The easiest way to use tr-figma-mcpserver is through our hosted Azure deployment. No installation required!

### 1. Get Your Figma Access Token

1. Go to [Figma Settings](https://www.figma.com/settings)
2. Scroll to "Personal access tokens"
3. Click "Create new token"
4. Give it a name (e.g., "MCP Server")
5. Copy the token (format: `figd_...`)

### 2. Configure Your MCP Client

**Method 1: Local Stdio (Recommended)**

Create `.mcp.json` in your project root or VS Code workspace:

```json
{
  "mcpServers": {
    "tr-figma-mcpserver": {
      "command": "node",
      "args": ["C:/Users/YOUR_USERNAME/path/to/tr-figma-mcpserver/dist/index.js"],
      "env": {
        "MCP_STDIO": "true",
        "FIGMA_ACCESS_TOKEN": "figd_YOUR_TOKEN_HERE"
      }
    }
  }
}
```

**Replace the path** with the absolute path to where you have tr-figma-mcpserver installed.

**Method 2: Hosted SSE (Experimental - Not Yet Supported by Most Clients)**

```json
{
  "mcpServers": {
    "tr-figma-mcpserver": {
      "url": "https://tr-figma-mcpserver-gsakbybcgegzdkc4.centralus-01.azurewebsites.net/mcp",
      "transport": "sse",
      "env": {
        "FIGMA_ACCESS_TOKEN": "figd_YOUR_TOKEN_HERE"
      }
    }
  }
}
```

*Note: SSE transport support varies by MCP client. Use Method 1 for guaranteed compatibility.*

**Configuration Locations:**
- **VS Code / Cursor:** `.mcp.json` in project root or `.vscode/mcp.json`
- **Claude Desktop:** `~/Library/Application Support/Claude/claude_desktop_config.json` (Mac) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows)

### 3. Verify Setup

Check that the MCP server appears in your MCP client:
- In VS Code: Check the MCP panel/output
- In Cursor: Settings → MCP Servers
- In Claude Desktop: Check logs

### 4. Use the Tool

Once configured and loaded, use the `download_figma_images` tool:

**Basic usage:**
```json
{
  "figmaUrl": "https://www.figma.com/design/WJNNpEsralNcSMptsFbFH9/LT-Matters-page?node-id=29302-167474"
}
```

**With options:**
```json
{
  "figmaUrl": "https://www.figma.com/design/WJNNpEsralNcSMptsFbFH9/LT-Matters-page?node-id=29302-167474",
  "format": "png",
  "scale": 2
}
```

**That's it!** No need to pass the token in every request since it's configured in your MCP client settings.

---

## Features

- ✅ Download images from Figma files using access tokens
- ✅ Supports both `/file/` and `/design/` URL formats
- ✅ Automatic `node-id` parameter conversion (hyphen to colon format)
- ✅ Multiple export formats: PNG, JPG, SVG, PDF
- ✅ Configurable scale factor for raster images (0.01 to 4)
- ✅ Base64-encoded responses for easy integration
- ✅ Hosted on Azure Web App - no installation required
- ✅ Configure token once, use everywhere

## Supported URL Formats

The server supports both Figma URL formats:

1. **File URLs**: `https://www.figma.com/file/{fileId}/{fileName}`
2. **Design URLs**: `https://www.figma.com/design/{fileId}/{fileName}?node-id=123-456`

### Node ID Conversion

The server automatically converts node IDs from URL format to API format:
- URL format: `node-id=29302-167474` (hyphen separator)
- API format: `29302:167474` (colon separator)

**Example:**
- Input: `https://www.figma.com/design/WJNNpEsralNcSMptsFbFH9/LT-Matters-page?node-id=29302-167474`
- Parsed: File ID `WJNNpEsralNcSMptsFbFH9`, Node ID `29302:167474`

---

## API Reference

### Tool: `download_figma_images`

Downloads images from Figma designs and returns them as Base64-encoded resources.

#### Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `figmaAccessToken` | string | No* | - | Figma personal access token (*required if not set in environment) |
| `figmaUrl` | string | Yes | - | Figma file URL (supports /file/ and /design/ paths) |
| `nodeIds` | string[] | No | From URL | Specific node IDs to export (uses node-id from URL if not provided) |
| `format` | enum | No | 'png' | Export format: `png`, `jpg`, `svg`, `pdf` |
| `scale` | number | No | 1 | Scale factor for raster images (0.01 to 4) |

#### Response

```json
{
  "content": [
    {
      "type": "text",
      "text": "Downloaded 1 image from Figma file: LT Matters page"
    },
    {
      "type": "resource",
      "resource": {
        "uri": "data:image/png;base64,iVBORw0KGgo...",
        "mimeType": "image/png",
        "text": "Node 29302:167474 (245.67 KB)"
      }
    }
  ]
}
```

---

## Error Handling

The server returns helpful error messages for common issues:

| Error | Description | Solution |
|-------|-------------|----------|
| **401 Unauthorized** | Invalid or expired Figma access token | Get a new token from https://www.figma.com/settings |
| **403 Forbidden** | No access to the Figma file | Check file permissions or use a different token |
| **404 Not Found** | File or node doesn't exist | Verify the Figma URL is correct |
| **429 Rate Limited** | Too many requests to Figma API | Wait a moment and try again |
| **Invalid URL** | URL doesn't match expected format | Use format: `figma.com/design/{fileId}/...` |
| **No token** | Neither parameter nor env var provided | Set FIGMA_ACCESS_TOKEN or provide in request |

---

## Health Check

Verify the service is running:

```bash
curl https://tr-figma-mcpserver-gsakbybcgegzdkc4.centralus-01.azurewebsites.net/health
```

Expected response:
```json
{
  "status": "healthy",
  "service": "tr-figma-mcpserver",
  "version": "1.0.0",
  "timestamp": "2026-04-01T12:00:00.000Z"
}
```

---

## Security

### Token Handling

- **Server does NOT store tokens**: Tokens are passed per-request or via environment variables
- **No logging**: Tokens are never logged or persisted
- **User responsibility**: Users secure their own Figma tokens
- **HTTPS required**: All communication encrypted in transit (Azure provides SSL/TLS)

### Best Practices

1. ✅ Never commit tokens to git repositories
2. ✅ Store tokens in environment variables or secure configuration
3. ✅ Rotate tokens regularly
4. ✅ Use separate tokens for different services
5. ✅ Revoke tokens immediately if compromised
6. ✅ Only share tokens with trusted MCP clients

---

## Troubleshooting

### "No token provided"

**Problem:** Neither `figmaAccessToken` parameter nor `FIGMA_ACCESS_TOKEN` environment variable is set.

**Solution:** 
- Add token to your MCP client config's `env` section, OR
- Provide `figmaAccessToken` in each request

### "Unauthorized: Invalid or expired token"

**Problem:** Your Figma token is incorrect or has expired.

**Solution:**
- Verify token format (should start with `figd_`)
- Check if token was revoked in Figma settings
- Generate a new token at https://www.figma.com/settings

### "Invalid Figma URL format"

**Problem:** URL doesn't match expected Figma format.

**Solution:**
- Ensure URL starts with `https://www.figma.com/`
- URL must contain `/file/` or `/design/` path
- Example: `https://www.figma.com/design/{fileId}/{name}?node-id=123-456`

### "No node IDs specified"

**Problem:** Neither `nodeIds` parameter nor `node-id` in URL provided.

**Solution:**
- Add `nodeIds` parameter: `["123:456", "789:012"]`, OR
- Include `node-id` in URL: `?node-id=123-456`

### "Failed to download image"

**Problem:** Network issue or Figma API error.

**Solution:**
- Check your internet connection
- Verify the node exists in the Figma file
- Try a smaller scale factor for large images
- Wait a moment if rate limited

---

## Development & Local Setup

Want to run the server locally or contribute to development?

### Prerequisites

- Node.js 22+ installed
- npm or yarn package manager
- Git

### Local Installation

1. **Clone the repository:**
```bash
git clone https://github.com/your-org/tr-figma-mcpserver.git
cd tr-figma-mcpserver
```

2. **Install dependencies:**
```bash
npm install
```

3. **Build TypeScript:**
```bash
npm run build
```

4. **Run locally:**
```bash
npm run dev
```

### Local MCP Configuration

To use your local instance instead of the hosted one:

```json
{
  "mcpServers": {
    "tr-figma-mcpserver": {
      "command": "node",
      "args": ["C:/path/to/tr-figma-mcpserver/dist/index.js"],
      "env": {
        "MCP_STDIO": "true",
        "FIGMA_ACCESS_TOKEN": "figd_YOUR_TOKEN_HERE"
      }
    }
  }
}
```

### Testing Locally

Test the health endpoint:
```bash
curl http://localhost:3000/health
```

Expected response:
```json
{
  "status": "healthy",
  "service": "tr-figma-mcpserver",
  "version": "1.0.0",
  "timestamp": "..."
}
```

### Project Structure

```
tr-figma-mcpserver/
├── src/
│   ├── index.ts              # Express server + SSE/stdio transports
│   ├── server.ts             # MCP server factory
│   ├── tools/
│   │   └── download-image.ts # Tool implementation
│   ├── services/
│   │   ├── figma-api.ts      # Figma API client
│   │   └── image-processor.ts# Image download & encoding
│   └── types/
│       └── figma.ts          # TypeScript type definitions
├── dist/                     # Compiled JavaScript (generated)
├── package.json              # Dependencies and scripts
├── tsconfig.json             # TypeScript configuration
└── README.md                 # This file
```

---

## Deployment

The server is deployed to Azure Web App with automatic GitHub Actions CI/CD.

### Deployment URL
**Live:** https://tr-figma-mcpserver-gsakbybcgegzdkc4.centralus-01.azurewebsites.net

### Endpoints
- **Health Check:** `/health`
- **MCP SSE:** `/mcp`
- **Info:** `/`

### GitHub Actions

Every push to `main` or `master` branch triggers automatic deployment:
1. Install dependencies
2. Build TypeScript
3. Run type checking
4. Deploy to Azure Web App
5. Verify deployment with health check

Monitor deployments at: [GitHub Actions](https://github.com/your-org/tr-figma-mcpserver/actions)

---

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## License

MIT License - see LICENSE file for details

---

## Support

- **Issues:** [GitHub Issues](https://github.com/your-org/tr-figma-mcpserver/issues)
- **MCP Documentation:** [Model Context Protocol](https://modelcontextprotocol.io)
- **Figma API:** [Figma Developer Docs](https://www.figma.com/developers/api)
- **Service Status:** https://tr-figma-mcpserver-gsakbybcgegzdkc4.centralus-01.azurewebsites.net/health

---

## Acknowledgments

- Built with [Model Context Protocol SDK](https://github.com/modelcontextprotocol/sdk)
- Powered by [Figma API](https://www.figma.com/developers/api)
- Hosted on [Azure Web App](https://azure.microsoft.com/services/app-service/web/)

---

**Made with ❤️ by Thomson Reuters**

**Live Service:** https://tr-figma-mcpserver-gsakbybcgegzdkc4.centralus-01.azurewebsites.net
