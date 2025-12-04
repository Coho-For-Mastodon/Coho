# Coho

**A modern, cross-platform Mastodon PWA built for performance and user experience.**

[![Status](https://img.shields.io/badge/Status-Public%20Beta-orange)]()

Coho is a Progressive Web App (PWA) client for Mastodon. It emphasizes offline capabilities with a fast and simple user experience.

[**Get the App**](https://coho-mastodon.web.app)

<div>
  <img src="/public/assets/new-header-graphic.png" alt="Coho For Mastodon" />
</div>

## Features

- **Simple**: Coho keeps things simple, with a clean UI that keeps the core of what you need up front.
- **Cross Platform**: Fully responsive design that works seamlessly on mobile, tablets, and desktop.
- **PWA**: Installable on all devices (iOS, Android, Windows, macOS, Linux).
- **Offline First**: Works exceptionally well offline. View cached content, like posts, and create new content that automatically syncs when you're back online.
- **On-Device Translations**: Translations powered by on-device AI (when supported by device)
- **Blazing Fast**: Built for speed on any device and network condition.
- **Theming**: Choose your primary color and switch between Dark and Light modes.
- **Wellness Mode**: Take control of your digital well-being by hiding likes, boost counts, and other metrics for a calmer experience.

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
