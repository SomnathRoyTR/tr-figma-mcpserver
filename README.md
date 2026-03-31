# tr-figma-mcpserver

Hosted MCP (Model Context Protocol) server for downloading Figma images using access tokens.

## Overview

`tr-figma-mcpserver` is a hosted service that enables AI assistants and MCP clients to download images from Figma designs programmatically. No installation required - just configure the endpoint URL in your MCP client settings.

### Features

- Download images from Figma files using access tokens
- Supports both `/file/` and `/design/` URL formats
- Handles `node-id` parameter conversion (hyphen to colon format)
- Multiple export formats: PNG, JPG, SVG, PDF
- Configurable scale factor for raster images
- Base64-encoded responses for easy integration
- Hosted on Azure Web App with automatic deployments

## Quick Start

### 1. Get Your Figma Access Token

1. Go to [Figma Settings](https://www.figma.com/settings)
2. Scroll to "Personal access tokens"
3. Click "Create new token"
4. Give it a name (e.g., "MCP Server")
5. Copy the token (format: `figd_...`)

### 2. Configure MCP Client

Add the server to your MCP client configuration:

**VS Code** (`.vscode/mcp.json`):
```json
{
  "mcpServers": {
    "tr-figma-mcpserver": {
      "command": "node",
      "args": ["/path/to/tr-figma-mcpserver/dist/index.js"],
      "env": {
        "MCP_STDIO": "true"
      }
    }
  }
}
```

**Claude Desktop** (config file location varies by OS):
```json
{
  "mcpServers": {
    "tr-figma-mcpserver": {
      "command": "node",
      "args": ["/path/to/tr-figma-mcpserver/dist/index.js"],
      "env": {
        "MCP_STDIO": "true"
      }
    }
  }
}
```

### 3. Use the Tool

Call the `download_figma_images` tool from your MCP client:

```typescript
{
  "name": "download_figma_images",
  "arguments": {
    "figmaAccessToken": "figd_YOUR_TOKEN_HERE",
    "figmaUrl": "https://www.figma.com/design/WJNNpEsralNcSMptsFbFH9/LT-Matters-page?node-id=29302-167474",
    "format": "png",
    "scale": 2
  }
}
```

## Supported URL Formats

The server supports both Figma URL formats:

1. **File URLs**: `https://www.figma.com/file/{fileId}/{fileName}`
2. **Design URLs**: `https://www.figma.com/design/{fileId}/{fileName}?node-id=123-456`

### Node ID Conversion

The server automatically converts node IDs from URL format to API format:
- URL format: `node-id=29302-167474` (hyphen separator)
- API format: `29302:167474` (colon separator)

## API Reference

### Tool: `download_figma_images`

Downloads images from Figma designs and returns them as Base64-encoded resources.

#### Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `figmaAccessToken` | string | Yes | - | Figma personal access token |
| `figmaUrl` | string | Yes | - | Figma file URL (supports /file/ and /design/ paths) |
| `nodeIds` | string[] | No | From URL | Specific node IDs to export |
| `format` | enum | No | 'png' | Export format: `png`, `jpg`, `svg`, `pdf` |
| `scale` | number | No | 1 | Scale factor for raster images (0.01 to 4) |

#### Response

```typescript
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

## Error Handling

The server returns helpful error messages for common issues:

- **401 Unauthorized**: Invalid or expired Figma access token
- **403 Forbidden**: No access to the Figma file
- **404 Not Found**: File or node doesn't exist
- **429 Rate Limited**: Too many requests to Figma API
- **Invalid URL**: URL doesn't match expected Figma format
- **No node IDs**: Neither nodeIds parameter nor node-id in URL provided

## Local Development

### Prerequisites

- Node.js 18+ installed
- npm or yarn package manager

### Setup

1. Clone the repository:
```bash
git clone https://github.com/your-org/tr-figma-mcpserver.git
cd tr-figma-mcpserver
```

2. Install dependencies:
```bash
npm install
```

3. Build TypeScript:
```bash
npm run build
```

4. Run development server:
```bash
npm run dev
```

5. Run in MCP stdio mode:
```bash
MCP_STDIO=true npm start
```

### Testing

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
  "timestamp": "2026-04-01T12:00:00.000Z"
}
```

## Deployment

### Azure Web App Deployment

The server is configured for automatic deployment to Azure Web App via GitHub Actions.

#### Setup Steps

1. **Create Azure Web App**:
   - Go to Azure Portal → Create Web App
   - Name: `tr-figma-mcpserver`
   - Runtime: Node 18 LTS
   - Region: Choose based on your location

2. **Download Publish Profile**:
   - In Azure Portal → Web App → Download publish profile
   - Save the `.PublishSettings` file

3. **Configure GitHub Secret**:
   - GitHub repo → Settings → Secrets and variables → Actions
   - New secret: `AZURE_WEBAPP_PUBLISH_PROFILE`
   - Paste the contents of the publish profile

4. **Deploy**:
   - Push to main branch
   - GitHub Actions will automatically build and deploy
   - Monitor progress in Actions tab

#### Post-Deployment

- Health check: `https://tr-figma-mcpserver.azurewebsites.net/health`
- Service runs automatically with HTTPS enabled

## Security

### Token Handling

- **Server does NOT store tokens**: Tokens are passed per-request and used immediately
- **No logging**: Tokens are never logged or persisted
- **User responsibility**: Users secure their own Figma tokens
- **HTTPS required**: All communication encrypted in transit (provided by Azure)

### Best Practices

1. Never commit tokens to git repositories
2. Rotate tokens regularly
3. Use separate tokens for different services
4. Revoke tokens if compromised
5. Only share tokens with trusted MCP clients

## Troubleshooting

### "Unauthorized: Invalid or expired Figma access token"

- Verify your token is correct (starts with `figd_`)
- Check if token was revoked in Figma settings
- Generate a new token if needed

### "Invalid Figma URL format"

- Ensure URL starts with `https://www.figma.com/`
- URL must contain `/file/` or `/design/` path
- Check for typos in the URL

### "No node IDs specified"

- Either provide `nodeIds` parameter
- Or include `node-id=123-456` in the Figma URL
- At least one node ID is required

### "Failed to download image"

- Check your internet connection
- Verify the node exists in the Figma file
- Try a smaller scale factor for large images

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT License - see LICENSE file for details

## Support

- Issues: [GitHub Issues](https://github.com/your-org/tr-figma-mcpserver/issues)
- Documentation: [MCP Documentation](https://modelcontextprotocol.io)
- Figma API: [Figma Developer Docs](https://www.figma.com/developers/api)

## Acknowledgments

- Built with [Model Context Protocol SDK](https://github.com/modelcontextprotocol/sdk)
- Powered by [Figma API](https://www.figma.com/developers/api)
- Hosted on [Azure Web App](https://azure.microsoft.com/services/app-service/web/)

---

Made with ❤️ by Thomson Reuters
