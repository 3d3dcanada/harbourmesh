# HarborMesh Operations Wiki

## The AI-Powered Boating Ecosystem Platform

---

## Table of Contents

1. [Overview](#overview)
2. [System Architecture](#system-architecture)
3. [Quick Start Guide](#quick-start-guide)
4. [Core Features](#core-features)
5. [Deployment Options](#deployment-options)
6. [API Reference](#api-reference)
7. [Troubleshooting](#troubleshooting)
8. [Security & Privacy](#security--privacy)
9. [Enterprise Fleet Operations](#enterprise-fleet-operations)
10. [Raspberry Pi Integration](#raspberry-pi-integration)

---

## Overview

HarborMesh is a comprehensive AI-powered boating ecosystem platform designed to serve vessels ranging from single-owner boats to superyachts. The platform operates on three interconnected layers:

### Three-Layer Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    AI & TRAINING LAYER                          │
│         (Cloud AI, Community Intelligence, Model Training)      │
├─────────────────────────────────────────────────────────────────┤
│                  CLOUD & COMMUNITY NETWORK                      │
│    (Sync, Weather, Charts, Community Telemetry, Social)         │
├─────────────────────────────────────────────────────────────────┤
│                   LOCAL VESSEL SYSTEM                           │
│  (Digital Twin, Inventory, Documents, Logs, Navigation, AI)    │
└─────────────────────────────────────────────────────────────────┘
```

### Key Capabilities

- **Vessel Digital Twin** - Complete virtual representation of your vessel
- **Inventory & Boat Store** - Smart inventory management with location tracking
- **Documents & Identity Vault** - Secure document storage with expiry alerts
- **Logs, Tasks & Sign-offs** - Comprehensive maintenance and voyage tracking
- **Navigation & HUD** - Real-time navigation with AIS integration
- **AI Vessel Companion** - Intelligent assistant for all boating needs
- **Community Telemetry** - Opt-in data sharing for collective intelligence

---

## System Architecture

### Technology Stack

| Component | Technology |
|-----------|------------|
| Frontend | React 18 + TypeScript |
| Build Tool | Vite |
| State Management | Zustand (with persistence) |
| Styling | Tailwind CSS + shadcn/ui |
| Icons | Lucide React |
| Charts | Recharts |
| Maps | Leaflet |

### Data Models

#### Core Entities

```typescript
// Vessel - The central entity
interface Vessel {
  id: string;
  name: string;
  type: VesselType;
  registration: string;
  length: number;
  beam: number;
  draft: number;
  displacement: number;
  yearBuilt: number;
  engines: Engine[];
  tanks: Tank[];
  batteries: Battery[];
  spaces: Space[];
}

// Inventory Item with location tracking
interface InventoryItem {
  id: string;
  name: string;
  category: ItemCategory;
  quantity: number;
  location: string; // Space ID
  expiryDate?: Date;
  reorderPoint: number;
}

// Document with sensitivity levels
interface Document {
  id: string;
  title: string;
  type: DocumentType;
  sensitivity: 'public' | 'crew' | 'private';
  expiryDate?: Date;
  fileUrl: string;
}

// Task with approval workflow
interface Task {
  id: string;
  title: string;
  type: TaskType;
  status: TaskStatus;
  assignedTo?: string;
  requiresApproval: boolean;
  approvedBy?: string;
  approvedAt?: Date;
}
```

### State Management

HarborMesh uses Zustand for state management with the following stores:

- **AppStore** - UI state, theme, notifications
- **VesselStore** - Vessel data, engines, tanks, spaces
- **DocumentStore** - Documents with search and filtering
- **LogTaskStore** - Logs and tasks with CRUD operations
- **TelemetryStore** - Real-time vessel telemetry data
- **AIStore** - AI chat history and context
- **SettingsStore** - User preferences, AI providers, privacy settings
- **OnboardingStore** - Onboarding flow state

---

## Quick Start Guide

### First-Time Setup

1. **Access the Application**
   - Navigate to the deployed URL or run locally
   - The onboarding wizard will guide you through initial setup

2. **Create Your Vessel Profile**
   - Enter vessel name, type, and registration
   - Add dimensions (length, beam, draft)
   - Configure engines and tanks

3. **Set Up Your Boat Map**
   - Define spaces (cabins, engine room, galley, etc.)
   - Upload deck plans or diagrams
   - Organize by deck/level

4. **Add Initial Inventory**
   - Import existing inventory or add manually
   - Set reorder points for critical items
   - Assign locations using the boat map

5. **Upload Documents**
   - Registration and insurance documents
   - Manuals and certificates
   - Set sensitivity levels and expiry dates

6. **Configure AI Companion**
   - Choose AI provider (OpenAI, Anthropic, or Local)
   - Set API keys (stored locally)
   - Customize personality and expertise

7. **Set Privacy Preferences**
   - Choose data sharing level
   - Configure community telemetry options
   - Set vessel visibility

### Daily Operations

#### Dashboard Overview

The Dashboard provides at-a-glance information:

- **Vessel Status** - Current location, speed, heading
- **Active Alerts** - Maintenance reminders, document expiries
- **Quick Actions** - Common tasks and navigation
- **Recent Activity** - Latest logs and updates
- **Pending Tasks** - Tasks requiring attention

#### Navigation Workflow

1. Open Navigation section
2. View real-time compass and gauges
3. Monitor AIS targets in vicinity
4. Check weather overlay
5. Access route planning tools

#### Maintenance Workflow

1. Create task in Logs & Tasks section
2. Assign to crew member
3. Set due date and priority
4. Mark complete when finished
5. Request approval if required

---

## Core Features

### 1. Vessel Digital Twin

The Digital Twin is a complete virtual representation of your vessel including:

#### Vessel Details
- Basic specifications (name, type, registration)
- Dimensions and displacement
- Year built and builder information
- Custom fields for additional data

#### Engine Management
```typescript
interface Engine {
  id: string;
  name: string;
  type: 'main' | 'auxiliary' | 'generator';
  fuelType: string;
  power: number; // kW
  hours: number;
  lastService: Date;
  nextService: Date;
}
```

Track engine hours, service intervals, and maintenance history.

#### Tank Monitoring
```typescript
interface Tank {
  id: string;
  name: string;
  type: 'fuel' | 'water' | 'waste' | 'lpg' | 'other';
  capacity: number; // liters
  currentLevel: number; // percentage
  lastRefilled: Date;
}
```

Monitor fuel, water, waste, and other tank levels with consumption tracking.

#### Battery Systems
```typescript
interface Battery {
  id: string;
  name: string;
  type: string;
  capacity: number; // Ah
  voltage: number;
  chargeLevel: number; // percentage
  health: number; // percentage
  cycles: number;
  installedDate: Date;
}
```

Track battery health, charge cycles, and replacement schedules.

### 2. Inventory & Boat Store

#### Smart Inventory Management

- **Location Tracking** - Know exactly where every item is stored
- **Expiry Alerts** - Get notified before items expire
- **Reorder Points** - Automatic low-stock warnings
- **Category Organization** - Group by type (safety, maintenance, provisions, etc.)

#### Item Categories

| Category | Description | Examples |
|----------|-------------|----------|
| SAFETY | Safety equipment | Life jackets, flares, first aid |
| MAINTENANCE | Maintenance supplies | Oil, filters, spare parts |
| PROVISIONS | Food and supplies | Food, water, toiletries |
| ELECTRICAL | Electrical items | Fuses, bulbs, batteries |
| NAVIGATION | Navigation equipment | Charts, GPS accessories |
| DOCUMENTS | Paper documents | Manuals, certificates |
| OTHER | Miscellaneous | Tools, cleaning supplies |

#### Boat Map Integration

Visual inventory placement on deck plans:
- Click any space to see its contents
- Drag-and-drop item assignment
- Color-coded by category
- Search and filter capabilities

### 3. Documents & Identity Vault

#### Document Types

| Type | Description | Sensitivity |
|------|-------------|-------------|
| REGISTRATION | Vessel registration | Private |
| INSURANCE | Insurance policies | Private |
| CERTIFICATION | Safety certificates | Crew |
| MANUAL | Equipment manuals | Public |
| RECEIPT | Purchase receipts | Private |
| WARRANTY | Warranty documents | Private |
| LICENSE | Licenses and permits | Private |
| OTHER | Miscellaneous | Varies |

#### Sensitivity Levels

- **Public** - Accessible to all crew
- **Crew** - Accessible to crew members only
- **Private** - Owner/captain only

#### Expiry Tracking

Automatic alerts for:
- Registration renewals
- Insurance expirations
- Certificate renewals
- License expirations
- Warranty expirations

### 4. Logs, Tasks & Sign-offs

#### Log Entry Types

| Type | Description |
|------|-------------|
| VOYAGE | Voyage/journey log |
| ENGINE | Engine operation log |
| MAINTENANCE | Maintenance activity |
| INCIDENT | Incident report |
| WEATHER | Weather observation |
| INVENTORY | Inventory change |
| OTHER | Other log entry |

#### Task Management

```typescript
interface Task {
  id: string;
  title: string;
  description?: string;
  type: TaskType;
  status: TaskStatus;
  priority: 'low' | 'medium' | 'high' | 'critical';
  dueDate?: Date;
  assignedTo?: string;
  requiresApproval: boolean;
  approvedBy?: string;
  approvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
```

#### Task Types

- **MAINTENANCE** - Scheduled maintenance
- **INSPECTION** - Safety inspections
- **REPAIR** - Repairs and fixes
- **CLEANING** - Cleaning tasks
- **PROVISIONING** - Restocking supplies
- **ADMIN** - Administrative tasks
- **OTHER** - Miscellaneous

#### Approval Workflow

1. Task created and assigned
2. Assignee completes task
3. If approval required, submitted for review
4. Approver reviews and approves/rejects
5. Task marked complete with audit trail

### 5. Navigation & HUD

#### Real-Time Display

- **Compass** - Current heading with cardinal directions
- **Speed** - Speed over ground (knots)
- **Depth** - Water depth (meters/feet)
- **Wind** - Wind speed and direction
- **Position** - GPS coordinates

#### AIS Integration

Display nearby vessels with:
- Vessel name and type
- Position and heading
- Speed and course
- Closest point of approach (CPA)

#### Weather Overlay

- Current conditions
- Forecast along route
- Wind patterns
- Precipitation radar
- Sea state information

### 6. AI Vessel Companion

#### Capabilities

The AI Companion provides intelligent assistance for:

- **Technical Questions** - "How do I change the fuel filter?"
- **Navigation Advice** - "What's the best route to Martha's Vineyard?"
- **Weather Analysis** - "Should I expect rough seas tomorrow?"
- **Maintenance Guidance** - "When is my next engine service due?"
- **Procedural Help** - "What's the anchoring procedure?"
- **General Knowledge** - "Explain the COLREGS rule 9"

#### AI Providers

| Provider | Type | Requirements |
|----------|------|--------------|
| OpenAI | Cloud | API key |
| Anthropic | Cloud | API key |
| Local | On-device | Ollama or similar |

#### Context Awareness

The AI has access to:
- Vessel specifications
- Current telemetry data
- Maintenance history
- Document contents (if permitted)
- Weather data
- Navigation context

#### Quick Actions

Pre-configured prompts for common queries:
- "Check my maintenance schedule"
- "What's my current fuel range?"
- "Analyze my battery health"
- "Weather forecast for my location"
- "Find my insurance documents"

### 7. Community Telemetry Network

#### Opt-In Data Sharing

HarborMesh enables anonymous data sharing to benefit the boating community:

```typescript
interface ConsentSettings {
  sharePosition: SharePositionLevel;
  shareWeather: boolean;
  shareDepth: boolean;
  shareSeaState: boolean;
  shareAnonymized: boolean;
}
```

#### Sharing Levels

| Level | Description |
|-------|-------------|
| NONE | No position sharing |
| APPROXIMATE | 1km radius approximation |
| EXACT | Precise GPS coordinates |

#### Community Features

- **Vessel Positions** - See nearby boats (if they opt-in)
- **Conditions Reports** - Real-time weather and sea state
- **Depth Soundings** - Crowd-sourced bathymetry
- **Hazard Alerts** - Community-reported hazards

#### Privacy Protection

- All sharing is opt-in
- Granular control over what is shared
- Anonymization options
- No personal data exposed
- GDPR compliant

---

## Deployment Options

### Option 1: Cloud Deployment

Deploy to any static hosting service:

```bash
# Build for production
npm run build

# Deploy dist/ folder to:
# - Netlify
# - Vercel
# - GitHub Pages
# - AWS S3
# - Any static host
```

### Option 2: Raspberry Pi Local Server

Run HarborMesh locally on a Raspberry Pi:

```bash
# Install Node.js on Raspberry Pi
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Clone and setup
git clone <repository>
cd harbormesh
npm install

# Build
npm run build

# Serve with any static server
npm install -g serve
serve -s dist -l 3000

# Or use nginx
sudo apt-get install nginx
sudo cp -r dist/* /var/www/html/
```

### Option 3: Docker Deployment

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
```

### Option 4: Offline-First PWA

HarborMesh supports offline operation:

- All data stored locally (IndexedDB)
- Service worker for offline access
- Sync when connection available
- Works without internet

---

## API Reference

### Telemetry WebSocket API

Connect to real-time telemetry stream:

```javascript
const ws = new WebSocket('ws://your-server/telemetry');

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  // Handle telemetry update
};
```

#### Message Types

| Type | Description |
|------|-------------|
| TELEMETRY | Sensor data update |
| ALERT | System alert |
| COMMAND | Control command |
| SYNC | Data synchronization |

#### Telemetry Data Format

```typescript
interface TelemetryData {
  timestamp: number;
  position: {
    latitude: number;
    longitude: number;
    accuracy: number;
  };
  speed: number; // knots
  heading: number; // degrees
  depth: number; // meters
  wind: {
    speed: number;
    direction: number;
  };
  engines: EngineTelemetry[];
  tanks: TankTelemetry[];
  batteries: BatteryTelemetry[];
  environment: {
    temperature: number;
    pressure: number;
    humidity: number;
  };
}
```

### REST API Endpoints

#### Vessel Operations

```
GET    /api/vessel              # Get vessel details
PUT    /api/vessel              # Update vessel
GET    /api/vessel/engines      # List engines
POST   /api/vessel/engines      # Add engine
PUT    /api/vessel/engines/:id  # Update engine
DELETE /api/vessel/engines/:id  # Remove engine
```

#### Inventory Operations

```
GET    /api/inventory           # List all items
POST   /api/inventory           # Create item
GET    /api/inventory/:id       # Get item details
PUT    /api/inventory/:id       # Update item
DELETE /api/inventory/:id       # Delete item
GET    /api/inventory/search?q= # Search items
```

#### Document Operations

```
GET    /api/documents           # List documents
POST   /api/documents           # Upload document
GET    /api/documents/:id       # Get document
PUT    /api/documents/:id       # Update metadata
DELETE /api/documents/:id       # Delete document
```

#### Task Operations

```
GET    /api/tasks               # List tasks
POST   /api/tasks               # Create task
GET    /api/tasks/:id           # Get task
PUT    /api/tasks/:id           # Update task
DELETE /api/tasks/:id           # Delete task
POST   /api/tasks/:id/complete  # Mark complete
POST   /api/tasks/:id/approve   # Approve task
```

---

## Troubleshooting

### Common Issues

#### Application Won't Load

**Symptom:** Blank page or loading error

**Solutions:**
1. Check browser console for errors
2. Verify all files are built correctly
3. Clear browser cache
4. Try different browser

#### Data Not Saving

**Symptom:** Changes lost after refresh

**Solutions:**
1. Check browser storage permissions
2. Verify IndexedDB is enabled
3. Check available storage space
4. Export data as backup

#### AI Not Responding

**Symptom:** AI companion shows errors

**Solutions:**
1. Verify API key is set correctly
2. Check internet connection
3. Try different AI provider
4. Check API quota/limits

#### Map Not Displaying

**Symptom:** Navigation map shows blank

**Solutions:**
1. Check internet connection
2. Verify map tile provider
3. Check browser console for errors
4. Try refreshing the page

### Performance Optimization

#### For Raspberry Pi

```bash
# Reduce memory usage
export NODE_OPTIONS="--max-old-space-size=512"

# Use lightweight server
npm install -g http-server
http-server dist -p 3000 --gzip

# Enable swap if needed
sudo dphys-swapfile swapoff
sudo nano /etc/dphys-swapfile
# CONF_SWAPSIZE=1024
sudo dphys-swapfile setup
sudo dphys-swapfile swapon
```

#### For Mobile Devices

- Use PWA mode for better performance
- Enable data saver mode
- Reduce map detail level
- Limit real-time updates

### Debug Mode

Enable debug logging:

```javascript
// In browser console
localStorage.setItem('harbormesh_debug', 'true');
location.reload();
```

---

## Security & Privacy

### Data Security

#### Local Storage

- All data stored locally in browser
- IndexedDB with encryption option
- No cloud dependency required
- Full data ownership

#### API Keys

- Stored in localStorage only
- Never transmitted to our servers
- User controls all API access
- Easy key rotation

#### Document Security

- Sensitivity levels control access
- Optional encryption for sensitive docs
- Audit trail for document access
- Secure deletion

### Privacy Controls

#### Consent Management

Granular controls for:
- Position sharing
- Weather data sharing
- Depth sounding sharing
- Anonymization preferences

#### Data Export

Export all your data anytime:
```
Settings > Privacy > Export Data
```

Formats: JSON, CSV

#### Data Deletion

Complete data removal:
```
Settings > Privacy > Delete All Data
```

### Best Practices

1. **Regular Backups** - Export data periodically
2. **Strong Passwords** - Protect device access
3. **API Key Security** - Rotate keys regularly
4. **Minimal Sharing** - Share only what's needed
5. **Review Permissions** - Audit access regularly

---

## Enterprise Fleet Operations

### Fleet Management Console

For charter operators and fleet managers:

#### Multi-Vessel Dashboard

- Overview of all vessels
- Fleet-wide alerts and notifications
- Comparative analytics
- Maintenance scheduling

#### Vessel Comparison

Compare vessels by:
- Operating hours
- Maintenance costs
- Fuel consumption
- Utilization rates

#### Crew Management

- Multi-vessel crew assignments
- Certification tracking
- Training records
- Performance metrics

#### Reporting

Generate reports for:
- Maintenance history
- Operating costs
- Compliance status
- Utilization analysis

### Integration APIs

Connect with existing systems:

```typescript
// Fleet sync API
interface FleetSyncConfig {
  endpoint: string;
  apiKey: string;
  syncInterval: number;
  vessels: string[];
}

// Charter booking integration
interface BookingIntegration {
  provider: 'custom' | 'bareboat' | 'yachtfolio';
  apiKey: string;
  webhookUrl: string;
}
```

---

## Raspberry Pi Integration

### Hardware Setup

#### Recommended Configuration

| Component | Recommendation |
|-----------|----------------|
| Board | Raspberry Pi 4 (4GB+) |
| Storage | 32GB+ SD Card or SSD |
| Power | 5V 3A USB-C |
| Display | 7" Touchscreen (optional) |
| Network | WiFi or Ethernet |

#### Sensor Integration

Connect vessel sensors via:

**NMEA 0183/2000**
```bash
# Install Signal K
curl -sL https://raw.githubusercontent.com/SignalK/signalk-server/master/raspberry_pi_install.sh | sudo bash -

# Configure HarborMesh to read from Signal K
```

**GPIO Sensors**
```python
# Example: Read tank level
import RPi.GPIO as GPIO
import time

# Setup ultrasonic sensor
GPIO.setmode(GPIO.BCM)
TRIG = 23
ECHO = 24

GPIO.setup(TRIG, GPIO.OUT)
GPIO.setup(ECHO, GPIO.IN)

def read_tank_level():
    # Send pulse
    GPIO.output(TRIG, True)
    time.sleep(0.00001)
    GPIO.output(TRIG, False)
    
    # Measure echo
    while GPIO.input(ECHO) == 0:
        pulse_start = time.time()
    while GPIO.input(ECHO) == 1:
        pulse_end = time.time()
    
    # Calculate distance
    pulse_duration = pulse_end - pulse_start
    distance = pulse_duration * 17150
    
    return distance
```

**I2C Sensors**
```python
# Example: Read environmental data
import smbus2
import bme280

port = 1
address = 0x76
bus = smbus2.SMBus(port)

calibration_params = bme280.load_calibration_params(bus, address)
data = bme280.sample(bus, address, calibration_params)

print(f"Temperature: {data.temperature}")
print(f"Pressure: {data.pressure}")
print(f"Humidity: {data.humidity}")
```

### Autostart Configuration

```bash
# Create systemd service
sudo nano /etc/systemd/system/harbormesh.service
```

```ini
[Unit]
Description=HarborMesh Boat Server
After=network.target

[Service]
Type=simple
User=pi
WorkingDirectory=/home/pi/harbormesh
ExecStart=/usr/bin/serve -s dist -l 3000
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

```bash
# Enable service
sudo systemctl enable harbormesh
sudo systemctl start harbormesh
```

### Kiosk Mode

For dedicated boat displays:

```bash
# Install dependencies
sudo apt-get install xserver-xorg x11-xserver-utils unclutter

# Create autostart
mkdir -p ~/.config/lxsession/LXDE-pi
cat > ~/.config/lxsession/LXDE-pi/autostart << EOF
@xset s off
@xset -dpms
@xset s noblank
@unclutter -idle 0.1 -root
@chromium-browser --kiosk --app=http://localhost:3000
EOF
```

---

## Support & Community

### Getting Help

- **Documentation** - This wiki and inline help
- **GitHub Issues** - Bug reports and feature requests
- **Community Forum** - User discussions and tips
- **Email Support** - enterprise@harbormesh.io

### Contributing

We welcome contributions:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

### Roadmap

**Q1 2025**
- Mobile app (iOS/Android)
- Advanced route planning
- Weather routing
- Integration with major chart providers

**Q2 2025**
- Offline chart support
- Advanced AI capabilities
- Fleet management enhancements
- Third-party integrations

**Q3 2025**
- Predictive maintenance
- Automated logbook
- Enhanced community features
- Multi-language support

---

## License

HarborMesh is released under the MIT License.

Copyright (c) 2025 HarborMesh

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.

---

*HarborMesh - Navigate Smarter, Sail Safer*
