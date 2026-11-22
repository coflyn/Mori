# Security Policy

## Supported Versions

Only the latest release receives security patches and updates.

| Version | Supported          |
| ------- | ------------------ |
| 4.6.x   | :white_check_mark: |
| < 4.6.0 | :x:                |

## Reporting a Vulnerability

If you discover a security vulnerability in Mori, please report it responsibly and privately:

1. **GitHub Security Advisory**: Open a private advisory report at [Security Advisories](https://github.com/coflyn/Mori/security/advisories/new).
2. **Email**: Send details to `riazrepo@gmail.com` with the subject `[Security] Mori Vulnerability Report`.

Please include:
- A clear description of the issue.
- Step-by-step reproduction instructions or a minimal proof of concept.
- Affected platform (Android, iOS, Web, or CLI).

### Scope
- **Client-Side Security**: Biometric/PIN privacy lock, local storage protection, and path traversal prevention in native filesystem bridges.
- **Input Sanitization**: Preventing XSS or malicious payload injection from scraped metadata.
- **Dependencies**: Critical security vulnerabilities in bundled dependencies or native plugins.

*Note: Scraper failures or CDN access issues caused by upstream platform API changes are normal bug reports, not security vulnerabilities. Please report those via public [GitHub Issues](https://github.com/coflyn/Mori/issues).*

### Response Timeline
- Initial acknowledgement within 48 hours.
- Fix developed and verified in a private branch before public release.
