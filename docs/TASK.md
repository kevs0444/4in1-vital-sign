# 4-in-1 Vital Sign Kiosk - Master Task & Context Document

> **[!] CRITICAL AI INSTRUCTION (DO NOT IGNORE)**
> To all AI Assistants / Agents (including Antigravity):
> 1. Do NOT hallucinate tasks, plans, or project states.
> 2. This `task.md` file is the SINGLE and ONLY source of truth for the project's documentation in the `docs` folder.
> 3. Do not reference or look for any other `.md` files in this directory (they have been permanently deleted).
> 4. Do not invent features or tasks that are not explicitly listed here or specifically requested by the user.
> 5. Rely exactly on what the user asks and what is currently present in the codebase.

## Current Pending Tasks
- [ ] Ensure "Kiosk Mode" behavior (Slave mode, On/Off commands) is robust in `backend/arduino/all_sensors/all_sensors.ino`.
- [x] In kiosk mode make the exit modal pop out 3 options (Cancel, Log Out, Continue Measurement) in `DashboardLayout.jsx` only.
- [x] Update Juan AI from XGBClassifier to XGBRegressor for granular 0-100 risk scores (`train_model.py`, `juan_ai_routes.py`).
- [x] Rewrite `generate_dataset.py` with doctor-level scoring (proportional penalties, combinatorial risk, age-adjusted, RRL-aligned thresholds from `healthStatus.js`).
- [x] Align BMI thresholds to Asian Standards (WHO Asia-Pacific: Overweight 23, Obese >=25).
- [x] Change minimum patient age from 18 to 16 in dataset + backend.
- [x] Remove decimal from risk score output (whole numbers only).
- [x] Fix "Neural Network" label to "XGBoost Engine" in `AILoading.jsx`.
- [x] Add `Math.round()` safety to risk score display in `Result.jsx`.
- [x] Make Email/Print action cards compact (one row, horizontal layout) in `Sharing.jsx` / `Sharing.css`.
- [x] Fix email button internet check: replaced unreliable `navigator.onLine` with real connectivity ping to backend in `Sharing.jsx`. Shows "No Internet" popup when offline.

*(All previous testing phases, database plans, and implementation guides have been completed and their respective documents cleared to avoid confusion. Focus strictly on the active goals provided by the user in the current session.)*

