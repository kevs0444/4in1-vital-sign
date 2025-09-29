import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import "./Login.css";
import logo from "../../assets/logo.png";

export default function Login() {
  const navigate = useNavigate();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [vh, setVh] = useState(window.innerHeight);
  
  // Idle timer reference
  const idleTimerRef = useRef(null);
  const IDLE_TIMEOUT = 30000; // 30 seconds

  // Automatically capitalize first letter
  const capitalize = (str) =>
    str.charAt(0).toUpperCase() + str.slice(1);

  const handleFirstNameChange = (e) => setFirstName(capitalize(e.target.value));
  const handleLastNameChange = (e) => setLastName(capitalize(e.target.value));

  const handleMobileChange = (e) => {
    const value = e.target.value.replace(/\D/g, ""); // allow only digits
    if (value.length <= 11) setMobile(value);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log({ firstName, lastName, email, mobile });
    // Clear the idle timer when submitting
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
    }
    
    // Navigate to Welcome page with user data
    navigate("/welcome", { 
      state: { 
        firstName: firstName,
        lastName: lastName,
        email: email,
        mobile: mobile
      }
    });
  };

  // Reset idle timer on user interaction - useCallback to memoize the function
  const resetIdleTimer = useCallback(() => {
    // Clear existing timer
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
    }
    
    // Set new timer
    idleTimerRef.current = setTimeout(() => {
      navigate("/");
    }, IDLE_TIMEOUT);
  }, [navigate]);

  // Handle window resize for mobile keyboard
  useEffect(() => {
    const handleResize = () => {
      setVh(window.innerHeight);
      resetIdleTimer(); // Reset timer on resize (keyboard open/close)
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [resetIdleTimer]);

  // Set up idle timer and event listeners
  useEffect(() => {
    // Start the initial timer
    resetIdleTimer();

    // Add event listeners for user interactions
    const events = ["mousedown", "mousemove", "keypress", "scroll", "touchstart", "click", "input"];
    
    events.forEach(event => {
      document.addEventListener(event, resetIdleTimer, true);
    });

    // Cleanup function
    return () => {
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
      }
      
      events.forEach(event => {
        document.removeEventListener(event, resetIdleTimer, true);
      });
    };
  }, [resetIdleTimer]);

  return (
    <div
      className="login-container"
      style={{
        height: vh,
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-start",
        alignItems: "center",
        padding: "1rem",
        boxSizing: "border-box",
        background: "linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)",
      }}
    >
      <div
        className="login-card"
        style={{
          height: "70vh", // Back to 70vh
          minHeight: "500px",
          width: "95%",
          maxWidth: "600px",
          padding: "2rem 2rem", // Adjusted padding
          overflowY: "auto",
          boxSizing: "border-box",
          borderRadius: "1.5rem",
          background: "#fff",
          boxShadow: "0 20px 50px rgba(220,53,69,0.2)",
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-start",
        }}
      >
        <div className="login-logo" style={{ textAlign: "center", marginBottom: "1rem" }}>
          <img
            src={logo}
            alt="Logo"
            style={{ 
              width: "100px", 
              height: "100px", 
              marginBottom: "0.5rem",
              borderRadius: "50%",
              boxShadow: "0 8px 25px rgba(220,53,69,0.2)"
            }}
          />
        </div>
        
        <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
          <h2
            className="login-title"
            style={{ 
              fontSize: "2.2rem", 
              color: "#dc3545", 
              fontWeight: "700",
              marginBottom: "0.5rem"
            }}
          >
            User Registration
          </h2>
          <p
            className="login-subtitle"
            style={{ 
              fontSize: "1.1rem", 
              color: "#666", 
              marginBottom: "0"
            }}
          >
            Fill your details to continue
          </p>
        </div>

        <form
          className="login-form"
          onSubmit={handleSubmit}
          style={{ 
            display: "flex", 
            flexDirection: "column", 
            flex: 1,
          }}
        >
          <div className="form-group" style={{ marginBottom: "1.5rem" }}>
            <label style={{ fontSize: "1rem", fontWeight: "600", marginBottom: "0.5rem" }}>First Name</label>
            <input
              type="text"
              placeholder="Juan"
              value={firstName}
              onChange={handleFirstNameChange}
              required
              autoFocus
              style={{
                fontSize: "1rem",
                padding: "0.8rem 1rem",
                border: "2px solid #dc3545",
                borderRadius: "10px",
                marginBottom: "0.3rem"
              }}
            />
          </div>

          <div className="form-group" style={{ marginBottom: "1.5rem" }}>
            <label style={{ fontSize: "1rem", fontWeight: "600", marginBottom: "0.5rem" }}>Last Name</label>
            <input
              type="text"
              placeholder="Dela Cruz"
              value={lastName}
              onChange={handleLastNameChange}
              required
              style={{
                fontSize: "1rem",
                padding: "0.8rem 1rem",
                border: "2px solid #dc3545",
                borderRadius: "10px",
                marginBottom: "0.3rem"
              }}
            />
          </div>

          <div className="form-group" style={{ marginBottom: "1.5rem" }}>
            <label style={{ fontSize: "1rem", fontWeight: "600", marginBottom: "0.5rem" }}>
              Email <span className="optional">(Optional)</span>
            </label>
            <input
              type="email"
              placeholder="4in1Vital@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{
                fontSize: "1rem",
                padding: "0.8rem 1rem",
                border: "2px solid #dc3545",
                borderRadius: "10px",
                marginBottom: "0.3rem"
              }}
            />
            <small className="helper-text" style={{ fontSize: "0.85rem" }}>
              Email will receive your results after using the system.
            </small>
          </div>

          <div className="form-group" style={{ marginBottom: "2rem" }}>
            <label style={{ fontSize: "1rem", fontWeight: "600", marginBottom: "0.5rem" }}>
              Mobile Number (PH) <span className="optional">(Optional)</span>
            </label>
            <input
              type="tel"
              placeholder="09XXXXXXXXX"
              pattern="09[0-9]{9}"
              inputMode="numeric"
              value={mobile}
              onChange={handleMobileChange}
              style={{
                fontSize: "1rem",
                padding: "0.8rem 1rem",
                border: "2px solid #dc3545",
                borderRadius: "10px",
                marginBottom: "0.3rem"
              }}
            />
            <small className="helper-text" style={{ fontSize: "0.85rem" }}>
              SMS will receive your results after using the system.
            </small>
          </div>

          <button
            type="submit"
            className="login-button"
            style={{ 
              marginTop: "auto", 
              padding: "1rem 1.5rem", 
              fontSize: "1.2rem",
              fontWeight: "600",
              borderRadius: "12px",
              border: "none",
              background: "linear-gradient(135deg, #dc3545, #c82333)",
              color: "white",
              cursor: "pointer",
              transition: "all 0.3s ease",
              boxShadow: "0 8px 25px rgba(220,53,69,0.3)",
              minHeight: "55px"
            }}
            onMouseOver={(e) => {
              e.target.style.transform = "translateY(-2px)";
              e.target.style.boxShadow = "0 12px 30px rgba(220,53,69,0.4)";
            }}
            onMouseOut={(e) => {
              e.target.style.transform = "translateY(0)";
              e.target.style.boxShadow = "0 8px 25px rgba(220,53,69,0.3)";
            }}
          >
            REGISTER AND CONTINUE
          </button>
        </form>
      </div>

      {/* Bottom 30% reserved for OS keyboard pop-out */}
      <div style={{ 
        height: "30vh", // Back to 30vh
        width: "100%",
        minHeight: "150px"
      }}></div>
    </div>
  );
}