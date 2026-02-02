# qdog

Queue system for gun range patrons

## Tech Stack

- **Frontend:** React + Vite + Tailwind CSS
- **Backend:** Express.js + Prisma + SQLite
- **Deployment:** Docker on dakota.membies.com

## Deployment

To deploy to production:

```bash
ssh -i ~/.ssh/id_wiki root@dakota.membies.com "cd /var/www/qdog && git pull && docker compose up --build -d"
```

**Important SSH Details:**
- Host: `dakota.membies.com`
- User: `root`
- SSH Key: `~/.ssh/id_wiki`
- App Path: `/var/www/qdog`

## Project Structure

```
qdog/
├── backend/
│   ├── src/
│   │   ├── index.js          # Express server entry
│   │   ├── routes/           # API routes
│   │   └── services/         # Business logic
│   ├── prisma/               # Database schema
│   └── public/avatars/       # Avatar images
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── pages/            # Page components
│   │   └── components/       # Reusable components
│   └── public/               # Static assets
├── scripts/                  # Avatar generation scripts
└── docker-compose.yml
```

## Commands

| Action | Command |
|--------|---------|
| Build  | `npm run build` |
| Test   | `npm test` |
| Lint   | `npm run lint` |

## Code Style

- Follow existing patterns in the codebase
- Keep code simple and readable
- Avoid over-engineering

## Reminders

> Use /captainslog frequently to document progress

## Working with this Project

- Always read existing code before making modifications
- Run tests before committing changes
- Keep commits focused and atomic
