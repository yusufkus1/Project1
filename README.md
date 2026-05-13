# TaskFlow

A full-stack productivity app designed for focus and clarity — with tasks, habits, calendar, weekly reviews, and optional AI-powered task analysis.

![React](https://img.shields.io/badge/React-TypeScript-blue) ![Node.js](https://img.shields.io/badge/Node.js-Express-green) ![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Prisma-lightblue)

---

## Features

- **Tasks** — Create, edit, archive, and organize tasks with priorities (Low / Medium / High / Critical), statuses, due dates, subtasks, recurring schedules, rich-text descriptions, and file attachments
- **Projects & Tags** — Group tasks into projects and label them with color-coded tags
- **Calendar** — Drag-and-drop tasks onto dates; see your month at a glance
- **Habits** — Track daily habits with streaks and completion history
- **Focus Mode** — Distraction-free timer with Pomodoro-style sessions
- **Weekly Review** — Reflect on completed and overdue tasks each week
- **Dashboard** — XP system, streaks, charts, and at-a-glance stats
- **AI Task Analysis** — Paste your Anthropic API key in Settings to get instant priority suggestions and time estimates powered by Claude
- **Dark mode** — Full light/dark theme support
- **Mobile-friendly** — Responsive layout tested on iPhone

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Vite, TanStack Query, Zustand |
| Styling | Tailwind CSS, CSS custom properties, Plus Jakarta Sans |
| Backend | Node.js, Express, TypeScript |
| Database | PostgreSQL 16, Prisma ORM |
| Auth | JWT (access + refresh tokens), bcrypt |
| AI | Anthropic Claude API (optional, user-supplied key) |
| Drag & Drop | @dnd-kit |
| Rich Text | Tiptap |

---

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL 16 (via Homebrew on macOS: `brew install postgresql@16`)
- npm

### 1. Clone the repo

```bash
git clone https://github.com/yusufkus1/Project1.git
cd Project1
```

### 2. Configure the backend

Create `backend/.env`:

```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/todoapp"
JWT_SECRET="your-secret-key"
JWT_REFRESH_SECRET="your-refresh-secret-key"
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
PORT=3001
FRONTEND_URL=http://localhost:5173

# Email (for password reset)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Optional — server-wide Anthropic key (users can also supply their own in Settings)
ANTHROPIC_API_KEY=
```

### 3. Run

```bash
bash start.sh
```

This will:
1. Start PostgreSQL (if not already running)
2. Apply database migrations via Prisma
3. Start the backend on **http://localhost:3001**
4. Start the frontend on **http://localhost:5173**

Press `Ctrl+C` to stop both servers.

---

## Docker (Self-hosted)

```bash
# Copy and edit the env file
cp backend/.env.example backend/.env

docker compose up -d
```

The app will be available on port **80** (HTTP) and **443** (HTTPS if certs are placed in `./certs/`).

To apply updates:

```bash
git pull
docker compose up -d --build
```

| Variable | Default | Description |
|----------|---------|-------------|
| `DB_PASSWORD` | `todopass123` | PostgreSQL password |
| `JWT_SECRET` | `change-this-secret` | Access token secret |
| `JWT_REFRESH_SECRET` | `change-this-refresh-secret` | Refresh token secret |
| `HOST_IP` | `192.168.1.77` | Your server's IP or domain for CORS |
| `ANTHROPIC_API_KEY` | _(empty)_ | Optional server-wide AI key |

---

## AI Features

AI task analysis uses the [Anthropic Claude API](https://console.anthropic.com/) to suggest a priority level and time estimate for any task.

**To enable AI for your account:**

1. Get an API key at [console.anthropic.com](https://console.anthropic.com/)
2. Open the app → **Settings** → **AI Features**
3. Paste your key (`sk-ant-...`) and it saves automatically

Your key is stored only in your browser's local storage and is sent directly to the backend per request — it is never stored on the server.

If the server administrator sets `ANTHROPIC_API_KEY` in the backend `.env`, AI works for all users without individual keys.

---

## Project Structure

```
Project1/
├── backend/
│   ├── src/
│   │   ├── routes/       # Express route handlers (tasks, auth, ai, habits, …)
│   │   ├── middleware/   # JWT auth, upload handling
│   │   └── index.ts      # App entry point
│   └── prisma/
│       └── schema.prisma # Database schema
├── frontend/
│   └── src/
│       ├── api/          # API client functions
│       ├── components/   # Shared UI components & layout
│       ├── pages/        # Route-level page components
│       ├── store/        # Zustand state stores
│       └── hooks/        # Custom React hooks
├── docker-compose.yml
└── start.sh              # Local dev launcher
```

---

## License

MIT
