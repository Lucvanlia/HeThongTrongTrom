# Graph Report - HeTrongTrongTrom-src  (2026-11-01)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 671 nodes · 1230 edges · 46 communities (37 shown, 9 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 14 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `2cb3e892`
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
- init-session.ps1
- plan-doctor.sh
- resolve-plan-dir.ps1
- check-complete.ps1
- main.cpp
- ledger-append.ps1
- phase-status.ps1
- skill-hook.sh
- emit_unavailable
- gate-stop.sh
- ledger-summary.ps1
- attest-plan.sh
- diagram.json
- check-complete.sh script
- plan-doctor.sh
- resolve-plan-dir.ps1
- scripts
- scripts
- skill-hook.sh
- scripts
- emit_unavailable
- gate-stop.sh

## God Nodes (most connected - your core abstractions)
1. `AzureClient` - 18 edges
2. `compilerOptions` - 17 edges
3. `App()` - 16 edges
4. `resolve_plan_dir()` - 16 edges
5. `inject-plan.sh script` - 16 edges
6. `Injector` - 14 edges
7. `is_file()` - 13 edges
8. `ClaudeDispatcher` - 12 edges
9. `opencode_catchup()` - 12 edges
10. `session_attached()` - 12 edges

## Surprising Connections (you probably didn't know these)
- `@types/node@^20.17.10` --declares--> `@types/node`  [EXTRACTED]
  web/package.json → api/package.json
- `@types/node@^20.17.10` --declares--> `@types/node`  [EXTRACTED]
  functions-ingest/package.json → api/package.json
- `typescript@^5.6.3` --declares--> `typescript`  [EXTRACTED]
  functions-ingest/package.json → api/package.json
- `typescript@^5.6.3` --declares--> `typescript`  [EXTRACTED]
  web/package.json → api/package.json
- `@azure/data-tables@^13.2.2` --declares--> `@azure/data-tables`  [EXTRACTED]
  functions-ingest/package.json → api/package.json

## Import Cycles
- None detected.

## Communities (46 total, 9 thin omitted)

### Community 0 - "session-catchup.py"
Cohesion: 0.05
Nodes (42): _claude_sanitize(), claude_session_cwd(), codex_meta_cwd(), codex_planning_update(), collect_claude_tool_results(), configure_utf8_stdio(), emit_metadata_report(), extract_messages_after() (+34 more)

### Community 1 - "inject-plan.py"
Cohesion: 0.10
Nodes (28): lucide-react, react, react-dom, dependencies, lucide-react@^0.474.0, react@^19.0.0, react-dom@^19.0.0, App() (+20 more)

### Community 2 - "inject-plan.sh"
Cohesion: 0.06
Nodes (29): alarmOutputTask(), AlertEvent, distanceCm, sensor, connectIoTHub(), generateSasToken(), getEpochMs(), loop() (+21 more)

### Community 3 - "session_attached"
Cohesion: 0.09
Nodes (14): Bail, hook_identity(), hook_is_main(), json_string(), main(), normalize_wall_clock(), parse_args(), path_is_absolute_ish() (+6 more)

### Community 4 - "._run"
Cohesion: 0.20
Nodes (18): offlineWatchdog(), telemetryIngest(), sendAlarmEmailNotification(), sendOfflineEmailNotification(), broadcastToWebClients(), pubSubClient, alertsTable, deviceStateTable (+10 more)

### Community 5 - "set-active-plan.sh"
Cohesion: 0.20
Nodes (22): bounded_view(), cleanup_snapshot(), cleanup_snapshot_file(), emit_plan_head(), frame_file(), is_windowsapps_path(), is_within_root(), mode_has() (+14 more)

### Community 6 - "is_file"
Cohesion: 0.15
Nodes (9): updateConfig(), controlCommand(), getHistory(), getUtc7DateKey(), ClientPrincipal, getClientPrincipal(), hasRole(), iotRegistryClient (+1 more)

### Community 7 - "set-active-plan.ps1"
Cohesion: 0.11
Nodes (8): _descriptor_final_path(), _identity(), _inside(), _normalized_windows_final(), pretool_cache(), safe_snapshot(), secure_progress_marker(), session_attached()

### Community 8 - "cases"
Cohesion: 0.18
Nodes (8): cache_dir(), Injector, file_has_token(), mode_has(), mode_relax_allowed(), is_link(), slug_is_valid(), read_bytes()

### Community 9 - "init-session.sh"
Cohesion: 0.30
Nodes (19): canonicalize(), current_active(), file_metadata(), is_windowsapps_path(), is_within_root(), json_add_candidate(), json_candidate(), json_phases() (+11 more)

### Community 10 - "attest-plan.ps1"
Cohesion: 0.11
Nodes (18): redirect, statusCode, statusCode, globalHeaders, content-security-policy, Referrer-Policy, X-Content-Type-Options, X-Frame-Options (+10 more)

### Community 11 - "resolve-plan-dir.sh"
Cohesion: 0.11
Nodes (18): compilerOptions, allowImportingTsExtensions, isolatedModules, jsx, lib, module, moduleDetection, moduleResolution (+10 more)

### Community 12 - "resolve_plan_dir"
Cohesion: 0.28
Nodes (5): ClaudeDispatcher, hook_json(), inject(), is_file(), shell_pwd()

### Community 13 - "ledger-append.sh"
Cohesion: 0.17
Nodes (14): @types/react, @types/react-dom, vite, @vitejs/plugin-react, devDependencies, @types/node@^20.17.10, @types/react@^19.0.7, @types/react-dom@^19.0.3 (+6 more)

### Community 14 - ".plan_view"
Cohesion: 0.37
Nodes (14): Add-PhaseStatus(), Get-CurrentActivePlan(), Get-FinalPath(), Get-ListingCandidate(), Get-ListingFileMetadata(), Get-ListingSelection(), Get-PhaseStatus(), Resolve-OwnedPointerBackup() (+6 more)

### Community 15 - "phase-status.sh"
Cohesion: 0.14
Nodes (13): glob, file_glob, kind, value, cases, assertions, judge, name (+5 more)

### Community 16 - "attest-plan.sh"
Cohesion: 0.29
Nodes (13): apply_v3_mode(), create_files_in(), gen_nonce(), inherit_root_mode(), print_v3_mode_status(), init-session.sh script, short_uuid(), slugify() (+5 more)

### Community 17 - "check-complete.sh script"
Cohesion: 0.19
Nodes (12): @azure/web-pubsub@^1.1.2, @azure/data-tables, @azure/web-pubsub, dependencies, axios@^1.7.9, @azure/data-tables@^13.2.2, @azure/web-pubsub@^1.1.2, description (+4 more)

### Community 18 - "init-session.ps1"
Cohesion: 0.17
Nodes (13): devDependencies, rimraf@^5.0.10, @types/node@^20.17.10, typescript@^5.6.3, rimraf, @types/node, typescript, devDependencies (+5 more)

### Community 19 - "plan-doctor.sh"
Cohesion: 0.35
Nodes (11): Assert-HandleParent(), Get-AttestationPath(), Open-SafeReadStream(), Open-TrustedDirectory(), Read-SafeText(), Remove-SafeFile(), Resolve-ContainedPlanFile(), Resolve-PlanFile() (+3 more)

### Community 20 - "resolve-plan-dir.ps1"
Cohesion: 0.42
Nodes (11): canonicalize(), is_windowsapps_path(), is_within_root(), mtime_of(), norm_slashes(), resolve_from_active_file(), resolve_from_env(), resolve_latest_dir() (+3 more)

### Community 21 - "check-complete.ps1"
Cohesion: 0.20
Nodes (11): dependencies, @azure/data-tables@^13.2.2, @azure/functions@^4.6.0, azure-iothub@^1.16.2, description, @azure/functions, main, name (+3 more)

### Community 22 - "main.cpp"
Cohesion: 0.17
Nodes (11): compilerOptions, esModuleInterop, forceConsistentCasingInFileNames, module, outDir, rootDir, skipLibCheck, sourceMap (+3 more)

### Community 23 - "ledger-append.ps1"
Cohesion: 0.17
Nodes (11): compilerOptions, esModuleInterop, forceConsistentCasingInFileNames, module, outDir, rootDir, skipLibCheck, sourceMap (+3 more)

### Community 24 - "phase-status.ps1"
Cohesion: 0.20
Nodes (6): is_dir(), mtime_seconds(), pin_is_absolute(), plan_is_ambiguous(), resolve_plan_dir(), strip_ws()

### Community 25 - "skill-hook.sh"
Cohesion: 0.18
Nodes (10): compilerOptions, allowSyntheticDefaultImports, lib, module, moduleResolution, noEmit, skipLibCheck, strict (+2 more)

### Community 26 - "emit_unavailable"
Cohesion: 0.38
Nodes (9): append_line(), iso_utc(), json_escape(), max_tick_in_dir(), resolve_plan_dir(), sanitize_agent(), ledger-append.sh script, usage() (+1 more)

### Community 27 - "gate-stop.sh"
Cohesion: 0.22
Nodes (3): head_lines(), line_count(), smart_plan_extract()

### Community 28 - "ledger-summary.ps1"
Cohesion: 0.39
Nodes (7): acquire_lock(), claim_lock_owner(), do_write(), resolve_plan_file(), rewrite(), phase-status.sh script, usage()

### Community 29 - "attest-plan.sh"
Cohesion: 0.50
Nodes (7): attestation_path_for(), compute_hash(), resolve_from_slug_cwd(), resolve_plan_file(), attest-plan.sh script, slug_is_valid(), usage_error()

### Community 30 - "diagram.json"
Cohesion: 0.29
Nodes (6): author, connections, dependencies, editor, parts, version

### Community 31 - "check-complete.sh script"
Cohesion: 0.60
Nodes (5): advisory_report(), first_in_progress_phase(), json_escape(), ledger_line_count(), check-complete.sh script

### Community 33 - "plan-doctor.sh"
Cohesion: 0.60
Nodes (5): fail(), info(), ok(), plan-doctor.sh script, warn()

### Community 35 - "scripts"
Cohesion: 0.33
Nodes (6): scripts, build, clean, prestart, start, watch

### Community 36 - "scripts"
Cohesion: 0.33
Nodes (6): scripts, build, clean, prestart, start, watch

### Community 40 - "skill-hook.sh"
Cohesion: 0.83
Nodes (3): select_python(), select_python_into_var(), skill-hook.sh script

### Community 41 - "scripts"
Cohesion: 0.50
Nodes (4): scripts, build, dev, preview

## Knowledge Gaps
- **9 isolated node(s):** `distanceCm`, `sensor`, `alarm`, `alarmSinceMs`, `armed` (+4 more)
  These have ≤1 connection - possible missing edges. (Counts symbols only; 229 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **9 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `typescript` connect `init-session.ps1` to `check-complete.sh script`, `ledger-append.sh`, `check-complete.ps1`?**
  _High betweenness centrality (0.017) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `App()` (e.g. with `.connect()` and `.disconnect()`) actually correct?**
  _`App()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `distanceCm`, `sensor`, `alarm` to the rest of the system?**
  _9 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `session-catchup.py` be split into smaller, more focused modules?**
  _Cohesion score 0.05450165612767239 - nodes in this community are weakly interconnected._
- **Why does `@types/node` connect `init-session.ps1` to `check-complete.sh script`, `ledger-append.sh`, `check-complete.ps1`?**
  _High betweenness centrality (0.017) - this node is a cross-community bridge._
- **Should `inject-plan.py` be split into smaller, more focused modules?**
  _Cohesion score 0.10256410256410256 - nodes in this community are weakly interconnected._
- **Why does `axios` connect `check-complete.sh script` to `._run`?**
  _High betweenness centrality (0.017) - this node is a cross-community bridge._