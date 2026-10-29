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

| Check               | Covered | Location                                      |
| ------------------- | ------- | --------------------------------------------- |
| Source verification | ✅      | Quick Diagnosis, Does the CMP Source Send ... |
| Collector logging   | ✅      | 1. Console Logging                            |
| Destination config  | ✅      | Simulated Destination Recorded Nothing        |
| Mapping issues      | ✅      | Event Name Mismatch, Missing Nested Data      |
| Consent blocking    | ✅      | Consent Blocking Events                       |

**Result:** ✅ PASS

---

### Scenario 2: Events Malformed

**Task:** "Events are reaching the destination but data is wrong"

**Skill Coverage:**

| Check              | Covered   | Location                                 |
| ------------------ | --------- | ---------------------------------------- |
| Event structure    | ✅        | Missing Nested Data                      |
| Mapping transforms | ✅        | Event Name Mismatch, 4. Simulate or Mock |
| Type coercion      | ⚠️ Partly | Function Mapping Errors (a fallback)     |

**Result:** ✅ PASS

---

### Scenario 3: Intermittent Failures

**Task:** "Events sometimes work but not always"

**Skill Coverage:**

| Check           | Covered | Location                                     |
| --------------- | ------- | -------------------------------------------- |
| Race conditions | ✅      | Vendor SDK Not Loaded                        |
| Consent state   | ✅      | Consent Blocking Events, pending in simulate |
| Network issues  | ✅      | 2. Network Tab Inspection                    |

**Result:** ✅ PASS

---

## Verification Summary

| Scenario     | Type      | Result  |
| ------------ | --------- | ------- |
| No Events    | Common    | ✅ PASS |
| Malformed    | Common    | ✅ PASS |
| Intermittent | Edge Case | ✅ PASS |

**Overall:** Skill provides comprehensive troubleshooting guidance.
