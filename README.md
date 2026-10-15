# Real Estate Design Manager — CEP v0.3

Illustrator 2026 on Windows. Overview: scan existing named card groups, preview CSV-based text changes, and apply selected numeric fields. Keep design layout unchanged.

## Development setup

```powershell
git clone https://github.com/phongtran278/real-estate-design-manager.git D:\PHONG_LAB\real-estate-design-manager
cd D:\PHONG_LAB\real-estate-design-manager
powershell -NoProfile -ExecutionPolicy Bypass -File .\install-dev-link.ps1
```

Restart Illustrator **once** after first registration, then open Window → Extensions (Legacy) → Real Estate Design Manager.

For subsequent code updates:

```powershell
cd D:\PHONG_LAB\real-estate-design-manager
.\update.ps1
```

Click **Reload Panel**. Manifest/extension configuration changes may require reopening Illustrator. JSX host logic is evaluated from disk per action.

**Development build only:** Offline CSV demo, not direct Google Sheets sync. Back up `.ai` before Apply; no guaranteed formatting-perfect rollback. Named groups such as `T3-05-02`, with named Text Objects, are required for Overview.
