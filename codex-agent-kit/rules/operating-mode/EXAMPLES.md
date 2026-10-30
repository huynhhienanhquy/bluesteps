# Operating Mode Examples

Examples demonstrating autonomous task execution, scoping discipline, and conservative assumption handling.

---

## 1. Autonomous Task Workflow

### Good: End-to-End Execution Flow
```text
Task: "Add pagination to the GET /api/v1/products endpoint"

Execution:
1. Discovery: Read `src/controllers/productController.ts` and `src/services/productService.ts`. Check existing pagination patterns in `orderController.ts`.
2. Plan:
   - Accept `page` and `limit` query parameters with defaults (page=1, limit=20, maxLimit=100).
   - Update repository to execute `LIMIT` and `OFFSET` queries alongside total count.
   - Return `{ data: Product[], pagination: { page, limit, totalItems, totalPages } }`.
3. Implementation: Apply minimal changes to schema, controller, service, and repository.
4. Testing: Add unit tests in `productService.test.ts` for boundary values (limit > 100, page 0, negative values).
5. Verification: Run `npm test -- productService.test.ts` and `npm run typecheck`.
6. Report: Summarize changes and verified test results without unnecessary prompts.
```

---

## 2. Asking vs Making Documented Assumptions

### Repository Fact (Read Before Asking)
- **Scenario**: Add pagination to an endpoint in a service whose other endpoints already define pagination contracts.
- **Action**: Inspect those contracts and tests; reuse verified conventions. Ask if the requested endpoint needs different behavior rather than inventing new defaults.

### Reversible Implementation Detail (Proceed & Report)
- **Scenario**: Add a fully specified helper; the project has no convention for the private helper's filename.
- **Action**: Choose a descriptive filename and continue, unless the user explicitly requested answers before every unresolved detail.

### Missing Requirement (Ask Before Dependent Work)
- **Scenario**: A phone formatter has no established default country or output format.
- **Action**: Ask which countries and output formats are required. Do not invent a US default. Existing code and tests can still be inspected while waiting.

### Explicit Ask-First Preference
- **Scenario**: The user says "ask about anything unclear; do not assume defaults."
- **Action**: After discovery, group remaining relevant questions, mark affected work pending, and wait for answers. Do not treat silence as accepting a recommendation.

### High-Risk Ambiguity (Stop and Ask)
- **Scenario**: The user asked to "Clean up old user accounts".
- **Action**: Do **not** guess whether to soft-delete, hard-delete, or what the inactive age cutoff is.
  > *Question: Should accounts be soft-deleted (marked `is_active: false`) or permanently deleted? What is the inactivity threshold (e.g., 90 days, 1 year)?*
