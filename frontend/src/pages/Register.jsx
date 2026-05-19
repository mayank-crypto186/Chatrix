import React from "react";
import { Link } from "react-router-dom";
import "../styles/Auth.css";

function Register() {
  return (
    <div className="auth-page">
      <div className="auth-card">
        <h2>Create Account 🚀</h2>
        <p>Register to start chatting on Chatrix</p>

        <form>
          <div className="input-group">
            <label>Full Name</label>
            <input type="text" placeholder="Enter your full name" required />
          </div>

          <div className="input-group">
            <label>Email</label>
            <input type="email" placeholder="Enter your email" required />
          </div>

          <div className="input-group">
            <label>Password</label>
            <input type="password" placeholder="Create password" required />
          </div>

          <div className="input-group">
            <label>Confirm Password</label>
            <input type="password" placeholder="Confirm password" required />
          </div>

          <button type="submit" className="auth-btn">
            Register
          </button>
        </form>

        <p className="switch-text">
          Already have an account? <Link to="/login">Login</Link>
        </p>
      </div>
    </div>
  );
}

export default Register;