# DeployGuard — Build Plan

## Data model (root cause of empty pages)
- [x] Push Verification, CheckResult, Evidence, Issue, ActivityEntry, ChangeRecord schemas (blocks-data-gateway-configuration)
- [x] Access rules for signed-in staff on all schemas (blocks-data-gateway-configuration)
- [x] Fix activity collection field name to match generated query (blocks-data-gateway-crud)

## Overview & deployments (T03)
- [x] Overview: environment cards with status, score, verified time (blocks-data-gateway-crud)
- [x] Deployments: grouped cards with status, score, verified time (blocks-data-gateway-crud)
- [x] Empty state 'No deployments yet' on both screens (plain UI)

## Verification report (T06)
- [x] Hero score ring, status word and summary line (plain UI)
- [x] Seven check rows, each opening its evidence (blocks-data-gateway-crud)

## History and issues (T09)
- [x] Verifications list newest first, row opens report (blocks-data-gateway-crud)
- [x] Issues list with deployment, check, line, date (blocks-data-gateway-crud)

## Analytics (T10)
- [x] Success rate, averages, failures, warnings, 7-day chart (blocks-data-gateway-crud)

## Wrap up
- [x] Check and build app