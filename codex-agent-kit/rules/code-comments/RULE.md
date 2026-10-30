# Code Comments

## Purpose
Preserve intent, contracts, constraints, and design decisions that names, types, and code cannot communicate clearly on their own.

## Rules

### When Documentation Is Required
- Add a language-native documentation comment to public or exported APIs when callers need information that is not obvious from the name and type signature.
- Document functions, methods, hooks, and components that contain non-obvious business rules, side effects, failure modes, lifecycle requirements, concurrency assumptions, or compatibility behavior.
- Add an inline comment for a surprising decision, invariant, workaround, or trade-off that a future maintainer might otherwise remove or "simplify" incorrectly.
- Do not require comments for trivial private helpers, callbacks, getters, or tests when their names, types, and surrounding context already explain their behavior.

### Documentation Content
Include only the contract details that apply and are not already clear from the code:
- **Summary**: State the outcome or responsibility in one sentence.
- **Context**: Explain why the behavior exists and when callers should use it when that context is non-obvious.
- **Parameters**: Describe semantic meaning, units, accepted ranges, defaults, mutation behavior, or constraints. Do not repeat static types.
- **Return value**: Describe meaning, ownership, ordering, or special values when they are not obvious from the signature.
- **Errors**: Name expected errors and the conditions that produce them when callers are expected to handle them.
- **Side effects and constraints**: State external writes, network calls, required state, authentication, ordering, idempotency, or postconditions.
- **Examples**: Add a realistic example only when correct usage is not obvious.

### Quality Standards
- Explain intent and contract, not a line-by-line restatement of the implementation.
- Prefer clearer names, smaller functions, and stronger types over comments that compensate for unclear code.
- Keep documentation next to the behavior it describes and update it in the same change when the contract changes.
- Document verified behavior only; do not claim validation, errors, guarantees, or side effects that the implementation does not enforce.
- Give TODO, FIXME, and workaround comments enough context to be actionable, including the removal condition or issue reference when available.
- Follow the repository's established documentation convention; otherwise use the language-native format such as JSDoc/TSDoc for JavaScript and TypeScript or docstrings for Python.

## Safe Path
When uncertain, first make the code self-explanatory through naming, types, and structure. Add the smallest comment that preserves the remaining non-obvious intent or contract.

See `rules/code-comments/EXAMPLES.md` for complete good and bad examples.

## Exceptions
- Generated code follows its generator's documentation convention and must not be edited only to add comments.
- Tests may rely on descriptive suite and case names unless a fixture, workaround, or setup constraint needs explanation.
- Implementations of a documented interface may inherit that contract when they do not add behavior or constraints.
- A more specific repository documentation standard takes precedence within its scope.
