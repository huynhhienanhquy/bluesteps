# Git Safety

## Purpose
Protect users' Git history and uncommitted changes.

## Rules
- Always check `git status` before major operations.
- Do not use `git reset --hard`, `git clean -fd`, force push, or delete branches unless the user explicitly requests it.
- Do not overwrite unrelated user changes.
- Do not amend commits or rebase public history without being requested.
- Keep each commit focused on one logical change. Before committing, inspect the staged diff and ensure every staged file belongs to that change.
- Write commit messages in Conventional Commits format: `<type>(optional-scope): <imperative summary>`.
- Choose the type from the actual staged code change: use `fix` for a bug correction, `feat` for new user-visible behavior, and an accurate type such as `docs`, `test`, `refactor`, `perf`, `build`, `ci`, or `chore` for other changes.
- Keep the subject concise but descriptive: the summary after the type and optional scope must contain at least three meaningful words, and the complete subject line must not exceed 72 characters.
- The subject and optional body must accurately describe the purpose and behavior of the staged diff. Do not use a vague, misleading, or broader message than the code changes support.
- If staged files contain unrelated changes that cannot be described by one accurate message, split them into separate commits. Do not mechanically create one commit per file when multiple files implement the same logical change.
- When there is a conflict, resolve it based on the intent of both sides and rerun the test.
