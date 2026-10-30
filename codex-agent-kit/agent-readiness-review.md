# Báo Cáo Đánh Giá: Rules, Skills & Agent Readiness

> Ngày: 2026-10-28 | Workspace: `d:\ai-foundations-training` | Mục tiêu: Xây dựng agent riêng dùng codex-agent-kit làm nền tảng

---

## 1. Tổng Quan Cấu Hình Hiện Tại

### 1.1 Cấu hình Agent Hệ Thống (Antigravity)

| Thành phần | Trạng thái | Ghi chú |
|---|---|---|
| **Science Plugin Rules** (`AGENTS.md`) | ✅ Tốt | Rule rõ ràng: ưu tiên sidecar viewer, luôn kèm pill link |
| **Built-in Skills** (antigravity) | ✅ Đầy đủ | 40+ skills cho science, automation, android, web... |
| **User Rules** | ✅ Hoạt động | Science visualization priority rule được load |
| **MCP Servers** | ✅ Sẵn sàng | `science_biomolecular_structure_viewer_mcp` active |

### 1.2 Cấu hình Workspace (codex-agent-kit)

| Thành phần | Trạng thái | Ghi chú |
|---|---|---|
| **Profile** | ✅ `lean` | Nhẹ, đủ cho hầu hết tasks |
| **AGENTS.md** | ✅ Đầy đủ | 12 rules được compile sẵn, 314 dòng |
| **Skills** | ✅ 23 skills | Phủ đầy đủ vòng đời phát triển |
| **Agent roles** | ✅ 8 roles | planner, developer, reviewer, tester, security, docs, devops, release |
| **Profiles** | ✅ 5 profiles | lean, frontend, backend, ai, full |
| **Definition of Done** | ✅ Rõ ràng | 5 nhóm tiêu chí, bắt buộc có evidence |
| **Guides** | ⚠️ Chưa chọn | `guides: []` — chưa bật guide nào (react, nextjs, express, fastapi) |

---

## 2. Đánh Giá Rules

### ✅ Điểm Mạnh

**Rule Precedence** — Thứ tự ưu tiên rõ ràng (8 tầng), conflict được xử lý theo hướng "narrower, safer, more recent". Đây là nền tảng quan trọng để agent không bị confused khi nhận nhiều instruction.

**Scope & Authority** — Rule phân biệt rõ: *đọc ≠ sửa, sửa code ≠ deploy*. Quan trọng khi agent có nhiều quyền.

**Execution Safety** — Liệt kê cụ thể các lệnh nguy hiểm (force push, rm -rf, DROP DATABASE, npm publish). Agent biết phải xin phép trước.

**Git Safety** — Conventional Commits bắt buộc, commit message phải có ≥3 meaningful words, phải `git status` trước mọi thao tác lớn. Bảo vệ history tốt.

**Communication Rule** — Quy định rõ format báo cáo cuối: what changed, files, tests run, risks. Tránh agent "báo xong nhưng không rõ đã làm gì".

**Definition of Done** — Rất chặt: không được tự khai "done" nếu còn mandatory item chưa verify với evidence thực.

### ⚠️ Điểm Cần Chú Ý

**Operating Mode — có mâu thuẫn tiềm ẩn:**
> Rule: *"Do not ask for information that can be determined by reading code, config, tests, or Git history."*

Điều này có thể xung đột với yêu cầu của bạn: **"hỏi những gì không biết trước khi làm"**. Agent được train để tự đọc code thay vì hỏi — phù hợp với Codex/Cursor, nhưng nếu bạn muốn agent hỏi nhiều hơn, cần ghi đè rule này.

**Code Quality — thiếu ngôn ngữ/framework cụ thể:**
Rule hiện tại rất generic. Khi bạn xây agent riêng, cần thêm rule cho stack cụ thể (Python/FastAPI? TypeScript/Next.js?).

**Không có rule về LLM integration** (profile `ai` chưa được bật):
Nếu agent của bạn tích hợp LLM, các rule về prompt injection, token limits, fallback... chưa được load.

---

## 3. Đánh Giá Skills

### ✅ Skills Sẵn Sàng & Hiệu Quả

| Skill | Mục đích | Chất lượng |
|---|---|---|
| `project-prompt-planning` | Lên kế hoạch, không đoán, hỏi rõ trước khi code | ⭐⭐⭐⭐⭐ Rất tốt |
| `vibe-development` | Vòng lặp nhanh: build-run-observe-adjust | ⭐⭐⭐⭐⭐ Rõ ràng |
| `feature-implementation` | Production-quality feature, có verification steps | ⭐⭐⭐⭐ Tốt |
| `bug-investigation` | Diagnosis trước khi fix | ⭐⭐⭐⭐ Tốt |
| `security-audit` | Dedicated security review | ⭐⭐⭐⭐ Tốt |
| `repository-onboarding` | Hiểu project trước khi làm | ⭐⭐⭐⭐ Tốt |
| `task-planning` | Phân rã task phức tạp | ⭐⭐⭐⭐ Tốt |

### ⚠️ Skills Chưa Được Kích Hoạt Đầy Đủ

**`llm-integration`** — Skill này tồn tại trong kit nhưng profile `ai` chưa được bật. Nếu agent của bạn dùng LLM API, nên switch profile.

**Science skills** (alphafold, gnomad, clinvar...) — Đây là skills của plugin science trong Antigravity, **không phải** của codex-agent-kit. Chúng phục vụ mục đích research/bioinformatics, không liên quan đến việc xây dựng agent riêng trừ khi agent của bạn làm về khoa học.

---

## 4. Phân Tích: AI Có Thể Làm Tốt Chưa?

### Kịch bản: Bạn nhờ agent xây dựng một tính năng mới

```
✅ Agent sẽ: đọc code hiện tại, tìm pattern, implement smallest slice
✅ Agent sẽ: chạy test, typecheck, lint trước khi báo done
✅ Agent sẽ: không thêm dependency không cần thiết
✅ Agent sẽ: commit với Conventional Commits format
⚠️ Agent có thể: tự đoán thay vì hỏi (do Operating Mode rule)
⚠️ Agent có thể: không biết stack cụ thể (guides chưa chọn)
```

### Kịch bản: Bạn nhờ agent lên kế hoạch project

```
✅ Agent sẽ: hỏi mọi chi tiết còn thiếu, không đoán
✅ Agent sẽ: tạo brief + coding prompt có requirement IDs
✅ Agent sẽ: đánh dấu "awaiting answer" cho phần chưa rõ
✅ Agent sẽ: không bắt đầu code khi còn câu hỏi chưa được trả lời
```

### Kịch bản: Bạn nhờ agent làm điều gì đó nguy hiểm

```
✅ Agent sẽ: từ chối hoặc xin phép trước
✅ Agent sẽ: ưu tiên reversible operations
✅ Agent sẽ: không tự deploy, push force, xóa branch
```

---

## 5. Vấn Đề Cần Giải Quyết

### 🔴 Quan trọng

**[V1] Mâu thuẫn "hỏi vs tự đọc"**

Rule hiện tại nói: *"Do not ask for information that can be determined by reading code"*. Nhưng bạn muốn: *"hỏi những gì không biết trước khi làm"*. Cần làm rõ:
- Agent của bạn target là Codex/Cursor (tự động) hay Antigravity (interactive)?
- Nếu interactive: cần thêm rule override cho phép hỏi nhiều hơn.

**[V2] Profile `lean` — thiếu domain rules**

Bạn đang xây dựng agent riêng. Cần biết:
- Tech stack là gì? (→ chọn guide phù hợp)
- Agent có tích hợp LLM không? (→ cần profile `ai`)

### 🟡 Nên cải thiện

**[V3] Chưa có AGENTS.md tại root workspace**

File `d:\ai-foundations-training\AGENTS.md` không tồn tại — chỉ có `README.md: "My example"`. Agent kit nằm trong subfolder. Hầu hết AI tools (Copilot, Cursor, Codex) đọc `AGENTS.md` ở root. Cần install kit vào root hoặc tạo AGENTS.md tại root trỏ đến kit.

**[V4] Guides chưa được chọn**

`guides: []` trong `.agent-kit.json`. Nếu đã biết framework, nên bật guide (react/nextjs/express/fastapi) để agent hiểu context sâu hơn.

**[V5] README.md workspace rỗng**

`README.md` chỉ có "My example" — không có mô tả project, mục tiêu, hay tech stack. Agent dùng file này để onboard.

---

## 6. Khuyến Nghị Theo Thứ Tự Ưu Tiên

1. **Trả lời 3 câu hỏi open** (Q1–Q3 bên dưới)
2. **Tạo `AGENTS.md` tại root** `d:\ai-foundations-training\` hoặc install kit vào đó
3. **Cập nhật `README.md`** với mô tả project thực
4. **Chọn guide** trong `.agent-kit.json` sau khi biết stack
5. **Thêm rule "ask-first"** nếu dùng Antigravity interactive mode

---

## 7. Câu Hỏi Còn Mở

| ID | Câu hỏi | Ảnh hưởng đến |
|---|---|---|
| Q1 | Agent bạn xây dùng AI tool nào để chạy? (Antigravity, Codex, Cursor, Cline...) | V1, V2, rule override | xây dựng để dùng được cho claude, codex, antigravity
| Q2 | Tech stack của agent/project cụ thể là gì? | guide selection, V4 | này dùng chung cho các project, khi vào project cụ thể sẽ có tech stack cụ thể
| Q3 | Agent có gọi LLM API không? | profile selection, V2 | gọi khi cần thiết

---

> **Kết luận ban đầu:** Codex-agent-kit là nền tảng chất lượng cao — rules viết kỹ, có safety gates, Definition of Done rõ ràng. Các nhận định trên ghi lại thời điểm review; xem cập nhật bên dưới theo câu trả lời Q1–Q3 đã có.

---

## 8. Cập Nhật Sau Review — 2026-10-28

Đã tiếp nhận các câu trả lời ở mục 7: dùng cho Claude Code, Codex và Antigravity; dùng chung cho nhiều project với stack riêng; chỉ gọi LLM khi cần. Không còn cần hỏi lại Q1–Q3 để cập nhật kit.

| Mục | Xử lý trong kit |
|---|---|
| V1 — hỏi hay tự đọc | `operating-mode` phân biệt fact có thể kiểm tra trong repo với yêu cầu chưa được quyết định. Hỏi trước phần triển khai phụ thuộc vào yêu cầu chưa rõ; tiếp tục phần độc lập. Khi người dùng yêu cầu không đoán, áp dụng cả với chi tiết nhỏ còn mơ hồ. |
| V2 — profile dùng chung | Giữ `lean`; không ép profile `ai` cho mọi project chỉ vì dùng công cụ AI. Thêm cách tải rule/skill LLM khi tác vụ cần. |
| V3 — entry point tại root | Thêm `AGENTS.md` và `CLAUDE.md` tại root workspace, hướng dẫn đến kit trong thư mục con. Không cài đè toàn bộ kit lên root. |
| V4 — guide rỗng | `guides: []` là chủ đích của kit dùng chung. Xác định stack từ project thật trước khi chọn guide; chưa cần chọn framework ở workspace này. |
| V5 — README workspace | Thay nội dung mẫu bằng mục đích, cấu trúc, nguyên tắc cấu hình và lệnh kiểm tra. |
| Nhiều coding tools | Build Python/PowerShell sinh `CLAUDE.md` import `AGENTS.md`; installer Bash/PowerShell hỗ trợ giữ file hiện có và sync. Codex và Antigravity dùng `AGENTS.md` chung. |

### Hiệu chỉnh các nhận định ban đầu

- Profile quyết định **rules được compile**, không khóa skill. `llm-integration` vẫn có thể dùng dưới `lean`; tải kèm `rules/llm-ai-integration/RULE.md` cho tác vụ liên quan, chọn `ai` nếu project cần thường xuyên.
- Chưa chọn guide và chưa bật `ai` không phải lỗi readiness của một kit dùng chung. Framework và API provider phải đến từ yêu cầu/context project cụ thể.
- Cài kit cung cấp hướng dẫn Markdown; không tự kết nối Science plugin, MCP, credentials hay đăng ký subagent. Các nhận định về Antigravity/Science ở mục 1 mô tả môi trường tại thời điểm review, không phải khả năng được kit bảo đảm hoặc đã kiểm chứng lại.
- Git Safety quy định cách commit **khi thực hiện commit**; không có nghĩa agent tự commit mọi tác vụ. Rules và tests không bảo đảm mọi model luôn làm đúng.

### Cơ sở tương thích và phạm vi kiểm tra

Đã đối chiếu [Codex AGENTS.md](https://learn.chatgpt.com/docs/agent-configuration/agents-md), [Claude Code imports](https://code.claude.com/docs/en/memory#share-one-file-with-other-coding-tools) và [Antigravity rules](https://antigravity.google/docs/rules/). `CLAUDE.md` dùng import thực `@AGENTS.md`; Antigravity hiện hỗ trợ trực tiếp `AGENTS.md`, nên không cần sao chép thêm cùng policy vào `GEMINI.md`.

Tests của kit bao phủ đầu ra sinh tự động, tính nhất quán Python/PowerShell, installer giữ tùy chỉnh/sync và bộ fixture hành vi offline. Các fixture là đầu vào kiểm tra runner, không phải bằng chứng một model thật đã vượt qua eval. Chưa kiểm thử phiên chạy thực của cả ba client và chưa chạy live LLM eval.
