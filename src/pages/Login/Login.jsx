import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import logo from "../../assets/images/logo.png";
import "./Login.css";

export default function Login() {
  const navigate = useNavigate();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState(""); // Store only the last 9 digits
  const [vh, setVh] = useState(window.innerHeight);

  const idleTimerRef = useRef(null);
  const IDLE_TIMEOUT = 30000; // 30 seconds

  const capitalize = (str) => str.charAt(0).toUpperCase() + str.slice(1);

  const handleFirstNameChange = (e) => setFirstName(capitalize(e.target.value));
  const handleLastNameChange = (e) => setLastName(capitalize(e.target.value));

  const handleMobileChange = (e) => {
    const value = e.target.value.replace(/\D/g, "");
    if (value.length <= 9) {
      setMobile(value);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const fullMobileNumber = "09" + mobile; // Combine to get full 11-digit number
    
    console.log({ firstName, lastName, email, mobile: fullMobileNumber });

    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);

    navigate("/welcome", {
      state: { firstName, lastName, email, mobile: fullMobileNumber },
    });
  };

  const resetIdleTimer = useCallback(() => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(() => {
      navigate("/");
    }, IDLE_TIMEOUT);
  }, [navigate]);

  useEffect(() => {
    const handleResize = () => {
      setVh(window.innerHeight);
      resetIdleTimer();
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [resetIdleTimer]);

  useEffect(() => {
    resetIdleTimer();
    const events = [
      "mousedown",
      "mousemove",
      "keypress",
      "scroll",
      "touchstart",
      "click",
      "input",
    ];
    events.forEach((event) =>
      document.addEventListener(event, resetIdleTimer, true)
    );

    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      events.forEach((event) =>
        document.removeEventListener(event, resetIdleTimer, true)
      );
    };
  }, [resetIdleTimer]);

  const formatMobileDisplay = (digits) => {
    if (!digits) return "";
    if (digits.length <= 3) return digits;
    if (digits.length <= 6)
      return `${digits.substring(0, 3)} ${digits.substring(3)}`;
    return `${digits.substring(0, 3)} ${digits.substring(3, 6)} ${digits.substring(6)}`;
  };

  return (
    <div className="login-container" style={{ height: vh }}>
      <div className="login-content">
        <div className="login-card">
          <div className="login-logo">
            <img src={logo} alt="Logo" />
          </div>

          <div className="login-header">
            <h2 className="login-title">User Registration</h2>
            <p className="login-subtitle">Fill your details to continue</p>
          </div>

          <form className="login-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label>First Name</label>
              <input
                type="text"
                placeholder="Juan"
                value={firstName}
                onChange={handleFirstNameChange}
                required
                autoFocus
              />
            </div>

            <div className="form-group">
              <label>Last Name</label>
              <input
                type="text"
                placeholder="Dela Cruz"
                value={lastName}
                onChange={handleLastNameChange}
                required
              />
            </div>

            <div className="form-group">
              <label>
                Email <span className="optional">(Optional)</span>
              </label>
              <input
                type="email"
                placeholder="4in1Vital@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <small className="helper-text">
                Email will receive your results after using the system.
              </small>
            </div>

            <div className="form-group">
              <label>
                Mobile Number (PH) <span className="optional">(Optional)</span>
              </label>
              <div className="mobile-input-container">
                <div className="mobile-prefix">09</div>
                <input
                  type="tel"
                  className="mobile-input"
                  placeholder="123 456 789"
                  value={formatMobileDisplay(mobile)}
                  onChange={handleMobileChange}
                  inputMode="numeric"
                />
              </div>
              <small className="helper-text">
                {mobile.length === 0
                  ? "Enter your 9-digit mobile number"
                  : `${9 - mobile.length} digits remaining`}
              </small>
            </div>

            <button type="submit" className="login-button">
              REGISTER AND CONTINUE
            </button>
          </form>
        </div>

        <div className="keyboard-space"></div>
      </div>
    </div>
  );
}