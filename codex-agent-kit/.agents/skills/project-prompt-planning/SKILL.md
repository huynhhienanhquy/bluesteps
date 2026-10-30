---
name: project-prompt-planning
description: Write a project brief and actionable AI coding prompt before implementation. Use for project scoping, detailed requirements, or coding handoffs; skip general prompt writing and small edits with clear requirements.
---

# Project Prompt Planning

## Goal
Turn a project idea into a concrete specification and a self-contained coding prompt before application code changes. Match the user's language; retain exact technical identifiers and repository paths.

## Workflow
1. Determine the requested outcome: project detail, a coding prompt, both, or planning followed by implementation. Planning-only requests end with the requested documents. If implementation is already requested, prepare the documents first and continue within that authorization without adding a blanket approval gate.
2. For an existing repository, inspect applicable instructions, relevant configuration, current behavior, and nearby patterns. Separate verified facts, user decisions, proposed choices, and unresolved questions. For a new project, present architecture options with reasons when helpful; do not select an unchosen stack yourself.
3. For every relevant detail that remains missing, ambiguous, or contradictory after checking available context, ask a concrete question. Do not guess, fill gaps with assumptions, or choose defaults, even for low-impact requirements. Group related questions, avoid asking again for known answers, and continue drafting independent sections while waiting. Keep affected sections explicitly pending until the user answers; silence or elapsed time is not an answer.
4. Draft the project brief using the [project detail template](assets/project-detail-template.md). Scale detail to the request: include goals, users, MVP and non-goals, main journeys, feature behavior, relevant data and interfaces, constraints, measurable acceptance criteria, milestones, and open decisions. Omit inapplicable sections rather than inventing infrastructure, roles, or requirements.
5. Give requirements stable IDs. Connect each milestone and acceptance check to those IDs. Describe observable success and relevant empty, loading, error, permission, and boundary cases rather than labels such as "production-ready" or "secure" alone.
6. Write the requested handoff using the [coding prompt template](assets/coding-prompt-template.md). Include enough project context to work in a new chat, explicit scope, acceptance checks, verified repository constraints, implementation order, and the actual verification commands when known. Link detailed documents when accessible and repeat the essential requirements; a link alone is insufficient.
7. Reconcile brief and prompt: scope, confirmed architecture, data contracts, requirement IDs, questions, and acceptance checks must agree. For larger projects, hand off the first coherent milestone and identify later milestones rather than asking an agent to build everything at once. After receiving answers, update both documents and their linked requirements; ask again if an answer still leaves ambiguity.
8. Return the requested artifacts and identify readiness: ready to implement, or pending answers for named portions. Use existing documentation locations when persistence is requested; otherwise return the documents in the conversation. If no convention exists, propose `docs/project-brief.md` and `docs/implementation-prompt.md`. Preserve existing documents when writing updates.

## Questions without guessing
- Give each unresolved item an ID such as `Q1`, state what is unclear, ask one answerable question, and name the affected requirement or section.
- Offer concise options and their tradeoffs when useful. Clearly label any recommendation as a suggestion awaiting an answer; do not silently adopt it.
- Use statuses such as `awaiting answer` and `answered`. Replace uncertainty with the actual answer or verified evidence, never a plausible assumption.
- Include unresolved questions in both artifacts. A partial prompt must tell the implementing agent to ask and wait before dependent work; it must not hide an unanswered question behind a default.
- Do not mark affected requirements ready or begin their implementation until the uncertainty is resolved. Independent, fully specified work may continue within existing authorization.

## Output format
- Project detail: the agreed behavior and scope, technical proposals, acceptance criteria, milestones, and explicit questions for every unresolved detail.
- Coding prompt: a directly usable task with context, requirements, constraints, implementation sequence, verification, and expected final report.
- Readiness: what can start now and which decisions block specific portions, if any.

Only produce the requested artifact when the user asks for just one. Fill templates with concrete project content; distinguish unknowns from final decisions and remove unused sections or instructional placeholders.

## Guardrails
- Do not change application code for a specification-only or prompt-only request. Mentioning future implementation in a document does not authorize implementing it now.
- Do not make every coding task go through this workflow. Small edits with clear requirements belong to the ordinary implementation flow; general writing prompts and LLM runtime integration have different scope.
- Do not turn proposed features, stacks, deadlines, budgets, dependencies, paths, or commands into facts. Inspect existing projects and label recommendations for new ones.
- Never infer an answer to an unresolved project question or replace it with a default. Existing authorization to implement does not resolve missing requirements; wait for answers before dependent work without adding approval gates to fully specified work.
- Carry the user's scope and external-action boundaries into the coding prompt. A prompt must not implicitly authorize deployment, publication, destructive operations, or external messages.
- Do not include secrets or private data in reusable handoffs; reference required configuration by name.

## Definition of done
The requested artifacts are consistent and usable by another coding agent: scope and non-goals are explicit, confirmed behavior is testable, all unresolved details have questions and affected sections, and implementation steps trace to acceptance criteria. A partial draft is labeled pending answers rather than ready; no gaps are filled by guessing. Planning-only work finishes before application code changes; previously authorized implementation continues for fully specified portions.
