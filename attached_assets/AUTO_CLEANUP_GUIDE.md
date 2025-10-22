# Auto-Cleanup System Guide
## For Future File Management

## How This System Works

Since I cannot automatically sort files upon upload (Replit system limitation), here's a practical workflow for keeping your `attached_assets` organized:

## File Categories & Auto-Detection Rules

### 🔴 Temporary (Archive after 30 days)
**Pattern Recognition:**
- UUID-named files: `*-*-*-*-*_*.png` or `.jpg`
- Screenshots: `image_*.png`, `Screen Shot*.png`
- Error messages: Files uploaded during debugging sessions
- Pasted text: `Pasted*.txt` files

**Purpose:** Troubleshooting, temporary reference

### 🟡 Review Required (Manual decision)
**Pattern Recognition:**
- WhatsApp imports: `IMG-*-WA*.jpg`, `WhatsApp*.jpg`
- Non-UUID numbered files with timestamps
- Files without clear naming patterns

**Purpose:** May contain business info or just conversation context

### 🟢 Permanent (Keep indefinitely)
**Pattern Recognition:**
- Business documents: `Quote*.pdf`, `Invoice*.pdf`, contracts
- Training certificates: Files containing staff names + certifications
- Company assets: Logo files, branding materials
- Steel catalogs and reference materials
- Technical drawings: `.dxf`, `.dwg` files

**Purpose:** Business operations, compliance, reference

## Maintenance Commands

### Weekly/Monthly Cleanup
Just ask: "Clean up attached assets" and I will:

1. **Analyze recent uploads**
```bash
# I'll check files added in last 30 days
find attached_assets -mtime -30 -type f
```

2. **Categorize by patterns**
- Chat screenshots → Archive
- Business docs → Permanent storage
- Logos used in app → Keep in attached_assets

3. **Generate report**
- Files moved
- Space saved
- Items requiring review

### Quick Commands You Can Use

**"Archive old chat files"**
- Moves screenshots and debugging images older than 30 days

**"Show me unorganized files"**
- Lists files in root attached_assets that need sorting

**"What's using the most space?"**
- Analyzes large files that might need compression or removal

## File Naming Best Practices

To help with auto-organization, consider naming files clearly:

### Good Names (Auto-sortable):
- `invoice_2025_10_lateral.pdf` → Business doc
- `training_cert_adam_green.pdf` → Permanent
- `debug_error_login_page.png` → Temporary
- `LEL_logo_primary.png` → Branding asset

### Poor Names (Require manual review):
- `document1.pdf`
- `image.png`
- `file_final_v2.docx`

## Special Considerations

### Files Used in Application
These must stay in `attached_assets/`:
- `LEL Symbol black only.png` (used in topbar)
- `LEL Variations Logo Symbol 01-01_1753176530831.jpg` (used in login)

**Note:** Moving these breaks the app. They're imported via `@assets/` alias.

### Material Images
Now properly organized in `public/images/materials/`:
- Can be referenced in material catalog
- Improves loading performance
- Keeps attached_assets clean

## Automation Limitations

**What I CAN do:**
- Recognize file patterns and purposes
- Move files to organized folders
- Create cleanup reports
- Track space usage

**What I CANNOT do:**
- Change where files initially upload (system limitation)
- Automatically sort files as they arrive
- Delete files without your confirmation

## Recommended Schedule

1. **Daily:** No action needed
2. **Weekly:** Quick review of recent uploads
3. **Monthly:** Full cleanup with "Clean up attached assets"
4. **Quarterly:** Review permanent storage for outdated docs

## Space Management Tips

- **Current achievement:** Reduced from 530MB to 248MB (53% reduction)
- **Archived:** 282MB ready for deletion after review
- **Organized:** 35 business-critical files preserved

Keep this sustainable by:
- Regular monthly cleanups
- Clear file naming
- Deleting archived folders after review