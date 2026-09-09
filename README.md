# TaskFlow - Progressive Web App (PWA)

TaskFlow is a zero-dependency, production-ready Todo and Task Tracking PWA designed to run on GitHub Pages with zero backend required. It stores all data locally in IndexedDB and provides full offline capability.

## Features

- ⚡ **Offline-First**: Service worker caching allows total offline productivity.
- 📱 **Installable**: Full PWA support for Desktop, Android, and iOS Safari.
- 🎯 **Next Step Engine**: Surface actionable "Next Steps" across all your tasks.
- 🔄 **Backup & Restore**: Export and merge JSON database snapshots safely.
- 🎨 **Modern Design**: Responsive desktop sidebar + mobile bottom navigation, auto Dark Mode.

## Deployment to GitHub Pages

1. Create a new repository on GitHub (e.g., `taskflow`).
2. Clone or upload all files from this directory directly to the repository root:
.
├── index.html
├── manifest.json
├── service-worker.js
├── css/
├── js/
└── icons/
3. Go to **Settings** > **Pages** in your GitHub repository.
4. Under **Source**, select `Deploy from a branch` and choose `main` (or `master`) branch / root `/`.
5. Click **Save**. Your site will be published at `https://USERNAME.github.io/REPOSITORY/`.

## Browser Installation Guide

- **Chrome / Edge (Desktop)**: Click the "Install App" button in the header or click the install icon in the address bar.
- **Android (Chrome)**: Tap the menu (three dots) > select "Add to Home screen".
- **iOS (Safari)**: Tap the Share button > select "Add to Home Screen".