# Skill Testing Documentation

**Skill:** walkeros-debugging **Skill Type:** Troubleshooting guide

---

## Test Scenarios

### Scenario 1: Events Not Reaching Destination

**Task:** "My GA4 destination isn't receiving any events"

**Expected Debugging Flow:**

1. Check if events are being created (source)
2. Check if collector is receiving events
3. Check if destination is configured
4. Check mapping configuration
5. Check consent requirements

**Skill Coverage:**

| Check               | Covered | Location                 |
| ------------------- | ------- | ------------------------ |
| Source verification | ✅      | Source debugging section |
| Collector logging   | ✅      | Collector section        |
| Destination config  | ✅      | Destination section      |
| Mapping issues      | ✅      | Mapping section          |
| Consent blocking    | ✅      | Consent section          |

**Result:** ✅ PASS

---

### Scenario 2: Events Malformed

**Task:** "Events are reaching the destination but data is wrong"

**Skill Coverage:**

| Check              | Covered | Location        |
| ------------------ | ------- | --------------- |
| Event structure    | ✅      | Event debugging |
| Mapping transforms | ✅      | Mapping section |
| Type coercion      | ✅      | Common issues   |

**Result:** ✅ PASS

---

### Scenario 3: Intermittent Failures

**Task:** "Events sometimes work but not always"

**Skill Coverage:**

| Check           | Covered | Location           |
| --------------- | ------- | ------------------ |
| Race conditions | ✅      | Timing issues      |
| Consent state   | ✅      | Consent section    |
| Network issues  | ✅      | Destination errors |

**Result:** ✅ PASS

---

## Verification Summary

| Scenario     | Type      | Result  |
| ------------ | --------- | ------- |
| No Events    | Common    | ✅ PASS |
| Malformed    | Common    | ✅ PASS |
| Intermittent | Edge Case | ✅ PASS |

**Overall:** Skill provides comprehensive troubleshooting guidance.
