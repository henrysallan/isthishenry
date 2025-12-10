# isthishenry Portfolio

A modern portfolio website built with React, Vite, and Three.js.

## Tech Stack

- **React** - UI framework
- **Vite** - Build tool and dev server
- **React Three Fiber** - Three.js renderer for React
- **@react-three/drei** - Helper components for R3F
- **Firebase** - Hosting (configured for future deployment)
- **Cloudflare R2** - Video streaming storage

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm

### Installation

1. Clone the repository:
```bash
git clone https://github.com/henrysallan/isthishenry.git
cd isthishenry
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file based on `.env.example`:
```bash
cp .env.example .env
```

4. Fill in your environment variables in `.env`

### Development

Run the development server:
```bash
npm run dev
```

The site will be available at `http://localhost:5173`

### Build

Build for production:
```bash
npm run build
```

Preview the production build:
```bash
npm run preview
```

## Firebase Deployment

To deploy to Firebase Hosting:

1. Login to Firebase:
```bash
firebase login
```

2. Initialize Firebase (if not already done):
```bash
firebase init hosting
```

3. Build and deploy:
```bash
npm run build
firebase deploy
```

## Cloudflare R2 Setup

Cloudflare R2 is configured for video streaming. You'll need to:

1. Create an R2 bucket in your Cloudflare dashboard
2. Generate API credentials
3. Set up a public domain for your bucket
4. Add the credentials to your `.env` file

## Project Structure

```
├── src/
│   ├── components/     # React components
│   │   └── Scene.jsx   # Three.js scene component
│   ├── config/         # Configuration files
│   │   ├── firebase.js # Firebase setup
│   │   └── r2.js       # Cloudflare R2 setup
│   ├── utils/          # Utility functions
│   │   └── videoStreaming.jsx # R2 video helpers
│   ├── App.jsx         # Main app component
│   └── main.jsx        # Entry point
├── public/             # Static assets
├── firebase.json       # Firebase hosting config
└── .env.example        # Environment variables template
```

## License

MIT
