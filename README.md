# AllergyScan – Intelligent Ingredient Safety Auditor

A futuristic, privacy-first, offline-capable web application that detects harmful allergens by scanning ingredient labels right on your device.

## Features
- **Offline OCR**: Powered natively in your browser using `tesseract.js`. No backend processing or API required.
- **Smart Allergen Detection**: Matches over 6+ major categories and 50+ hidden allergen names simultaneously.
- **Glassmorphism UI**: Beautifully designed utilizing modern Vanilla CSS techniques, supporting both light and dark modes out of the box.
- **Audio Feedback**: Utilizes the window Web Speech API to provide immediate vocal warnings if serious allergens are detected.
- **Personalized Profiles**: Tracks unique allergies and maintains a local scan history securely in LocalStorage.

## Tech Stack
- Frontend: React (via CDN) + Babel Standalone
- Icons: Lucide (via CDN)
- Server: Python `http.server` for development

## Getting Started

Since the application uses a CDN-based architecture to avoid Node.js build dependencies, you don't need `npm` or `node` installed. You just need a way to serve the static files locally.

### Prerequisites
- Python 3+

### Running the App
1. Navigate to the project directory:
   ```bash
   cd AllergyScan
   ```
2. Start the local python server:
   ```bash
   python server.py
   ```
3. Open your browser and navigate to:
   ```
   http://localhost:8000
   ```
