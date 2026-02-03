# HarborMesh DZIP Format Specification
## Universal Distribution Package Format

---

## Overview

The **DockZip** (`.dzip`) format is a self-contained, signed archive designed for distributing HarborMesh across multiple platforms (Raspberry Pi, Windows, Linux, macOS) with all dependencies included.

## File Structure

```
harbormesh-v2.1.0.dzip
├── manifest.json              # Version, platform, checksums
├── signature.pem              # Code signing certificate
├── docker/                    # Container definitions
│   ├── docker-compose.yml     # Multi-service orchestration
│   ├── Dockerfile.backend     # Node/Python API
│   ├── Dockerfile.frontend    # React build
│   └── Dockerfile.ai          # Ollama + models
├── binaries/
│   ├── linux-arm64/           # Pi binaries
│   │   ├── harbormesh
│   │   ├── libnmea.so
│   │   └── libcrypto.so
│   ├── linux-x64/
│   │   ├── harbormesh
│   │   ├── libnmea.so
│   │   └── libcrypto.so
│   ├── win-x64/
│   │   ├── harbormesh.exe
│   │   ├── nmea.dll
│   │   └── crypto.dll
│   ├── darwin-x64/
│   │   └── harbormesh
│   └── darwin-arm64/
│       └── harbormesh
├── assets/
│   ├── models/                # Quantized LLMs (7B, 13B)
│   │   ├── llama3-7b-q4.gguf
│   │   ├── nomic-embed-text.gguf
│   │   └── README.md
│   ├── embeddings/
│   │   └── vessel-index.bin
│   ├── charts/                # Sample MBTiles
│   │   └── world-raster.mbtiles
│   └── docs/                  # Offline wiki PDF
│       └── user-manual.pdf
├── scripts/
│   ├── install.sh             # Unix installer
│   ├── install.bat            # Windows installer
│   ├── backup.sh              # Data export
│   ├── health-check.sh        # Diagnostics
│   └── update.sh              # OTA update script
└── config/
    ├── default.yml            # Sensible defaults
    ├── schemas/               # JSON Schema validation
    │   ├── vessel.schema.json
    │   ├── document.schema.json
    │   └── telemetry.schema.json
    └── locales/               # i18n files
        ├── en.json
        ├── fr.json
        └── es.json
```

## Manifest Schema

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "version": {
      "type": "string",
      "pattern": "^\\d+\\.\\d+\\.\\d+$"
    },
    "buildNumber": {
      "type": "integer"
    },
    "releaseDate": {
      "type": "string",
      "format": "date-time"
    },
    "platform": {
      "type": "string",
      "enum": ["linux-arm64", "linux-x64", "win-x64", "darwin-x64", "darwin-arm64", "universal"]
    },
    "architecture": {
      "type": "string",
      "enum": ["arm64", "x64", "universal"]
    },
    "checksums": {
      "type": "object",
      "additionalProperties": {
        "type": "string"
      }
    },
    "size": {
      "type": "integer"
    },
    "dependencies": {
      "type": "object",
      "properties": {
        "node": {
          "type": "string"
        },
        "python": {
          "type": "string"
        },
        "ollama": {
          "type": "string"
        }
      }
    },
    "features": {
      "type": "object",
      "properties": {
        "aiEnabled": {
          "type": "boolean"
        },
        "offlineMode": {
          "type": "boolean"
        },
        "hardwareIntegration": {
          "type": "boolean"
        }
      }
    },
    "signature": {
      "type": "object",
      "properties": {
        "algorithm": {
          "type": "string"
        },
        "fingerprint": {
          "type": "string"
        },
        "timestamp": {
          "type": "string",
          "format": "date-time"
        }
      }
    }
  },
  "required": ["version", "platform", "checksums", "size"]
}
```

## Installation Modes

### 1. Boat Node Mode (Full Stack)
```bash
# Docker Compose deployment
./install.sh --mode boat-node --storage /data/harbormesh
```

### 2. Desktop Client Mode
```bash
# GUI + local backend (Tauri embedded)
./install.sh --mode desktop --install-dir ~/.local/share/harbormesh
```

### 3. Cloud Relay Mode
```bash
# Telemetry forwarder only
./install.sh --mode relay --endpoint wss://cloud.harbormesh.io
```

### 4. Enterprise Server Mode
```bash
# Kubernetes deployment
./install.sh --mode enterprise --namespace harbormesh
```

## Signature Verification

```bash
# Verify package integrity
./scripts/verify.sh harbormesh-v2.1.0.dzip

# Output example:
# ✓ Manifest verified
# ✓ Signature valid (RSA-4096)
# ✓ SHA-256 checksums verified
# ✓ BLAKE3 checksums verified
# ✓ All files validated
```

## Build Process

### Prerequisites
- Docker 24+
- Node.js 20+
- Rust 1.75+
- Go 1.21+ (for cross-compilation)

### Build Commands
```bash
# Build all platforms
make build-all

# Build specific platform
make build-linux-arm64
make build-win-x64
make build-darwin-arm64

# Create DZIP package
make package VERSION=2.1.0
```

### CI/CD Pipeline
```yaml
# .github/workflows/build.yml
name: Build & Package

on:
  push:
    branches: [main]
  release:
    types: [created]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run linters
        run: npm run lint && cargo clippy

  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run tests
        run: npm test -- --coverage

  build:
    strategy:
      matrix:
        platform: [linux-arm64, linux-x64, win-x64, darwin-x64, darwin-arm64]
    runs-on: ${{ matrix.platform == 'darwin-x64' && 'macos-latest' || 
              matrix.platform == 'darwin-arm64' && 'macos-latest' ||
              'ubuntu-latest' }}
    steps:
      - uses: actions/checkout@v4
      - name: Build for ${{ matrix.platform }}
        run: make build-${{ matrix.platform }}

  package:
    needs: [lint, test, build]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Create DZIP
        run: make package VERSION=${{ github.event.release.tag_name }}
      - name: Sign package
        run: ./scripts/sign.sh
      - name: Upload to release
        uses: softprops/action-gh-release@v2
        with:
          files: harbormesh-*.dzip
```

## File Size Targets

| Platform | Binary Size | Total Package Size | Compressed Size |
|----------|-------------|-------------------|-----------------|
| Linux ARM64 | ~50 MB | ~2.5 GB | ~800 MB |
| Linux x64 | ~55 MB | ~2.5 GB | ~800 MB |
| Windows x64 | ~60 MB | ~2.6 GB | ~850 MB |
| macOS x64 | ~55 MB | ~2.5 GB | ~800 MB |
| macOS ARM64 | ~50 MB | ~2.5 GB | ~800 MB |

## Compression Strategy

- **Models**: LZMA2 (7-zip) for maximum compression
- **Binaries**: Zstandard (zstd) for fast decompression
- **Documents**: Gzip for text files
- **Charts**: Already compressed MBTiles format

## Security Features

1. **Code Signing**: RSA-4096 signatures
2. **Checksum Verification**: SHA-256 + BLAKE3
3. **Tamper Detection**: Manifest signature
4. **Secure Boot**: UEFI/secure boot support on Linux

## Versioning Scheme

```
MAJOR.MINOR.PATCH[-BUILD_TYPE]

Examples:
- 2.1.0        - Stable release
- 2.1.0-beta.1 - Beta release
- 2.1.0-rc.2   - Release candidate
- 2.1.0-nightly - Nightly build
```

## Changelog Format

```markdown
# Changelog

## [2.1.0] - 2026-02-03

### Added
- AI companion with local LLM support
- Offline chart rendering with MBTiles
- NMEA 0183/2000 hardware integration

### Changed
- Updated to React 19
- Improved performance on Raspberry Pi 5

### Fixed
- Security vulnerability in JWT handling
- Memory leak in WebSocket connection

### Security
- AES-256-GCM encryption for documents
- RBAC with 25+ permissions
```

---

*Document Version: 1.0.0*
*Last Updated: 2026-02-03*
