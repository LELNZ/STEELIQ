# LABEL PRINTER REQUIREMENTS FOR REMNANT MANAGEMENT
## Lateral Engineering Steel Fabrication

**Date:** July 22, 2025  
**Purpose:** QR/Barcode labeling for steel remnants in harsh workshop environments

---

## 🏭 RECOMMENDED INDUSTRIAL LABEL PRINTERS

### 1. **ZEBRA ZT610 Industrial Printer** (PRIMARY RECOMMENDATION)
**Price:** $3,500 - $4,500 NZD

#### Key Features:
- **Print Width:** 4" (ideal for detailed QR codes)
- **Resolution:** 203/300/600 dpi options
- **Durability:** All-metal construction, IP54 rated
- **Print Speed:** Up to 14 ips (356 mm/s)
- **Connectivity:** Ethernet, USB, Serial, Bluetooth
- **Label Types:** Thermal transfer for permanent labels

#### Why This Model:
- Handles high-volume printing (10,000+ labels/day)
- Metal construction survives workshop dust/debris
- Clear QR codes even at small sizes
- Network connectivity for multiple workstations

### 2. **BRADY BBP35 Multicolor Sign & Label Printer** (ALTERNATIVE)
**Price:** $2,800 - $3,500 NZD

#### Key Features:
- **Print Width:** Up to 4.33"
- **Special:** Prints on metal/polyester labels
- **Durability:** Desktop industrial design
- **Software:** Brady Workstation included
- **Label Materials:** 600+ material options

#### Why This Model:
- Specialized for harsh environments
- Labels resist chemicals, heat, abrasion
- Good for both remnants and safety signage
- Lower volume but higher durability labels

### 3. **TSC TTP-2410MT Series** (BUDGET OPTION)
**Price:** $1,800 - $2,500 NZD

#### Key Features:
- **Print Width:** 4.25"
- **Resolution:** 203/300 dpi
- **Speed:** 14 ips
- **Construction:** Industrial grade
- **Memory:** 256MB Flash, 256MB DRAM

#### Why This Model:
- Cost-effective for smaller operations
- Still industrial-grade quality
- Good QR code clarity
- Reliable for medium volumes

---

## 📋 LABEL SPECIFICATIONS

### Recommended Label Material:
**3M Durable Polyester Labels (Silver/White)**
- Temperature Range: -40°C to +150°C
- Chemical resistant
- UV stable for outdoor storage
- Strong adhesive for rough steel surfaces
- Size: 50mm x 100mm (minimum for QR + text)

### Alternative for Extreme Conditions:
**Brady B-499 Nylon Cloth Labels**
- Conformable to curved surfaces
- Withstands cutting fluids/oils
- Tear-resistant
- Self-laminating options available

---

## 🔧 INTEGRATION REQUIREMENTS

### Software Integration:
1. **Network Printing Protocol**
   - IPP (Internet Printing Protocol)
   - LPD/LPR for older systems
   - Direct TCP/IP socket printing

2. **Driver Requirements**
   - CUPS drivers for Linux
   - ZPL II command language (Zebra)
   - EPL compatibility

3. **API Integration**
   - REST API for label generation
   - Queue management system
   - Status monitoring

### Physical Setup:
1. **Workshop Placement**
   - Near cutting station exit
   - Enclosed cabinet (dust protection)
   - Network cable run (avoid WiFi interference)
   - UPS backup recommended

2. **Multiple Locations**
   - Main cutting area
   - Remnant storage area
   - Mobile cart option for flexibility

---

## 💰 TOTAL BUDGET ESTIMATE

### Option A: Premium Setup (Recommended)
- Zebra ZT610 printer: $4,000
- Spare printheads (2): $600
- Label stock (50,000): $800
- Protective enclosure: $500
- Installation/training: $400
**Total: $6,300 NZD**

### Option B: Standard Setup
- TSC TTP-2410MT: $2,200
- Label stock (25,000): $400
- Basic enclosure: $300
- Setup: $200
**Total: $3,100 NZD**

### Annual Consumables:
- Labels (100,000/year): $1,600
- Ribbons: $400
- Maintenance: $300
**Annual: $2,300 NZD**

---

## 🚀 IMPLEMENTATION STEPS

### Phase 1: Basic Integration (1 day)
1. Install printer drivers on server
2. Configure network printing
3. Test QR code generation
4. Basic label template

### Phase 2: Advanced Features (1 day)
1. Queue management system
2. Reprint functionality
3. Label design templates
4. Batch printing

### Phase 3: Mobile Integration (1 day)
1. Mobile print triggers
2. Bluetooth backup printing
3. Offline label caching

---

## ✅ RECOMMENDED IMMEDIATE ACTION

1. **Order Zebra ZT610** with protective enclosure
2. **Order 3M polyester labels** (50mm x 100mm)
3. **Schedule network setup** for printer location
4. **Prepare label templates** with:
   - QR code (30mm x 30mm minimum)
   - Material code
   - Dimensions
   - Location
   - Date
   - Mill certificate reference

The Zebra ZT610 is the industry standard for steel fabrication environments and will provide reliable, high-quality labels that survive harsh workshop conditions.