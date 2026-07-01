# Sleep & Social Tracker

A personal web app for tracking sleep schedules, wake-up times, naps, awake time, friends, hangouts, and hangout ideas.

## Features

- **Dashboard** — Quick overview of awake timer, sleep, naps, hangouts, and recent activity
- **Sleep** — Sleep log, naps, and awake time tracking with live timers
- **Social** — Friends, hangouts (including group/overlapping), and hangout ideas
- **Insights** — Calendar (day/week/month/timeline) and detailed statistics
- **Settings** — Theme, sleep goals, awake warnings, backup/restore, JSON export/import

## Data Storage

All data is stored in **localStorage** and persists across browser refreshes. Use **Settings → Export JSON** to back up your data, or **Import JSON** to restore.

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## Build

```bash
npm run build
npm run preview
```

## Tech Stack

- React 19 + TypeScript
- Vite
- Tailwind CSS v4
- React Router
- date-fns
