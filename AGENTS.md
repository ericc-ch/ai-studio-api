# Agent Instructions

This document provides instructions for AI agents working in this repository.

## Commands

- `pnpm run dev`: Run the development server.
- `pnpm run build`: Build the project.
- `pnpm run lint`: Lint the codebase.
- `pnpm run lint --fix`: Fix linting errors.
- `pnpm run start`: Start the production server.

## Code Style

- **Formatting**: This project uses Prettier for code formatting. The configuration is managed by `@echristian/eslint-config`.
- **Imports**: Organize imports by separating third-party libraries from internal modules.
- **Types**: This is a TypeScript project with `strict` mode enabled. Ensure all new code is strongly typed.
- **Naming Conventions**: Follow camelCase for variables and functions. Use PascalCase for classes and types.
- **Error Handling**: Utilize `tiny-invariant` for assertions. For HTTP errors, use custom error classes from `src/lib/http-error.ts`.
- **Framework**: The server is built with Hono. See existing routes in `src/routes` for examples.
- **Paths**: Use `~/*` as an alias for `./src/*`.
