# Skill Testing Documentation

**Skill:** walkeros-create-source **Skill Type:** Workflow (step-by-step
process)

---

## Test Scenarios

### Scenario 1: Create Browser Event Source

**Task:** "Create a source that captures form submissions"

**Skill Coverage:**

| Step                 | Covered | Location                                |
| -------------------- | ------- | --------------------------------------- |
| Template selection   | ✅      | Choose Your Template                    |
| Browser patterns     | ✅      | Phase 2.2 (DOM interception), Phase 3.7 |
| Event listener setup | ✅      | Phase 7: Implement                      |
| Push to collector    | ✅      | Phase 7, Key Patterns 3 (`env.push`)    |

**Result:** ✅ PASS

---

### Scenario 2: Create Server-Side Source

**Task:** "Create a source that receives webhooks from Stripe"

**Skill Coverage:**

| Feature             | Covered | Location                              |
| ------------------- | ------- | ------------------------------------- |
| Server template     | ✅      | Choose Your Template                  |
| Request parsing     | ✅      | Phase 2.2 (HTTP handler), Phase 7 (6) |
| Event normalization | ✅      | Phase 4: Define Mapping               |

**Result:** ✅ PASS

---

### Scenario 3: Create DataLayer Source

**Task:** "Create a source that reads from Google Tag Manager dataLayer"

**Skill Coverage:**

| Feature           | Covered | Location                            |
| ----------------- | ------- | ----------------------------------- |
| DataLayer pattern | ✅      | Choose Your Template, Phase 5 (web) |
| Polling vs push   | ✅      | Phase 1.2, Call ordering            |

**Result:** ✅ PASS

---

## Verification Summary

| Scenario         | Type       | Result  |
| ---------------- | ---------- | ------- |
| Browser Source   | Happy Path | ✅ PASS |
| Server Source    | Variation  | ✅ PASS |
| DataLayer Source | Variation  | ✅ PASS |

**Overall:** Skill provides complete workflow guidance.
