<!--
CRITICAL: STEELIQ PROJECT ROOT DOCUMENT

FOR ANY AI / AUTOMATED TOOL (INCLUDING REPLIT AGENT):

1. THIS FILE IS PRIMARILY READ-ONLY.
2. YOU MUST NOT:
   - DELETE, TRUNCATE, OR OVERWRITE ANY TEXT ABOVE THE SECTION
     "15. Agent Working Notes (ONLY SECTION AGENTS MAY EDIT)"
   - RENAME HEADINGS OR REFORMAT THIS DOCUMENT
3. YOU MAY ONLY APPEND SHORT BULLET POINTS UNDER THAT SECTION,
   AND ONLY WHEN THE HUMAN USER EXPLICITLY ASKS YOU TO UPDATE replit.md.
4. IF YOU BELIEVE THIS FILE SHOULD BE UPDATED, YOU MUST:
   - DESCRIBE THE PROPOSED CHANGE IN CHAT
   - WAIT FOR EXPLICIT HUMAN APPROVAL
   - LET THE HUMAN APPLY THE CHANGE OR EXPLICITLY INSTRUCT YOU TO DO SO
5. YOU MUST TREAT THE GOVERNANCE FRAMEWORK DOCUMENT AS AUTHORITATIVE:
   "STEELIQ_Enterprise_Control_Framework_Governance_v2.0.md"
   DO NOT GUESS OR INVENT GOVERNANCE RULES. READ THEM THERE.

FAILURE TO FOLLOW THESE RULES IS A GOVERNANCE VIOLATION.
-->

# STEELIQ – Enterprise Steel Fabrication & Procurement Platform

## 0. Document Purpose

This file is the **human-owned, authoritative overview** for the STEELIQ application.

- It describes **what the system is**, **how it is governed**, and **how to work on it**.
- Detailed governance, control requirements, and deployment rules live in:  
  **`STEELIQ_Enterprise_Control_Framework_Governance_v2.0.md`**

> **AI agents:** This document is **not your scratchpad**.  
> You may read it for context, but you must not change anything except the final “Agent Working Notes” section, and only when the user explicitly asks.

---

## 1. Platform Purpose & Vision

STEELIQ is an enterprise platform built for **Lateral Engineering Limited (New Zealand)** to manage the complete steel fabrication lifecycle from initial client inquiry through to final delivery, with **Fortune‑50‑grade governance and controls**.

**Core business problems solved:**

- AI-powered estimation from drawings (PDF/DXF)
- End‑to‑end procurement (RFQs, quotes, POs, receiving)
- Production tracking from quote → job → delivery
- Time, attendance, GPS‑validated payroll
- Compliance with AS/NZS steel fabrication standards
- Full auditability for SOX 302/404 and ITGC

---

## 2. Governance Anchor (READ THIS FIRST)

**Authoritative governance document:**

- **File:** `STEELIQ_Enterprise_Control_Framework_Governance_v2.0.md`
- **Standards:** SOX 302/404, TOGAF 10, COBIT 2024, ITGC, NIST‑aligned

### 2.1 Mandatory Rules Before Any Code Change

Before making ANY non‑trivial change (feature, schema, service, or integration):

1. **Check the governance framework** section relevant to your change:
   - TOGAF (ADM) phase
   - COBIT maturity requirements
   - SOX / ITGC controls
   - Deployment gates and rollback validation
2. Ensure a **feature manifest** exists:  
   `server/manifests/{feature-name}.manifest.json`
3. Run the **pre‑flight check**:

   ```http
   GET /api/system/pre-flight-check?feature={featureName}
