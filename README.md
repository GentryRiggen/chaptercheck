<div align="center">

# ChapterCheck

**Your personal audiobook library, beautifully organized.**

[![CI/CD](https://github.com/griggen/chaptercheck/actions/workflows/ci.yml/badge.svg)](https://github.com/griggen/chaptercheck/actions/workflows/ci.yml)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-15-000000?logo=next.js&logoColor=white)](https://nextjs.org/)
[![Expo](https://img.shields.io/badge/Expo-54-000020?logo=expo&logoColor=white)](https://expo.dev/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)

[Features](#features) · [Tech Stack](#tech-stack) · [Getting Started](#getting-started) · [Running the Web App](#running-the-web-app) · [Running the Mobile App](#running-the-mobile-app) · [Testing](#testing) · [Deployment](#deployment)

</div>

---

## Features

- **Book Management** — Add, edit, search, and organize your audiobook collection with cover images
- **Author Tracking** — Author profiles with photos, support for narrators and translators
- **Audio Player** — Stream MP3/M4A/M4B files with progress tracking and playback speed control
- **Series Organization** — Group books into series with decimal position numbering (e.g., 2.5 for novellas)
- **Cross-platform** — Web app (Next.js) and iOS app (Expo/React Native) sharing backend and business logic

---

## Tech Stack

| Category           | Technology                                           |
| ------------------ | ---------------------------------------------------- |
| **Monorepo**       | [Turborepo](https://turbo.build) + Yarn 4 workspaces |
| **Web**            | Next.js 15 (App Router), React 19                    |
| **Mobile**         | Expo 54, React Native 0.81, NativeWind               |
| **Database**       | [Convex](https://convex.dev) (real-time)             |
| **Authentication** | [Clerk](https://clerk.com) (web + mobile)            |
| **Storage**        | Cloudflare R2 (S3-compatible)                        |
| **Web UI**         | [shadcn/ui](https://ui.shadcn.com) + Radix UI        |
| **Styling**        | Tailwind CSS + CSS Variables                         |
| **Forms**          | React Hook Form + Zod                                |
| **Testing**        | Vitest + React Testing Library, Playwright (E2E)     |
| **Deployment**     | Cloudflare Workers + Pages (via OpenNext)            |

---

## Project Structure

```
chaptercheck/
├── apps/
│   ├── web/                    # Next.js web application
│   └── mobile/                 # Expo React Native app (iOS)
├── packages/
│   ├── convex-backend/         # Convex schema, queries, mutations
│   ├── shared/                 # Shared hooks, validations, utils, types
│   └── tailwind-config/        # Shared Tailwind theme, cn(), color tokens
├── e2e/                        # Playwright E2E tests
├── scripts/                    # Seed scripts
├── turbo.json                  # Turborepo task config
├── convex.json                 # Points Convex CLI to packages/convex-backend/convex
└── package.json                # Root workspace config (Yarn 4)
```

---

## Getting Started

### Prerequisites

- **Node.js** 20+
- **Yarn** 4 (the repo uses `packageManager: yarn@4.12.0` — Corepack will auto-install it)
- **Xcode** (for iOS simulator — mobile app only)
- A [Convex](https://convex.dev) account
- A [Clerk](https://clerk.com) account (with a dev instance for local development)
- A [Cloudflare](https://cloudflare.com) account (for R2 storage)

### Clone and Install

```bash
# Clone the repository
git clone https://github.com/griggen/chaptercheck.git
cd chaptercheck

# Enable Corepack (provides Yarn 4 automatically)
corepack enable

# Install all dependencies (root + all apps/packages)
yarn install
```

### Environment Variables

Copy the example file and fill in your credentials:

```bash
cp .env.example .env.local
```

The web app reads from `apps/web/.env.local`, which symlinks to the root `.env.local`.

```env
# Convex
CONVEX_DEPLOYMENT=dev:your-deployment
NEXT_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud

# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# Cloudflare R2
R2_ACCOUNT_ID=your-account-id
R2_TOKEN_VALUE=your-token
R2_ACCESS_KEY_ID=your-access-key
R2_SECRET_ACCESS_KEY=your-secret-key
```

For the **mobile app**, create `apps/mobile/.env.local` with Expo-prefixed keys:

```env
EXPO_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
```

### Start the Convex Backend

The Convex dev server must be running for both web and mobile. Run this from the repo root:

```bash
npx convex dev
```

This watches `packages/convex-backend/convex/` for changes and syncs to your dev deployment.

---

## Running the Web App

```bash
# From the repo root — starts the Next.js dev server (port 3000)
yarn dev --filter=@chaptercheck/web
```

Or run everything at once (all apps that have a `dev` script):

```bash
yarn dev
```

Then open [http://localhost:3000](http://localhost:3000).

---

## Running the Mobile App

### First-time setup

1. Make sure Xcode is installed with iOS simulator support
2. Create `apps/mobile/.env.local` with the env vars described above
3. Generate native project files:

```bash
cd apps/mobile
yarn prebuild
```

### Running on iOS Simulator

```bash
# From apps/mobile/
yarn ios
```

Or start the Expo dev server and choose a target:

```bash
# From apps/mobile/
yarn start
```

Then press `i` to open in iOS Simulator.

---

## Testing

### Unit Tests (Vitest)

```bash
# Run all tests in watch mode
yarn test

# Single run (CI-friendly)
yarn test:run
```

### E2E Tests (Playwright)

E2E tests live in `e2e/` and run against the web app. They require `E2E_CLERK_USER_EMAIL` to be set in `.env.local` (pointing to a test user in your Clerk dev instance).

```bash
# Run E2E tests (headless)
yarn e2e

# Interactive UI mode
yarn e2e:ui

# Headed browser
yarn e2e:headed

# Debug mode
yarn e2e:debug
```

### Quality Checks

```bash
yarn lint           # ESLint (--max-warnings=0)
yarn type-check     # TypeScript strict mode across all packages
yarn format:check   # Prettier check
yarn format         # Auto-format with Prettier
```

---

## Deployment

### Cloudflare Workers (Web)

```bash
# Build and deploy to Cloudflare
yarn cf-deploy
```

This runs `opennextjs-cloudflare build && opennextjs-cloudflare deploy` for the web app.

### Convex Backend

```bash
npx convex deploy
```

### CI/CD

GitHub Actions workflow runs on every push:

1. Checks code formatting (Prettier)
2. Runs ESLint
3. Runs TypeScript checks
4. Builds the application
5. Runs tests
6. Deploys to Cloudflare (on main branch)

---

## Scripts Reference

All scripts are run from the repo root via Turborepo unless noted otherwise.

| Script              | Description                               |
| ------------------- | ----------------------------------------- |
| `yarn dev`          | Start all dev servers (web + mobile)      |
| `yarn build`        | Build all packages and apps               |
| `yarn lint`         | Run ESLint across all packages            |
| `yarn type-check`   | TypeScript check across all packages      |
| `yarn format`       | Format all files with Prettier            |
| `yarn format:check` | Check formatting without writing          |
| `yarn test`         | Run unit tests in watch mode              |
| `yarn test:run`     | Run unit tests once                       |
| `yarn cf-deploy`    | Build and deploy web app to Cloudflare    |
| `yarn e2e`          | Run Playwright E2E tests                  |
| `yarn seed`         | Seed the Convex database with sample data |
| `yarn seed:nuke`    | Wipe and re-seed the database             |

### Mobile-specific (run from `apps/mobile/`)

| Script          | Description                          |
| --------------- | ------------------------------------ |
| `yarn start`    | Start Expo dev server                |
| `yarn ios`      | Build and run on iOS Simulator       |
| `yarn prebuild` | Generate native iOS/Android projects |

---

## License

This project is private and not licensed for public use.

---

<div align="center">

**Built with Next.js, Expo, Convex, and Cloudflare**

</div>
