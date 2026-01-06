# Task List

- [ ] Create `docs/TESTING_PHASES.md` as requested to document the testing strategy. <!-- id: 0 -->
- [/] Create `docs/ISSUES.md` to list current issues. <!-- id: 1 -->
- [ ] Verify and update `backend/arduino/tests/bmi_test/bmi_test.ino` for the BMI phase. <!-- id: 2 -->
- [ ] Verify `backend/arduino/tests/bodytemp_test/bodytemp_test.ino` (create/update if needed). <!-- id: 3 -->
- [ ] Verify `backend/arduino/tests/max30102_test/max30102_test.ino` (create/update if needed). <!-- id: 4 -->
- [ ] Review `backend/arduino/all_sensors/all_sensors.ino` to ensure it correctly implements the slave mode for all phases (BMI, Temp, MAX30102). <!-- id: 5 -->
- [ ] Ensure "Kiosk Mode" behavior (Slave mode, On/Off commands) is robust in `all_sensors.ino`. <!-- id: 6 -->
- [ ] Debug: Fix BMI frontend data reflection and saving. <!-- id: 8 -->
- [ ] Debug: Fix BodyTemp frontend data reflection and saving. <!-- id: 9 -->
- [ ] Debug: Fix MAX30102 frontend data reflection and saving. <!-- id: 10 -->
- [ ] Verify `BodyTemp.jsx` sensor shutdown logic. <!-- id: 11 -->
- [ ] Optimize `Max30102.jsx` command logic. <!-- id: 12 -->
- [ ] Fix `Standby.jsx` to shutdown ALL sensors (including Temp/Max/BP) on reset. <!-- id: 13 -->
- [ ] Verify `InactivityWrapper` triggers robust cleanup. <!-- id: 14 -->
- [ ] Verify "Exit" buttons on measurement pages trigger sensor shutdown. <!-- id: 15 -->
- [ ] Update `docs/FOLDER_STRUCTURE.md` to match reality. <!-- id: 7 -->
