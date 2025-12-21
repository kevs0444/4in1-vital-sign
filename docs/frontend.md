# Frontend Documentation

## 1. Getting Started

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

### Available Scripts

In the project directory, you can run:

#### `npm start`
Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in your browser.\
The page will reload when you make changes. You may also see any lint errors in the console.

#### `npm test`
Launches the test runner in the interactive watch mode.

#### `npm run build`
Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

## 2. Component Analysis

### Login Page (`Login.jsx`, `Login.css`)

**Architecture Overview:**
The Login page implements a **3-section vertical layout** optimized for a **768x1366 touchscreen**:
- **RFID Card Section (15%)**: Red gradient, scanner status.
- **Manual Login Form (55%)**: White, form inputs + custom keyboard.
- **Virtual Keyboard (30%)**: Custom on-screen keyboard.

**Key Features:**

1.  **Dual Authentication Modes:**
    *   **RFID Scanner (Passive):** Global keydown listener captures all scanner input. Numeric processing with timeout.
    *   **Manual Login (Active):** School Number + Password fields using a custom virtual keyboard (no native keyboard popup). InputMode is "none".

2.  **Touchscreen Optimizations:**
    *   `user-scalable=no`, `user-select: none`.
    *   Large touch targets (min 55-75px).
    *   Touch gestures disabled (`touchstart`, `gesturestart`).

3.  **Virtual Keyboard System:**
    *   Supports **Alphabet Mode** and **Symbol Mode**.
    *   Custom handlers for Shift, Backspace, and layout switching.

4.  **Security Features:**
    *   **Password masking:** Toggle visibility, defaults to hidden.
    *   **Input sanitization:** Backend validates credentials.
    *   **Max password length:** 10 characters.
    *   **Error Modal:** Modern glassmorphism design with click-outside-to-close.

### Forgot Password (`ForgotPassword.jsx`)

**Security Features:**
*   **Virtual Keyboard:** Prevents keylogging and ensures touchscreen usability.
*   **Native Keyboard Blocked:** `readOnly`, `inputMode="none"`.
*   **Email Masking:** Shows `ma****@gmail.com`.
*   **OTP Handling:** Clean UI for entering 6-digit OTPs.

## 3. Configuration & Optimization

### Proxy Configuration (HMR Fix)

To fix Webpack HMR 404 errors in Flask logs, a `setupProxy.js` is used instead of the simple `package.json` proxy.

**`src/setupProxy.js` Rules:**
1.  **API requests** → Forward to Flask backend (127.0.0.1:5000).
2.  **HMR requests** → Forward to Webpack dev server (localhost:3000).
3.  **Logging**: Set to `silent`.

### Performance Optimizations
1.  **Debounced RFID processing:** 100ms timeout prevents excessive API calls.
2.  **Event listener cleanup:** `useEffect` returns remove listeners.
3.  **CSS transitions:** All animations use `transform`.
4.  **Lazy error modal:** Only renders when active.
