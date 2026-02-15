# Skill Testing Documentation

**Skill:** walkeros-create-cmp-source **Skill Type:** Workflow (step-by-step
process)

---

## Test Scenarios

### Scenario 1: Create Boolean-Map CMP Source (CookieFirst Pattern)

**Task:** "Create a CMP source for CookieFirst-style boolean-map consent"

**Skill Coverage:**

| Step                    | Covered | Location                         |
| ----------------------- | ------- | -------------------------------- |
| Research template       | ✅      | Phase 1, CMP research template   |
| Detection paths         | ✅      | Phase 1, Detection paths         |
| Example creation        | ✅      | Phase 2 + examples/              |
| Category mapping        | ✅      | Phase 3, populated default map   |
| TDD test structure      | ✅      | Phase 6 + templates/cmp/         |
| Implementation skeleton | ✅      | Phase 7 + templates/cmp/index.ts |
| Documentation           | ✅      | Phase 8, README structure        |
| Mandatory checks        | ✅      | All 10 checks                    |

**Result:** ✅ PASS

---

### Scenario 2: Create Presence-Based CMP Source (CookiePro Pattern)

**Task:** "Create a CMP source for CookiePro where consent is comma-separated
IDs like `,C0001,C0003,`"

**Skill Coverage:**

| Feature                       | Covered | Location                              |
| ----------------------------- | ------- | ------------------------------------- |
| Decision matrix (CookiePro)   | ✅      | Phase 1, Decision matrix              |
| Opaque ID mapping             | ✅      | Phase 3, populated default map        |
| Explicit false initialization | ✅      | Mandatory check #1 (presence-based)   |
| Dual-firing prevention        | ✅      | Mandatory check #4 (Pattern A)        |
| Callback wrapping/unwrapping  | ✅      | Phase 7 + templates/cmp/index.ts TODO |

**Result:** ✅ PASS

---

### Scenario 3: Create Callback-Based CMP Source (Non-DOM Events)

**Task:** "Create a CMP source for a CMP that uses callback assignment instead
of addEventListener"

**Skill Coverage:**

| Feature                  | Covered | Location                          |
| ------------------------ | ------- | --------------------------------- |
| Event registration table | ✅      | Phase 1, Event registration       |
| Adapted MockWindow       | ✅      | Phase 6, templates/cmp/test-utils |
| Destroy cleanup          | ✅      | Templates + mandatory check #9    |
| Known limitations        | ✅      | Known limitations table           |

**Result:** ✅ PASS

---

### Scenario 4: Consent Revocation Edge Case

**Task:** "Verify CMP source handles full consent then revocation correctly"

**Skill Coverage:**

| Feature                 | Covered | Location                    |
| ----------------------- | ------- | --------------------------- |
| Revocation input        | ✅      | examples/inputs.ts          |
| Explicit false outputs  | ✅      | examples/outputs.ts         |
| Revocation test pattern | ✅      | templates/cmp/index.test.ts |
| Mandatory check #1      | ✅      | Mandatory checks section    |
| Mandatory check #6      | ✅      | Mandatory checks section    |

**Result:** ✅ PASS

---

## Verification Summary

| Scenario           | Type       | Result  |
| ------------------ | ---------- | ------- |
| Boolean-Map CMP    | Happy Path | ✅ PASS |
| Presence-Based CMP | Variation  | ✅ PASS |
| Callback-Based CMP | Variation  | ✅ PASS |
| Consent Revocation | Edge Case  | ✅ PASS |

**Overall:** Skill provides complete workflow guidance with supporting files.
