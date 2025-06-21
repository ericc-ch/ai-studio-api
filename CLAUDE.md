# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Development Commands

- **Install dependencies**:
  ```sh
  pnpm install
  ```
- **Development mode with hot reload**:
  ```sh
  pnpm run dev
  ```
- **Production build**:
  ```sh
  pnpm run build
  ```
- **Start in production mode** (builds first):
  ```sh
  pnpm run start
  ```
- **Lint codebase**:
  ```sh
  pnpm run lint
  ```
- **Release (bumps version and publishes)**:
  ```sh
  pnpm run release
  ```

## API Server Summary

This project exposes Google AI Studio as an OpenAI-compatible API by automating a Chromium browser with Playwright. Incoming API requests (especially chat completions) are translated into Playwright-driven UI actions in the browser. Responses are extracted and serialized to match OpenAI's API format.

### High-level Architecture
- **Entry point:** `src/main.ts`
- **Core:**
  - Launches a single browser instance with Playwright.
  - Provides a request-queue system so only one automation runs at a time.
  - Converts REST API requests to UI automation tasks.
  - Handles full prompt construction, including static instruction, tool instructions, and chat history, before passing to Google AI Studio.
  - Extracts results by programmatically copying directly from the web UI.
  - Re-formats responses and returns results as OpenAI API-compatible output.

### Endpoints
- `GET /`              — Health check
- `GET /models`        — List models
- `POST /chat/completions` / `POST /v1/chat/completions` — Create chat completions

### Core technologies
- **Node.js**
- **Playwright** (for browser automation)
- **Hono** (minimal web server)
- **pnpm** (package management)

### Command-line Options
- `--port`, `--verbose`, `--manual`, `--rate-limit`, `--wait`, `--browser-path`, `--browser-delay` are supported on dev/start commands.

#### Example usage:
```sh
pnpm run dev --port 8080 --verbose
pnpm run dev --manual
```

## Linting & Hooks
- Uses ESLint for linting (`pnpm run lint`).
- Pre-commit hooks auto-fix lint issues via lint-staged.

## Requirements
- Node.js
- Chromium-based browser
- Google account
