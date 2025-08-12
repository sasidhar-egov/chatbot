# Revolt Motors Voice Assistant

This repository contains the source code for a full-stack voice assistant application for Revolt Motors. The backend serves an API integrated with the Gemini generative language model, and the frontend is a React app providing a voice interface with speech recognition and speech synthesis.

---

## Project Structure

```
.
├── Back_end/          # Node.js backend with Express
├── Front_end/         # React frontend using Vite
```

---

## Backend (Back\_end)

### Features

* Express server serving `/api/gemini` POST endpoint
* Integrates with Gemini API to generate responses about Revolt Motors
* CORS enabled and JSON parsing
* Environment variable for Gemini API key
* Health check endpoint `/health`

### Setup

1. Navigate to backend folder:

   ```bash
   cd Back_end
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Create a `.env` file in `Back_end` directory with:

   ```
   GEMINI_API_KEY=your_gemini_api_key_here
   ```

4. Run the backend server locally:

   ```bash
   npm start
   ```

   Server runs on port specified by `process.env.PORT` or 5000 by default.

---

## Frontend (Front\_end)

### Features

* React + Vite frontend
* Voice interface with speech recognition and speech synthesis
* Dark mode toggle
* Connects to backend `/api/gemini` for conversational responses

### Setup

1. Navigate to frontend folder:

   ```bash
   cd Front_end
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Run development server:

   ```bash
   npm run dev
   ```

   The app will be available at `http://localhost:3000` (or Vite's default port)

---

## Running the Full App Locally

1. Start backend server in one terminal:

   ```bash
   cd Back_end
   npm start
   ```

2. Start frontend server in another terminal:

   ```bash
   cd Front_end
   npm run dev
   ```

3. Open the frontend URL in your browser.

---

## Deployment on Render

### Backend

* Set branch: `main`
* Root Directory: `Back_end`
* Build Command: `npm install`
* Start Command: `npm start`
* Environment Variables: Add `GEMINI_API_KEY`
* Ensure your backend listens on `process.env.PORT`

### Frontend

* Set branch: `main`
* Root Directory: `Front_end`
* Build Command: `npm install && npm run build`
* Publish Directory: `dist`

---

## Important Notes

* The backend must have the Gemini API key set in environment variables.
* Frontend fetch URL to backend should be updated to deployed backend URL in production.
* Use nodemon (`npm run dev`) only for local backend development.

---

## Deployed Link

Link : https://ch-fron-end.onrender.com

