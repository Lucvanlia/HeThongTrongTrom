# Graph Report - HeTrongTrongTrom-src  (2026-10-31)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 377 nodes · 751 edges · 29 communities (20 shown, 9 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 2 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `dc3e55a5`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- session-catchup.py
- inject-plan.py
- inject-plan.sh
- session_attached
- ._run
- set-active-plan.sh
- is_file
- set-active-plan.ps1
- cases
- init-session.sh
- attest-plan.ps1
- resolve-plan-dir.sh
- resolve_plan_dir
- ledger-append.sh
- .plan_view
- phase-status.sh
- attest-plan.sh
- check-complete.sh script
- plan-doctor.sh
- resolve-plan-dir.ps1
- main.cpp
- skill-hook.sh
- emit_unavailable
- gate-stop.sh

## God Nodes (most connected - your core abstractions)
1. `resolve_plan_dir()` - 16 edges
2. `inject-plan.sh script` - 16 edges
3. `Injector` - 14 edges
4. `is_file()` - 13 edges
5. `ClaudeDispatcher` - 12 edges
6. `opencode_catchup()` - 12 edges
7. `session_attached()` - 12 edges
8. `is_within_root()` - 12 edges
9. `main()` - 11 edges
10. `safe_snapshot()` - 11 edges

## Surprising Connections (you probably didn't know these)
- `inject()` --calls--> `Injector`  [EXTRACTED]
  .agents/skills/planning-with-files/scripts/inject-plan.py → .agents/skills/planning-with-files/scripts/inject-plan.py  _Bridges community 4 → community 6_
- `main()` --calls--> `ClaudeDispatcher`  [EXTRACTED]
  .agents/skills/planning-with-files/scripts/inject-plan.py → .agents/skills/planning-with-files/scripts/inject-plan.py  _Bridges community 6 → community 1_
- `main()` --calls--> `pretool_cache()`  [EXTRACTED]
  .agents/skills/planning-with-files/scripts/inject-plan.py → .agents/skills/planning-with-files/scripts/inject-plan.py  _Bridges community 1 → community 3_
- `plan_is_ambiguous()` --calls--> `is_file()`  [EXTRACTED]
  .agents/skills/planning-with-files/scripts/inject-plan.py → .agents/skills/planning-with-files/scripts/inject-plan.py  _Bridges community 12 → community 6_
- `plan_is_ambiguous()` --calls--> `is_link()`  [EXTRACTED]
  .agents/skills/planning-with-files/scripts/inject-plan.py → .agents/skills/planning-with-files/scripts/inject-plan.py  _Bridges community 12 → community 4_

## Import Cycles
- None detected.

## Communities (29 total, 9 thin omitted)

### Community 0 - "session-catchup.py"
Cohesion: 0.05
Nodes (42): _claude_sanitize(), claude_session_cwd(), codex_meta_cwd(), codex_planning_update(), collect_claude_tool_results(), configure_utf8_stdio(), emit_metadata_report(), extract_messages_after() (+34 more)

### Community 1 - "inject-plan.py"
Cohesion: 0.09
Nodes (14): Bail, hook_identity(), hook_is_main(), json_string(), main(), normalize_wall_clock(), parse_args(), path_is_absolute_ish() (+6 more)

### Community 2 - "inject-plan.sh"
Cohesion: 0.20
Nodes (22): bounded_view(), cleanup_snapshot(), cleanup_snapshot_file(), emit_plan_head(), frame_file(), is_windowsapps_path(), is_within_root(), mode_has() (+14 more)

### Community 3 - "session_attached"
Cohesion: 0.11
Nodes (8): _descriptor_final_path(), _identity(), _inside(), _normalized_windows_final(), pretool_cache(), safe_snapshot(), secure_progress_marker(), session_attached()

### Community 4 - "._run"
Cohesion: 0.18
Nodes (8): cache_dir(), Injector, file_has_token(), mode_has(), mode_relax_allowed(), is_link(), slug_is_valid(), read_bytes()

### Community 5 - "set-active-plan.sh"
Cohesion: 0.30
Nodes (19): canonicalize(), current_active(), file_metadata(), is_windowsapps_path(), is_within_root(), json_add_candidate(), json_candidate(), json_phases() (+11 more)

### Community 6 - "is_file"
Cohesion: 0.28
Nodes (5): ClaudeDispatcher, hook_json(), inject(), is_file(), shell_pwd()

### Community 7 - "set-active-plan.ps1"
Cohesion: 0.37
Nodes (14): Add-PhaseStatus(), Get-CurrentActivePlan(), Get-FinalPath(), Get-ListingCandidate(), Get-ListingFileMetadata(), Get-ListingSelection(), Get-PhaseStatus(), Resolve-OwnedPointerBackup() (+6 more)

### Community 8 - "cases"
Cohesion: 0.14
Nodes (13): glob, file_glob, kind, value, cases, assertions, judge, name (+5 more)

### Community 9 - "init-session.sh"
Cohesion: 0.29
Nodes (13): apply_v3_mode(), create_files_in(), gen_nonce(), inherit_root_mode(), print_v3_mode_status(), init-session.sh script, short_uuid(), slugify() (+5 more)

### Community 10 - "attest-plan.ps1"
Cohesion: 0.35
Nodes (11): Assert-HandleParent(), Get-AttestationPath(), Open-SafeReadStream(), Open-TrustedDirectory(), Read-SafeText(), Remove-SafeFile(), Resolve-ContainedPlanFile(), Resolve-PlanFile() (+3 more)

### Community 11 - "resolve-plan-dir.sh"
Cohesion: 0.42
Nodes (11): canonicalize(), is_windowsapps_path(), is_within_root(), mtime_of(), norm_slashes(), resolve_from_active_file(), resolve_from_env(), resolve_latest_dir() (+3 more)

### Community 12 - "resolve_plan_dir"
Cohesion: 0.20
Nodes (6): is_dir(), mtime_seconds(), pin_is_absolute(), plan_is_ambiguous(), resolve_plan_dir(), strip_ws()

### Community 13 - "ledger-append.sh"
Cohesion: 0.38
Nodes (9): append_line(), iso_utc(), json_escape(), max_tick_in_dir(), resolve_plan_dir(), sanitize_agent(), ledger-append.sh script, usage() (+1 more)

### Community 14 - ".plan_view"
Cohesion: 0.22
Nodes (3): head_lines(), line_count(), smart_plan_extract()

### Community 15 - "phase-status.sh"
Cohesion: 0.39
Nodes (7): acquire_lock(), claim_lock_owner(), do_write(), resolve_plan_file(), rewrite(), phase-status.sh script, usage()

### Community 16 - "attest-plan.sh"
Cohesion: 0.50
Nodes (7): attestation_path_for(), compute_hash(), resolve_from_slug_cwd(), resolve_plan_file(), attest-plan.sh script, slug_is_valid(), usage_error()

### Community 17 - "check-complete.sh script"
Cohesion: 0.60
Nodes (5): advisory_report(), first_in_progress_phase(), json_escape(), ledger_line_count(), check-complete.sh script

### Community 19 - "plan-doctor.sh"
Cohesion: 0.60
Nodes (5): fail(), info(), ok(), plan-doctor.sh script, warn()

### Community 25 - "skill-hook.sh"
Cohesion: 0.83
Nodes (3): select_python(), select_python_into_var(), skill-hook.sh script

## Knowledge Gaps
- **9 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `session_attached()` connect `session_attached` to `session-catchup.py`, `inject-plan.py`, `._run`?**
  _High betweenness centrality (0.018) - this node is a cross-community bridge._
- **Should `session-catchup.py` be split into smaller, more focused modules?**
  _Cohesion score 0.05450165612767239 - nodes in this community are weakly interconnected._
- **Why does `resolve_plan_dir()` connect `resolve_plan_dir` to `session-catchup.py`, `inject-plan.py`, `._run`, `is_file`?**
  _High betweenness centrality (0.013) - this node is a cross-community bridge._
- **Should `inject-plan.py` be split into smaller, more focused modules?**
  _Cohesion score 0.0873015873015873 - nodes in this community are weakly interconnected._
- **Why does `Injector` connect `._run` to `inject-plan.py`, `is_file`, `.plan_view`?**
  _High betweenness centrality (0.011) - this node is a cross-community bridge._
- **Should `session_attached` be split into smaller, more focused modules?**
  _Cohesion score 0.11428571428571428 - nodes in this community are weakly interconnected._
- **Should `cases` be split into smaller, more focused modules?**
  _Cohesion score 0.14285714285714285 - nodes in this community are weakly interconnected._