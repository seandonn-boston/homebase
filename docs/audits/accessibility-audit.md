# Accessibility Audit for Dashboard (X-18)

> WCAG 2.1 Level AA audit of the control plane dashboard

**Last updated:** 2026-04-09

---

## Scope

The control plane dashboard is served at `http://localhost:4510/` and provides a real-time view of agent events, alerts, and system health. This audit covers keyboard navigation, screen reader compatibility, color contrast, and focus management.

## Current Implementation

The dashboard is a single HTML page rendered by `control-plane/src/server.ts` with inline CSS and minimal JavaScript. It uses semantic HTML elements.

## WCAG 2.1 Level AA Checklist

### Perceivable

| Criterion | Status | Notes |
|---|---|---|
| 1.1.1 Non-text content | Pass | Dashboard is primarily text-based |
| 1.3.1 Info and relationships | Pass | Uses semantic HTML (headings, tables, lists) |
| 1.3.2 Meaningful sequence | Pass | DOM order matches visual order |
| 1.4.1 Use of color | Needs improvement | Alert severity uses color only — add text labels |
| 1.4.3 Contrast (minimum) | Needs verification | Inline styles should be checked against 4.5:1 ratio |
| 1.4.4 Resize text | Pass | No fixed font sizes |

### Operable

| Criterion | Status | Notes |
|---|---|---|
| 2.1.1 Keyboard | Needs improvement | Interactive elements need tabindex and keyboard handlers |
| 2.1.2 No keyboard trap | Pass | No modal dialogs or focus traps |
| 2.4.1 Bypass blocks | Needs improvement | Add skip-to-content link |
| 2.4.2 Page titled | Pass | Title set in HTML |
| 2.4.3 Focus order | Needs verification | Tab order should follow visual flow |
| 2.4.7 Focus visible | Needs improvement | Add visible focus indicators (outline styles) |

### Understandable

| Criterion | Status | Notes |
|---|---|---|
| 3.1.1 Language of page | Pass | `lang="en"` attribute present |
| 3.2.1 On focus | Pass | No unexpected context changes on focus |
| 3.3.1 Error identification | Pass | Error states displayed as text |

### Robust

| Criterion | Status | Notes |
|---|---|---|
| 4.1.1 Parsing | Pass | Valid HTML structure |
| 4.1.2 Name, role, value | Needs improvement | Add ARIA labels to dynamic content areas |

## Remediation Plan

### Priority 1 (High Impact)
1. Add text labels alongside color-coded alert severities
2. Add visible focus indicators (CSS outline) for all interactive elements
3. Add skip-to-content navigation link

### Priority 2 (Medium Impact)
4. Add ARIA labels to dynamic content regions (event stream, alerts panel)
5. Verify all color combinations meet 4.5:1 contrast ratio
6. Add keyboard shortcuts for common actions (refresh, filter)

### Priority 3 (CI Integration)
7. Add axe-core as a dev dependency
8. Create accessibility test that runs axe against the dashboard HTML
9. Add to CI pipeline as a non-blocking check

## axe-core Integration

```bash
# Future CI integration (requires axe-core package)
# npm install --save-dev @axe-core/cli
# npx axe http://localhost:4510 --tags wcag2aa
```
