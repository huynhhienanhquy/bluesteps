# Frontend Structure and Organization

## Purpose
Keep frontend code discoverable without forcing one framework's layout onto another.

## Rules
- Treat the existing repository and framework conventions as the source of truth; verify them before adding folders or moving files.
- Keep route-level code close to its route when the framework supports co-location, and promote code to shared folders only after it has real consumers.
- Place reusable UI primitives in the project's established component-library location and domain features in clearly named feature areas.
- Separate generic utilities, API clients, shared types, global state, configuration, static data, assets, and global styles only when the repository already uses or genuinely needs those boundaries.
- Keep framework entry points and reserved filenames where the framework expects them.
- Do not create empty standard folders, duplicate catch-all directories, or a new architecture for a small feature.
- When scaffolding a new application without an established convention, start with the smallest framework-native layout and add folders as responsibilities emerge.
- Preserve working imports and behavior during structural changes; perform broad moves as an explicit refactor with verification.

## Safe Path
When placement is uncertain, co-locate code with its only consumer and document the promotion condition instead of creating a speculative shared abstraction.
