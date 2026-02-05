# Skill Testing Documentation

**Skill:** walkeros-create-source **Skill Type:** Workflow (step-by-step
process)

---

## Test Scenarios

### Scenario 1: Create Browser Event Source

**Task:** "Create a source that captures form submissions"

**Skill Coverage:**

| Step                 | Covered | Location               |
| -------------------- | ------- | ---------------------- |
| Template selection   | ✅      | Choose Your Template   |
| Browser patterns     | ✅      | Browser source section |
| Event listener setup | ✅      | Implementation phase   |
| Push to collector    | ✅      | Phase 4                |

**Result:** ✅ PASS

---

### Scenario 2: Create Server-Side Source

**Task:** "Create a source that receives webhooks from Stripe"

**Skill Coverage:**

| Feature             | Covered | Location              |
| ------------------- | ------- | --------------------- |
| Server template     | ✅      | Choose Your Template  |
| Request parsing     | ✅      | Server source section |
| Event normalization | ✅      | Mapping section       |

**Result:** ✅ PASS

---

### Scenario 3: Create DataLayer Source

**Task:** "Create a source that reads from Google Tag Manager dataLayer"

**Skill Coverage:**

| Feature           | Covered | Location          |
| ----------------- | ------- | ----------------- |
| DataLayer pattern | ✅      | DataLayer section |
| Polling vs push   | ✅      | DataLayer section |

**Result:** ✅ PASS

---

## Verification Summary

| Scenario         | Type       | Result  |
| ---------------- | ---------- | ------- |
| Browser Source   | Happy Path | ✅ PASS |
| Server Source    | Variation  | ✅ PASS |
| DataLayer Source | Variation  | ✅ PASS |

**Overall:** Skill provides complete workflow guidance.
