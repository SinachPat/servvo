# @servvo/mcp-server

The remote MCP endpoint agents connect to. Streamable HTTP transport; Servvo acts as an
**OAuth 2.1 resource server** (PKCE S256, RFC 9728 metadata, RFC 8707 resource
indicators, `WWW-Authenticate` on 401).

**Tenancy invariant:** the brand comes from the verified token. The URL is a
convenience; the token is the authority. Never read a brandId from tool arguments.

`authenticate()` currently returns null for every request — an auth stub that fails
closed until real JWKS verification lands (Prompt 6). Tests pin that it cannot be
bypassed.

Tool design rules: [`.claude/skills/mcp-tool-design/SKILL.md`](../../.claude/skills/mcp-tool-design/SKILL.md).
