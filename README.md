# Dream to Vision AI

> Transform your dreams into cinematic narratives powered by Google Gemini AI.

---

## Project Overview

Dream to Vision AI is a full-stack AI SaaS application that takes a user's dream description (via text or voice) and produces a complete cinematic interpretation: AI-analyzed themes and emotions, a generated story, fully described characters, and detailed scene breakdowns with cinematographic visual prompts — all stored persistently and accessible from any device.

---

## Phase 1 Objectives

- Accept dream input via text and voice
- Analyze dreams with Google Gemini AI
- Extract characters, emotions, settings, events, themes, and visual elements
- Generate a cinematic story with logline
- Generate detailed character descriptions
- Generate 5–8 cinematic scenes with visual prompts
- Store all data in Supabase PostgreSQL
- Full authentication with Supabase Auth
- Display results in a premium dark cinematic UI
- History view for previous dreams

---

## Features

- **Text & Voice Input** — Web Speech API for hands-free dream entry
- **AI Dream Analysis** — Gemini extracts structured meaning from raw dream text
- **Story Generation** — Full cinematic narrative with logline
- **Character Generation** — Detailed visual and personality descriptions per character
- **Scene Generation** — 5–8 scenes with camera, lighting, mood, and visual prompt
- **Supabase Auth** — Signup, login, logout with persistent sessions
- **Row Level Security** — Each user sees only their own dreams
- **History** — Browse, view, and delete past dreams
- **Responsive Design** — Works on mobile and desktop

---

## Architecture

```
USER → React Frontend
     → Express Backend API
     → Google Gemini AI
     → Supabase (PostgreSQL + Auth)
     → Express Backend API
     → React Result Page
```

---

## Technology Stack

| Layer      | Technology                              |
|------------|-----------------------------------------|
| Frontend   | React 18, Vite, Tailwind CSS, Framer Motion, Lucide React, React Router v6 |
| Backend    | Node.js, Express.js                     |
| AI         | Google Gemini 1.5 Flash                 |
| Database   | Supabase (PostgreSQL)                   |
| Auth       | Supabase Auth                           |
| Hosting    | Local / Deployable to Vercel + Railway  |

---

## Database Schema

### `profiles`
| Column       | Type        | Notes                  |
|--------------|-------------|------------------------|
| id           | UUID PK     | Matches auth.users.id  |
| username     | TEXT        |                        |
| avatar_url   | TEXT        |                        |
| created_at   | TIMESTAMPTZ |                        |
| updated_at   | TIMESTAMPTZ |                        |

### `dreams`
| Column          | Type        | Notes                          |
|-----------------|-------------|--------------------------------|
| id              | UUID PK     |                                |
| user_id         | UUID FK     | → auth.users.id                |
| raw_input       | TEXT        | Original user input            |
| input_type      | TEXT        | 'text' or 'voice'              |
| title           | TEXT        |                                |
| enhanced_prompt | TEXT        |                                |
| analysis        | JSONB       | Full Gemini analysis           |
| story           | TEXT        |                                |
| logline         | TEXT        |                                |
| status          | TEXT        | pending/processing/completed/failed |
| created_at      | TIMESTAMPTZ |                                |
| updated_at      | TIMESTAMPTZ |                                |

### `characters`
| Column            | Type        |
|-------------------|-------------|
| id                | UUID PK     |
| dream_id          | UUID FK     |
| name              | TEXT        |
| role              | TEXT        |
| age_range         | TEXT        |
| appearance        | TEXT        |
| personality       | TEXT        |
| clothing          | TEXT        |
| visual_description| TEXT        |

### `scenes`
| Column          | Type        |
|-----------------|-------------|
| id              | UUID PK     |
| dream_id        | UUID FK     |
| scene_number    | INTEGER     |
| title           | TEXT        |
| description     | TEXT        |
| duration        | INTEGER     |
| visual_prompt   | TEXT        |
| camera_movement | TEXT        |
| camera_angle    | TEXT        |
| lighting        | TEXT        |
| mood            | TEXT        |
| environment     | TEXT        |
| characters      | JSONB       |

### `generation_jobs`
| Column        | Type        |
|---------------|-------------|
| id            | UUID PK     |
| dream_id      | UUID FK     |
| job_type      | TEXT        |
| status        | TEXT        |
| progress      | INTEGER     |
| error_message | TEXT        |

---

## API Endpoints

| Method | Endpoint                  | Description                          |
|--------|---------------------------|--------------------------------------|
| GET    | /api/health               | Health check                         |
| POST   | /api/dreams               | Create new dream                     |
| GET    | /api/dreams               | List user's dreams                   |
| GET    | /api/dreams/:id           | Get full dream with characters/scenes|
| DELETE | /api/dreams/:id           | Delete dream                         |
| POST   | /api/dreams/:id/analyze   | Run full AI analysis pipeline        |

---

## Supabase Setup

1. Create a project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run the contents of `database/migrations/001_initial_schema.sql`
3. Copy your **Project URL** and **anon key** from Settings → API
4. Copy your **service_role key** (keep this backend-only)

---

## Gemini Setup

1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Create an API key
3. Add it to `backend/.env` as `GEMINI_API_KEY`

---

## Environment Variables

### Backend (`backend/.env`)
```
PORT=5000
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
GEMINI_API_KEY=your_gemini_api_key
FRONTEND_URL=http://localhost:5173
```

### Frontend (`frontend/.env`)
```
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_API_URL=http://localhost:5000
```

---

## Installation

```bash
# Clone the repo
git clone https://github.com/YOUR_USERNAME/dream-to-vision-ai
cd dream-to-vision-ai

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

---

## Running the Backend

```bash
cd backend
cp .env.example .env
# Fill in your environment variables
npm run dev
```

Backend runs on: `http://localhost:5000`

---

## Running the Frontend

```bash
cd frontend
cp .env.example .env
# Fill in your environment variables
npm run dev
```

Frontend runs on: `http://localhost:5173`

---

## Testing

Phase 1 test checklist:
- [ ] Signup with email/password
- [ ] Login with credentials
- [ ] Logout and session clear
- [ ] Create dream via text
- [ ] Create dream via voice
- [ ] Gemini analysis completes
- [ ] Story is generated and saved
- [ ] Characters are generated and saved
- [ ] Scenes are generated and saved
- [ ] Data persists in Supabase
- [ ] History page loads dreams
- [ ] Open individual dream result
- [ ] Delete dream
- [ ] Protected routes redirect unauthenticated users
- [ ] Mobile responsive layout
- [ ] Production build (`npm run build`) succeeds

---

## Phase 1 Limitations

- No video generation (Phase 2)
- No social sharing
- No advanced media management
- Visual prompts are text-only (ready for Phase 2 video pipeline)

---

## Phase 2 — AI Video Generation (COMPLETE)

### Video Provider
**fal.ai — Kling v1 Standard Text-to-Video**
- Model: `fal-ai/kling-video/v1/standard/text-to-video`
- Async queue: submit → poll → download
- 16:9 cinematic output, 5–10 seconds per scene

### Phase 2 Flow
```
Completed Dream (6 scenes)
  → POST /api/dreams/:id/generate-video
  → Background pipeline starts
  → Each scene: build prompt → submit to Kling → poll → download → upload to Supabase Storage
  → FFmpeg concatenates all scenes → final.mp4
  → Upload final.mp4 to Supabase Storage
  → Frontend polls GET /api/video-generations/:id
  → Video player renders final MP4
  → Download button available
```

### Phase 2 New Tables
- `video_generations` — overall job tracking (status, progress, final_video_url)
- `scene_videos` — per-scene tracking (provider_job_id, video_url, storage_path)

### Phase 2 New API Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/dreams/:id/generate-video | Start video generation |
| GET | /api/dreams/:id/video | Get video status for a dream |
| GET | /api/video-generations/:id | Poll generation progress |
| GET | /api/video-generations/:id/scenes | Scene video statuses |
| POST | /api/video-generations/:id/cancel | Cancel active generation |
| GET | /api/dreams/:id/video/refresh | Refresh signed URL |

### Phase 2 Environment Variables (backend)
```
FAL_KEY=your_fal_ai_api_key
VIDEO_PROVIDER=fal-kling
```

### Get fal.ai API Key
1. Go to https://fal.ai/dashboard/keys
2. Sign in with Google
3. Create or copy existing key
4. Add to `backend/.env` as `FAL_KEY`

### Storage
Videos stored in Supabase Storage bucket `dream-videos`:
```
dream-videos/
  {user_id}/
    {dream_id}/
      scene-01.mp4 ... scene-06.mp4
      final.mp4
```
