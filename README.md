# HarbourMesh

<div align="center">

**Marine IoT Platform for Vessel Digital Twin Management**

*Built by [3D3D.CA](https://3d3d.ca) — Precision Marine Technology*

[![License: AGPL v3](https://img.shields.io/badge/License-AGPL%20v3-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev/)
[![Vitest](https://img.shields.io/badge/Vitest-Testing-yellowgreen)](https://vitest.dev/)

**Zero-Tolerance QA** | **Offline-First** | **NMEA 0183/2000 Compatible**

</div>

---

## Overview

HarbourMesh is an active New Brunswick pilot build for vessel management, NB reference mapping, Signal K telemetry, and opt-in community bathymetry. Current implemented surfaces include:

- **Vessel Digital Twin** — Real-time monitoring and state management
- **NB Pilot Map** — React Leaflet map with legal GeoNB reference overlays
- **Signal K Integration** — Recorded replay and live WebSocket client path
- **Community Soundings** — Consent-safe local raw sounding capture and API sync
- **AIS Tracking** — AIS targets from telemetry stream mapping
- **Document Management** — Regulatory compliance and certifications
- **AI Companion** — Local app assistant scaffold

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    HarbourMesh Platform                      │
├─────────────────────────────────────────────────────────────┤
│  Frontend (React + TypeScript + Vite)                       │
│  ├── Components: shadcn/ui + Tailwind CSS                   │
│  ├── State: Zustand with persistence                        │
│  ├── Charts: Recharts + Custom Marine Charts                │
│  └── Maps: Leaflet + GeoNB WMS overlays                     │
├─────────────────────────────────────────────────────────────┤
│  Server (Fastify + TypeScript)                              │
│  ├── Community sounding upload API                          │
│  ├── Strict payload validation                              │
│  └── JSONL local persistence for pilot data                  │
├─────────────────────────────────────────────────────────────┤
│  Core Libraries                                              │
│  ├── @harbourmesh/nmea — NMEA 0183/2000 Parser              │
│  ├── @harbourmesh/security — AES-256 + RBAC + JWT           │
│  ├── @harbourmesh/weather — GRIB Parsing + Routing          │
│  └── @harbourmesh/charts — Offline Cartography              │
├─────────────────────────────────────────────────────────────┤
│  Hardware Integration                                        │
│  ├── GPS (NMEA GGA/RMC)                                     │
│  ├── AIS (Position Reports, Safety Messages)                │
│  ├── Depth (DBT, DPT)                                       │
│  ├── Wind (MWV)                                             │
│  ├── Engine (RPM, Oil Pressure, Temperature)                │
│  └── Tank Levels (Fuel, Water, Waste)                       │
└─────────────────────────────────────────────────────────────┘
```

## Quick Start

### Prerequisites

- Node.js 18+ 
- npm 9+ or pnpm 8+
- Git

### Installation

```bash
# Clone the repository
git clone https://github.com/3d3dca/harbourmesh.git
cd harbourmesh

# Install web dependencies
cd app && npm install

# Run web development server
npm run dev

# Run web tests
npm test
```

### Current Build Commands

```bash
# Check the web app
cd app
npm run lint
npm run type-check
npm run test:run

# Build the web app
npm run build

# Check the API
cd ../server
npm ci
npm test
npm run type-check
npm run build

# Run the API locally
npm run dev
```

DZIP and platform-specific packages are planned but are not implemented in this checkout yet. See [New Brunswick Launch Plan](docs/HARBOURMESH_NB_LAUNCH_PLAN_2026_05_06.md) for the completion path.

## Cloudflare Pages

The web app is configured for Cloudflare Pages from `app/wrangler.toml`.

```bash
cd app
npm ci
npm run build
npm run deploy:pages
```

The manual GitHub workflow `.github/workflows/cloudflare-pages.yml` expects `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` repository secrets.

## API Container

```bash
docker build -t harbourmesh-api ./server
docker run --rm -p 3001:3001 harbourmesh-api
```

Set `HARBOURMESH_WRITE_API_KEYS`/`HARBOURMESH_REVIEW_API_KEYS`, or their `*_SHA256S` hash equivalents, plus `HARBOURMESH_DATA_DIR` for a real pilot deployment.

## Documentation

- [Architecture Audit](docs/ARCHITECTURE_AUDIT.md)
- [New Brunswick Launch Plan](docs/HARBOURMESH_NB_LAUNCH_PLAN_2026_05_06.md)
- [Security Audit](docs/SECURITY_AUDIT.md)
- [DZIP Format Specification](docs/DZIP_FORMAT.md)
- [Deployment Guide](docs/DEPLOYMENT_GUIDE.md)
- [Operations Wiki](HarborMesh-Operations-Wiki.md)

## Testing

HarbourMesh currently has focused unit and integration coverage for utilities, stores, NB chart sources, Signal K mapping, route planning, community sounding extraction, frontend sync, and the Fastify API.

```bash
# Web
cd app
npm run test:coverage

# API
cd ../server
npm test
```

## Security

- Official chart data is separated from community/reference data.
- Community sounding uploads reject official chart data and raw local-only positions.
- Payloads carry consent, source, confidence, and correction metadata.
- Full production auth/RBAC/encryption hardening remains on the launch plan.

See [Security Audit](docs/SECURITY_AUDIT.md) for details.

## License

This program is free software: you can redistribute it and/or modify it under the terms of the GNU Affero General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.

**Commercial Licensing:** Commercial use requires a separate license from [3D3D.CA](https://3d3d.ca). Contact licensing@3d3d.ca for enterprise pricing.

See [LICENSE](LICENSE) for full terms.

## Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) for:

- Code style and SOLID principles
- Pull request process
- Security reporting
- Community guidelines

## Support

- **Issues:** GitHub Issues for bug reports
- **Discussions:** GitHub Discussions for questions
- **Security:** security@3d3d.ca for vulnerabilities

---

<div align="center">

**Built with precision by 3D3D.CA**

*Marine IoT. Offline-First. Enterprise-Grade.*

</div>
