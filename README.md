<div align="center">
  <img src="/public/assets/icons/new-icons/icon-256x256.png" alt="Coho" width="128" height="128" />

# Coho <sup>alpha</sup>

A fast, offline-first Mastodon client.

[**Try the App**](https://coho.place)

  <img src="/public/assets/new-header-graphic.png" alt="Coho For Mastodon" />
</div>

## Why Coho?

### Performance

Coho is built for speed. No matter what device you're on or how spotty your network connection is, the app stays fast and responsive. We leverage the best of the modern web platform to deliver a native-quality experience.

### Simple & Intuitive

A clean, focused interface that keeps what matters front and center. No clutter, no confusion—just Mastodon done right with thoughtful UX and the latest in Material Design.

### Best-in-Class Offline Support

This is where Coho shines. While you're online, we keep a fresh cache of your timeline on your device. When you go offline, you can still:

- Scroll through your timeline
- Like and boost posts
- Create new posts
- Everything syncs automatically when you're back online

No other Mastodon client handles offline as well as Coho.

## Features

### Offline First

Your timeline is cached locally so you can browse even without connectivity. Actions like likes and new posts queue up and sync seamlessly when you reconnect.

### Smart Features, Powered On-Device

Fast, private, and no server required—these features run entirely on your device:

- **Instant translations** — Translate posts without waiting for server round-trips
- **Auto-generated alt text** — Images missing alt text get descriptions generated automatically
- **Alt text assistance** — Generate alt text for your own images before posting
- **Voice input** — Compose posts by speaking
- **Handwriting input** — Write posts with your handwriting, converted to text instantly

### Cross Platform PWA

Install Coho on any device—iOS, Android, Windows, macOS, or Linux. It's a true progressive web app with full offline support.

### Modern Material Design

Built with the latest Material Design 3 components for a polished, accessible experience.

### Theming

Choose your primary color and switch between Dark and Light modes.

### Wellness Mode

Take control of your digital well-being by hiding likes, boost counts, and other metrics for a calmer experience.

# Technical

## Tech Stack

- **Frontend**: [Lit](https://lit.dev/) (Web Components), TypeScript
- **UI Components**: Custom MD3 components
- **Build Tool**: [Vite](https://vitejs.dev/)
- **Backend**: Firebase Functions (TypeScript)

## Getting Started

### Prerequisites

- Node.js (v22 or higher)
- npm

### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/jgw96/Otter.git
   cd Otter
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```
   The app will be available at `http://localhost:3000`.

### Building for Production

To create a production build with optimized assets:

```bash
npm run build
```

This command includes our custom image optimization script which significantly reduces bundle size.

## Project Structure

- `src/components/`: Reusable Lit web components (MD3 & others).
- `src/pages/`: Top-level application pages.
- `src/services/`: API interaction, state logic, and data management.
- `src/styles/`: Global styles and design tokens.
- `functions/`: Firebase Cloud Functions for backend logic.
- `public/`: Static assets, service worker, and manifest.

## Contributing

Contributions are welcome! Please read our [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## License

This project is licensed under the GNU General Public License v2.0
