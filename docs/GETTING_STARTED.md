# Getting Started

## Prerequisites

- Node.js (v22 or higher)
- npm

## Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/jgw96/Coho.git
   cd Coho
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

## Building for Production

To create a production build with optimized assets:

```bash
npm run build
```

This command includes our custom image optimization script which significantly reduces bundle size.
