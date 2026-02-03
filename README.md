# HarbourMesh

<div align="center">

**Marine IoT Platform for Vessel Digital Twin Management**

*Built by [3D3D.CA](https://3d3d.ca) — Precision Marine Technology*

[![License: AGPL v3](https://img.shields.io/badge/License-AGPL%20v3-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)](https://react.dev/)
[![Vitest](https://img.shields.io/badge/Vitest-Testing-yellowgreen)](https://vitest.dev/)

**Zero-Tolerance QA** | **Offline-First** | **NMEA 0183/2000 Compatible**

</div>

---

## Overview

HarbourMesh is an enterprise-grade marine IoT platform designed for comprehensive vessel management. Built with SOLID principles and defense-in-depth security, it provides:

- **Vessel Digital Twin** — Real-time monitoring and state management
- **Navigation Charts** — Offline-capable cartography (MBTiles/OpenLayers)
- **Weather Routing** — GRIB-based route optimization (PredictWind-style)
- **NMEA Integration** — Full support for 0183/2000 protocols
- **AIS Tracking** — Real-time vessel collision avoidance
- **Document Management** — Regulatory compliance and certifications
- **AI Companion** — Context-aware vessel assistance

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    HarbourMesh Platform                      │
├─────────────────────────────────────────────────────────────┤
│  Frontend (React + TypeScript + Vite)                       │
│  ├── Components: shadcn/ui + Tailwind CSS                   │
│  ├── State: Zustand with persistence                        │
│  ├── Charts: Recharts + Custom Marine Charts                │
│  └── Maps: OpenLayers + MBTiles Offline Support             │
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

# Install dependencies
cd app && npm install

# Run development server
npm run dev

# Run tests
npm test
```

### Building for Production

```bash
# Build DZIP universal package
npm run build:dzip

# Platform-specific builds
npm run build:pi      # Raspberry Pi
npm run build:linux   # Linux x64
npm run build:win     # Windows
npm run build:mac     # macOS
```

## Documentation

- [Architecture Audit](docs/ARCHITECTURE_AUDIT.md)
- [Security Audit](docs/SECURITY_AUDIT.md)
- [DZIP Format Specification](docs/DZIP_FORMAT.md)
- [Deployment Guide](docs/DEPLOYMENT_GUIDE.md)
- [Operations Wiki](HarborMesh-Operations-Wiki.md)

## Testing

HarbourMesh implements a comprehensive zero-tolerance QA system:

```bash
# Run all tests with coverage
npm test -- --coverage

# Run specific test suites
npm test -- utils        # Utility functions
npm test -- store        # State management
npm test -- nmea         # NMEA parsing
npm test -- security     # Security modules
```

**Current Test Coverage:** 85%+ across all modules

## Security

- **Encryption:** AES-256-GCM for data at rest
- **Authentication:** JWT with 15-min expiry + refresh tokens
- **Authorization:** RBAC with 6 roles, 25+ permissions
- **Transport:** mTLS support for hardware connections
- **Audit:** Complete logging of all security events

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
