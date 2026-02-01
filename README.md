<div align="center">

# 📚 ChapterCheck

**Your personal audiobook library, beautifully organized.**

[![CI/CD](https://github.com/griggen/chaptercheck/actions/workflows/ci.yml/badge.svg)](https://github.com/griggen/chaptercheck/actions/workflows/ci.yml)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-15-000000?logo=next.js&logoColor=white)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)

[Features](#-features) • [Tech Stack](#-tech-stack) • [Getting Started](#-getting-started) • [Development](#-development) • [Deployment](#-deployment)

</div>

---

## ✨ Features

<table>
<tr>
<td width="50%">

### 📖 Book Management

- Add, edit, and organize your audiobook collection
- Upload custom cover images
- Track series and reading order
- Full-text search across your library

</td>
<td width="50%">

### 👤 Author Tracking

- Detailed author profiles with photos
- Link multiple authors to books
- Support for narrators and translators
- View all books by author

</td>
</tr>
<tr>
<td width="50%">

### 🎧 Audio Player

- Stream audio files directly in browser
- Progress tracking and seeking
- Support for MP3, M4A, and M4B formats
- Upload files up to 500MB

</td>
<td width="50%">

### 📚 Series Organization

- Group books into series
- Drag-and-drop reordering
- Automatic position numbering
- Support for novellas (decimal positions)

</td>
</tr>
</table>

---

## 🛠 Tech Stack

<table>
<tr>
<td align="center" width="96">
<img src="https://skillicons.dev/icons?i=nextjs" width="48" height="48" alt="Next.js" />
<br>Next.js 15
</td>
<td align="center" width="96">
<img src="https://skillicons.dev/icons?i=react" width="48" height="48" alt="React" />
<br>React 19
</td>
<td align="center" width="96">
<img src="https://skillicons.dev/icons?i=ts" width="48" height="48" alt="TypeScript" />
<br>TypeScript
</td>
<td align="center" width="96">
<img src="https://skillicons.dev/icons?i=tailwind" width="48" height="48" alt="Tailwind" />
<br>Tailwind CSS
</td>
<td align="center" width="96">
<img src="https://skillicons.dev/icons?i=cloudflare" width="48" height="48" alt="Cloudflare" />
<br>Cloudflare
</td>
</tr>
</table>

| Category           | Technology                                    |
| ------------------ | --------------------------------------------- |
| **Framework**      | Next.js 15 (App Router)                       |
| **Database**       | [Convex](https://convex.dev) (Real-time)      |
| **Authentication** | [Clerk](https://clerk.com)                    |
| **Storage**        | Cloudflare R2 (S3-compatible)                 |
| **Deployment**     | Cloudflare Workers + Pages                    |
| **UI Components**  | [shadcn/ui](https://ui.shadcn.com) + Radix UI |
| **Styling**        | Tailwind CSS + CSS Variables                  |
| **Forms**          | React Hook Form + Zod                         |
| **Testing**        | Vitest + React Testing Library                |

---

## 🚀 Getting Started

### Prerequisites

- Node.js 20+
- npm 10+
- A [Convex](https://convex.dev) account
- A [Clerk](https://clerk.com) account
- A [Cloudflare](https://cloudflare.com) account (for R2 storage)

### Installation

```bash
# Clone the repository
git clone https://github.com/griggen/chaptercheck.git
cd chaptercheck

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your credentials
```

### Environment Variables

```env
# Convex
CONVEX_DEPLOYMENT=
NEXT_PUBLIC_CONVEX_URL=

# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=

# Cloudflare R2
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
```

---

## 💻 Development

```bash
# Start the development server
npm run dev

# Run Convex in development mode (separate terminal)
npx convex dev

# Run tests
npm run test

# Run tests once
npm run test:run

# Type check
npm run type-check

# Lint
npm run lint

# Format code
npm run format
```

### 📁 Project Structure

```
├── app/                    # Next.js App Router pages
│   ├── (auth)/            # Authentication pages
│   ├── books/             # Book listing & details
│   ├── authors/           # Author listing & details
│   └── series/            # Series details
├── components/            # React components
│   ├── ui/               # shadcn/ui components
│   ├── books/            # Book-related components
│   ├── authors/          # Author-related components
│   └── audio/            # Audio player & upload
├── convex/               # Backend (Convex functions)
│   ├── books/           # Book queries & mutations
│   ├── authors/         # Author queries & mutations
│   └── series/          # Series queries & mutations
├── hooks/                # Custom React hooks
├── lib/                  # Utilities & validations
└── __tests__/           # Test files
```

---

## 🚢 Deployment

### Cloudflare Workers

```bash
# Build for Cloudflare
npm run build:worker

# Preview locally
npm run preview

# Deploy to Cloudflare
npm run cf-deploy
```

### CI/CD

The project includes a GitHub Actions workflow that:

1. ✅ Checks code formatting
2. ✅ Runs ESLint
3. ✅ Runs TypeScript checks
4. ✅ Builds the application
5. ✅ Runs tests
6. 🚀 Deploys to Cloudflare (on main branch)

---

## 🧪 Testing

```bash
# Run tests in watch mode
npm run test

# Run tests once
npm run test:run

# Run with coverage
npm run test:coverage
```

---

## 📝 Scripts

| Script                 | Description               |
| ---------------------- | ------------------------- |
| `npm run dev`          | Start development server  |
| `npm run build`        | Build for production      |
| `npm run lint`         | Run ESLint                |
| `npm run lint:fix`     | Fix ESLint errors         |
| `npm run format`       | Format code with Prettier |
| `npm run format:check` | Check code formatting     |
| `npm run type-check`   | Run TypeScript check      |
| `npm run test`         | Run tests in watch mode   |
| `npm run test:run`     | Run tests once            |
| `npm run cf-deploy`    | Deploy to Cloudflare      |

---

## 📄 License

This project is private and not licensed for public use.

---

<div align="center">

**Built with ❤️ using Next.js, Convex, and Cloudflare**

</div>
