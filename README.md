# Speech-to-Text Backend API

A robust backend API for converting audio files to text using Deepgram's speech recognition service and storing transcriptions in Supabase.

## Features

- 🎵 **Audio Transcription**: Convert audio files to text using Deepgram's Nova-2 model
- 💾 **Database Storage**: Save transcriptions to Supabase PostgreSQL database
- 📊 **Transcription History**: Full CRUD operations for managing transcriptions
- 🔒 **Security**: Rate limiting, CORS protection, and input validation
- 🚀 **Production Ready**: Optimized for deployment on various platforms

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: Supabase (PostgreSQL)
- **Speech Recognition**: Deepgram API
- **File Upload**: Multer
- **Security**: Helmet, Express Rate Limit

## API Endpoints

### Speech-to-Text

- `POST /api/speech/transcribe/web` - Transcribe audio file
- `GET /api/speech/test` - Test Deepgram API connection

### Transcriptions

- `GET /api/transcriptions` - Get all transcriptions
- `GET /api/transcriptions/:id` - Get specific transcription
- `POST /api/transcriptions` - Create new transcription
- `PUT /api/transcriptions/:id` - Update transcription
- `DELETE /api/transcriptions/:id` - Delete transcription

### Health Check

- `GET /api/health` - API health status

## Environment Variables

Create a `.env` file in the root directory:

```env
PORT=3001
NODE_ENV=development
CLIENT_URL=http://localhost:3000

# Deepgram Configuration
DEEPGRAM_API_KEY=your_deepgram_api_key
DEEPGRAM_PROJECT_ID=your_deepgram_project_id

# Supabase Configuration
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

## Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd speech-to-text-backend
```

2. Install dependencies:

```bash
npm install
```

3. Set up environment variables:

```bash
cp .env.example .env
# Edit .env with your actual values
```

4. Set up Supabase database:

```bash
# Run the SQL commands in supabase-setup.sql in your Supabase SQL editor
```

5. Start the development server:

```bash
npm run dev
```

## Production Deployment

### Railway

1. Connect your GitHub repository to Railway
2. Set environment variables in Railway dashboard
3. Deploy automatically on push to main branch

### Render

1. Connect your GitHub repository to Render
2. Set build command: `npm install`
3. Set start command: `npm start`
4. Configure environment variables

### Heroku

1. Create a new Heroku app
2. Connect your GitHub repository
3. Set environment variables in Heroku dashboard
4. Deploy

## Database Schema

The application uses the following Supabase table:

```sql
CREATE TABLE transcriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  filename TEXT NOT NULL,
  original_text TEXT NOT NULL,
  file_size INTEGER,
  file_type TEXT,
  processing_time_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## License

MIT
