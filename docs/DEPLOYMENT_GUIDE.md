# HarborMesh Deployment Guide
## Step-by-Step Installation for All Platforms

---

## Table of Contents

1. [Raspberry Pi (Boat Node)](#raspberry-pi-boat-node)
2. [Windows Desktop](#windows-desktop)
3. [Linux Desktop/Server](#linux-desktopserver)
4. [macOS](#macos)
5. [Docker Deployment](#docker-deployment)
6. [Kubernetes (Enterprise)](#kubernetes-enterprise)
7. [Troubleshooting](#troubleshooting)

---

## Raspberry Pi (Boat Node)

### Hardware Requirements

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| Raspberry Pi | Pi 4 (4GB) | Pi 5 (8GB) |
| Storage | 32GB SD card | 64GB+ NVMe SSD |
| Power | 5V/3A USB-C | 5V/5A with UPS HAT |
| Peripherals | USB serial | NMEA 2000 HAT |

### Installation Steps

```bash
# 1. Download DZIP package
wget https://releases.harbormesh.io/v2.1.0/harbormesh-v2.1.0-linux-arm64.dzip

# 2. Verify signature
./scripts/verify.sh harbormesh-v2.1.0-linux-arm64.dzip

# 3. Extract and install
mkdir -p ~/harbormesh
cd ~/harbormesh
unzip harbormesh-v2.1.0-linux-arm64.dzip

# 4. Run installer
sudo ./install.sh --mode boat-node \
  --storage /data/harbormesh \
  --nmea /dev/ttyUSB0 \
  --network host

# 5. Enable auto-start
sudo systemctl enable harbormesh
sudo systemctl start harbormesh

# 6. Verify installation
./health-check.sh
```

### NMEA 0183 Connection

```bash
# For RS-422 USB adapter
./install.sh --nmea /dev/ttyUSB0 --baud 38400

# For NMEA 2000 (PiCAN2 HAT)
./install.sh --can can0 --bitrate 250000
```

### GPS Configuration

```bash
# Configure GPS (ublox NEO-M9N)
./configure-gps.sh --port /dev/ttyACM0 --constellation GPS,GLONASS,Galileo
```

### Performance Tuning

```bash
# Enable GPU memory split
echo "gpu_mem=256" | sudo tee -a /boot/config.txt

# Increase USB buffer
echo "dtoverlay=usbtxbuf" | sudo tee -a /boot/config.txt

# Optimize for headless operation
./optimize-pi.sh --headless
```

---

## Windows Desktop

### System Requirements

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| OS | Windows 10 64-bit | Windows 11 |
| RAM | 4 GB | 8 GB |
| Storage | 10 GB free | 50 GB SSD |
| .NET | .NET 8 Runtime | .NET 8 SDK |

### Installation Steps

```powershell
# 1. Download installer
Invoke-WebRequest -Uri "https://releases.harbormesh.io/v2.1.0/harbormesh-v2.1.0-win-x64.dzip" -OutFile "$env:TEMP\harbormesh.dzip"

# 2. Extract (requires 7-Zip or PowerShell 5+)
Expand-Archive -Path "$env:TEMP\harbormesh.dzip" -DestinationPath "$env:ProgramFiles\HarborMesh"

# 3. Run installer as Administrator
cd "$env:ProgramFiles\HarborMesh"
.\install.bat

# 4. Allow through firewall
New-NetFirewallRule -DisplayName "HarborMesh" -Direction Inbound -Protocol TCP -LocalPort 3001 -Action Allow

# 5. Start service
Start-Service HarborMesh

# 6. Open application
Start-Process "http://localhost:3001"
```

### Windows Defender Exclusion

```powershell
# Add exclusion for HarborMesh data folder
Add-MpPreference -ExclusionPath "$env:LOCALAPPDATA\HarborMesh"
Add-MpPreference -ExclusionPath "$env:APPDATA\HarborMesh"
```

### Touch Screen Optimization

```powershell
# Enable tablet mode
Set-ItemProperty -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\ImmersiveShell" -Name "TabletMode" -Value 1
```

---

## Linux Desktop/Server

### Supported Distributions

| Distribution | Version | Support |
|--------------|---------|---------|
| Ubuntu | 22.04+ | ✓ Official |
| Debian | 12+ | ✓ Official |
| Fedora | 39+ | ✓ Official |
| Arch | Rolling | ✓ Community |
| Raspberry Pi OS | 12+ | ✓ Official |

### Installation Steps

```bash
# 1. Download package
wget https://releases.harbormesh.io/v2.1.0/harbormesh-v2.1.0-linux-x64.dzip

# 2. Verify signature
./verify.sh harbormesh-v2.1.0-linux-x64.dzip

# 3. Extract
unzip harbormesh-v2.1.0-linux-x64.dzip -d /opt/harbormesh

# 4. Install (requires sudo)
cd /opt/harbormesh
sudo ./install.sh --mode desktop --user $USER

# 5. Start service
systemctl --user enable harbormesh
systemctl --user start harbormesh

# 6. Access application
xdg-open http://localhost:3001
```

### AppImage (Alternative)

```bash
# Download AppImage
wget https://releases.harbormesh.io/v2.1.0/harbormesh-v2.1.0-x86_64.AppImage

# Make executable
chmod +x harbormesh-v2.1.0-x86_64.AppImage

# Run
./harbormesh-v2.1.0-x86_64.AppImage
```

### Debian/Ubuntu (.deb)

```bash
# Install via dpkg
wget https://releases.harbormesh.io/v2.1.0/harbormesh_2.1.0_amd64.deb
sudo dpkg -i harbormesh_2.1.0_amd64.deb
sudo apt-get install -f  # Fix dependencies

# Or via apt repository
echo "deb https://releases.harbormesh.io/deb stable main" | \
  sudo tee /etc/apt/sources.list.d/harbormesh.list
curl -fsSL https://releases.harbormesh.io/key.gpg | gpg --dearmor | \
  sudo tee /etc/apt/trusted.gpg.d/harbormesh.gpg
sudo apt update && sudo apt install harbormesh
```

---

## macOS

### System Requirements

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| OS | macOS 11 (Big Sur) | macOS 14 (Sonoma) |
| Architecture | Intel x64 | Apple Silicon (M1/M2/M3) |
| RAM | 4 GB | 8 GB |
| Storage | 10 GB | 25 GB SSD |

### Installation Steps

```bash
# 1. Download DMG
curl -L -o ~/Downloads/harbormesh.dmg \
  "https://releases.harbormesh.io/v2.1.0/harbormesh-v2.1.0-universal.dmg"

# 2. Verify notarization
spctl -a -vv -t install ~/Downloads/harbormesh.dmg

# 3. Mount and install
open ~/Downloads/harbormesh.dmg
# Drag HarborMesh to Applications folder

# 4. First launch (bypass Gatekeeper)
xattr -cr /Applications/HarborMesh.app
open /Applications/HarborMesh.app

# 5. Grant permissions
# - Accessibility (for keyboard shortcuts)
# - Files and Folders (for data storage)
# - Network (for telemetry)
```

### Homebrew Installation

```bash
# Tap and install
brew tap harbormesh/tap
brew install harbormesh

# Start service
brew services start harbormesh

# Open application
open "harbormesh://"
```

---

## Docker Deployment

### Quick Start

```bash
# 1. Create data directory
mkdir -p ~/harbormesh/data

# 2. Create docker-compose.yml
cat > docker-compose.yml << 'EOF'
version: '3.8'

services:
  backend:
    image: harbormesh/backend:v2.1.0
    ports:
      - "3001:3001"
    volumes:
      - ./data:/data
      - ./models:/models
    environment:
      - DATABASE_PATH=/data/harbormesh.db
      - MODELS_PATH=/models
      - AI_ENABLED=true
    restart: unless-stopped

  frontend:
    image: harbormesh/frontend:v2.1.0
    ports:
      - "80:80"
    depends_on:
      - backend
    restart: unless-stopped

  ai:
    image: harbormesh/ai:v2.1.0
    ports:
      - "11434:11434"
    volumes:
      - ./models:/models
    environment:
      - OLLAMA_MODELS=/models
    restart: unless-stopped

volumes:
  data:
  models:
EOF

# 3. Start services
docker compose up -d

# 4. Verify
docker compose ps
curl http://localhost:3001/health
```

### Raspberry Pi (ARM64)

```bash
# Use ARM64 images
docker compose -f docker-compose.yml -f docker-compose.arm64.yml up -d
```

### Production Deployment

```bash
# With Traefik reverse proxy
docker compose -f docker-compose.yml -f docker-compose.production.yml up -d
```

---

## Kubernetes (Enterprise)

### Helm Installation

```bash
# Add Helm repository
helm repo add harbormesh https://charts.harbormesh.io
helm repo update

# Install with custom values
helm install harbormesh harbormesh/harbormesh \
  --namespace harbormesh \
  --create-namespace \
  --values values.yaml
```

### values.yaml

```yaml
replicaCount: 3

image:
  repository: harbormesh/backend
  tag: v2.1.0
  pullPolicy: IfNotPresent

ingress:
  enabled: true
  className: nginx
  hosts:
    - harbormesh.example.com
  tls:
    - secretName: harbormesh-tls
      hosts:
        - harbormesh.example.com

resources:
  requests:
    memory: "512Mi"
    cpu: "250m"
  limits:
    memory: "2Gi"
    cpu: "2000m"

persistence:
  enabled: true
  storageClass: fast-ssd
  size: 100Gi

ai:
  enabled: true
  gpu:
    enabled: true
    type: nvidia
    count: 1
```

### RBAC Configuration

```yaml
# rbac.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: harbormesh
rules:
  - apiGroups: [""]
    resources: ["pods", "services", "configmaps"]
    verbs: ["get", "list", "watch"]
  - apiGroups: ["apps"]
    resources: ["deployments", "statefulsets"]
    verbs: ["get", "list", "watch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: harbormesh
subjects:
  - kind: ServiceAccount
    name: harbormesh
    namespace: harbormesh
roleRef:
  kind: ClusterRole
  name: harbormesh
  apiGroup: rbac.authorization.k8s.io
```

---

## Troubleshooting

### Common Issues

#### Port Already in Use

```bash
# Check what's using port 3001
sudo lsof -i :3001

# Kill the process
sudo kill $(sudo lsof -t -i :3001)

# Or change port
export HARBORMESH_PORT=3002
```

#### Permission Denied

```bash
# Fix permissions
sudo chown -R $USER:$USER ~/harbormesh

# For serial devices
sudo usermod -aG dialout $USER
```

#### Database Locked

```bash
# Check for running instances
ps aux | grep harbormesh

# Kill stuck processes
pkill -f harbormesh

# Remove lock file
rm ~/.local/share/harbormesh/*.lock
```

#### NMEA Not Working

```bash
# List serial devices
ls -la /dev/tty*

# Check permissions
ls -la /dev/ttyUSB0

# Configure baud rate
./configure-nmea.sh --port /dev/ttyUSB0 --baud 38400

# Test connection
minicom -D /dev/ttyUSB0 -b 38400
```

#### AI Model Not Loading

```bash
# Check model files
ls -la ~/.local/share/harbormesh/models/

# Download models manually
./scripts/download-models.sh

# Check GPU availability
nvidia-smi  # NVIDIA
metal-info  # Apple Silicon
```

### Health Check Commands

```bash
# System health
./health-check.sh --full

# API health
curl http://localhost:3001/health

# Database integrity
sqlite3 ~/.local/share/harbormesh/harbormesh.db "PRAGMA integrity_check"

# Memory usage
ps aux | grep harbormesh

# Disk space
df -h ~/.local/share/harbormesh/
```

### Log Locations

| Platform | Log Location |
|----------|-------------|
| Linux | `/var/log/harbormesh/` |
| macOS | `~/Library/Logs/HarborMesh/` |
| Windows | `%APPDATA%\HarborMesh\Logs` |
| Docker | `docker logs harbormesh-backend-1` |

### Support

- **Documentation**: https://docs.harbormesh.io
- **Issue Tracker**: https://github.com/harbormesh/harbormesh/issues
- **Discord**: https://discord.gg/harbormesh
- **Email**: support@harbormesh.io

---

*Document Version: 1.0.0*
*Last Updated: 2026-02-03*
