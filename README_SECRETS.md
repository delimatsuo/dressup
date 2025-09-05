# WHERE TO PUT YOUR API KEYS

## For Anthropic API Key (Task Master):
1. Copy `.mcp.json.example` to `.mcp.json`
2. Replace `YOUR_ANTHROPIC_API_KEY_HERE` with your actual key
3. This file is gitignored and won't be committed

## For Firebase (Frontend):
- Keys are in `.env.local` (already configured)
- These are public Firebase config keys (safe to expose)

## For Service Account (Cloud Functions):
- Located in `functions/serviceAccount.json`
- This file is gitignored and won't be committed

## Files to Keep:
- `.env.local` - Firebase frontend config (safe, these are public keys)
- `.mcp.json` - YOUR Anthropic API key goes here (create from example)
- `functions/serviceAccount.json` - GCP service account (already configured)

## Example Files (for reference only):
- `.mcp.json.example` - Template for MCP config
- `.env.local.example` - Template for environment variables (if needed)

## NEVER commit:
- `.mcp.json` (contains your Anthropic key)
- `functions/serviceAccount.json` (contains private key)