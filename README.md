# QDog - Shooting Range Queue System

A web-based queue management system for shooting ranges. First-come, first-served lane assignment with real-time updates and email notifications.

## Features

- **Customer Check-in**: Simple form to join the queue
- **Real-time Updates**: See your position update live via WebSockets
- **Lane Management**: Admin dashboard to manage lanes and queue
- **Email Notifications**: Automatic emails when a lane is ready (via Resend)
- **No-show Handling**: Mark customers as no-shows and auto-assign to next in line

## Quick Start (Development)

### Prerequisites
- Node.js 18+
- npm

### Setup

1. **Install backend dependencies**
   ```bash
   cd backend
   npm install
   ```

2. **Initialize the database**
   ```bash
   npm run db:push
   ```

3. **Configure environment** (optional for email)
   ```bash
   cp .env.example .env
   # Edit .env and add your RESEND_API_KEY
   ```

4. **Start the backend**
   ```bash
   npm run dev
   ```

5. **Install frontend dependencies** (new terminal)
   ```bash
   cd frontend
   npm install
   ```

6. **Start the frontend**
   ```bash
   npm run dev
   ```

7. **Open in browser**
   - Customer check-in: http://localhost:5173
   - Admin dashboard: http://localhost:5173/admin

## Deployment (Docker)

### Simple deployment
```bash
# Set your Resend API key
export RESEND_API_KEY=re_xxxxxxxxxxxxx

# Build and run
docker-compose up -d
```

The app will be available at http://localhost:3000

### Production with Nginx/SSL

1. Edit `nginx.conf` with your domain
2. Add SSL certificates to `ssl/` directory
3. Run:
   ```bash
   docker-compose -f docker-compose.prod.yml up -d
   ```

## API Endpoints

### Queue
- `GET /api/queue` - Get all queue entries
- `GET /api/queue/:id` - Get single entry
- `POST /api/queue` - Add to queue
- `PUT /api/queue/:id` - Update entry
- `POST /api/queue/:id/no-show` - Mark as no-show
- `DELETE /api/queue/:id` - Remove from queue

### Lanes
- `GET /api/lanes` - Get all lanes
- `POST /api/lanes` - Create lane
- `PUT /api/lanes/:id` - Update lane
- `POST /api/lanes/:id/release` - Release lane (customer done)
- `POST /api/lanes/:id/assign` - Manually assign customer
- `DELETE /api/lanes/:id` - Delete lane

### Settings
- `GET /api/settings` - Get settings
- `PUT /api/settings` - Update settings

## Tech Stack

- **Backend**: Node.js, Express, Socket.IO, Prisma
- **Database**: SQLite
- **Frontend**: React, Vite, TailwindCSS
- **Email**: Resend
- **Deployment**: Docker, Nginx

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | SQLite database path | `file:./dev.db` |
| `RESEND_API_KEY` | Resend API key for emails | (none) |
| `PORT` | Server port | `3000` |
| `FRONTEND_URL` | Frontend URL for CORS | `http://localhost:5173` |

## License

MIT
