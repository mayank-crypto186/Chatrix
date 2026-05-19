import React from "react";
import { Link } from "react-router-dom";
import "../styles/Auth.css";

function ForgotPassword() {
  return (
    <div className="auth-page">
      <div className="auth-card">
        <h2>Forgot Password?</h2>
        <p>Enter your email to receive reset instructions.</p>

        <form>
          <div className="input-group">
            <label>Email</label>
            <input type="email" placeholder="Enter your email" required />
          </div>

          <button type="submit" className="auth-btn">
            Send Reset Link
          </button>
        </form>

        <p className="switch-text">
          Remembered password? <Link to="/login">Back to Login</Link>
        </p>
      </div>
    </div>
  );
}

export default ForgotPassword;