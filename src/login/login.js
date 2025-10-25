// src/components/Login.js
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Alert } from "@mui/material";

export default function Login() {
  const [isOpen, setIsOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  // Remove role state
  // const [role, setRole] = useState("OKU User");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  // Auto-hide error after 3 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(""), 3000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const response = await fetch("http://localhost/first-project1/backend/login.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (data.message !== "Login successful") {
        setError(data.message);
        setEmail("");
        setPassword("");
        return;
      }

      // ✅ Use role from backend, remove manual selection
      const resolvedRole = (data.userType || "").trim();
      if (!resolvedRole) {
        setError("User type not found for this email. Please contact admin.");
        return;
      }

      const userData = {
        name: data.name,
        email: data.email,
        role: resolvedRole,
      };
      localStorage.setItem("user", JSON.stringify(userData));

      if (resolvedRole === "Driver") {
        localStorage.setItem("driver_email", data.email);
      }

      alert(`Logged in as ${resolvedRole}: ${data.name}`);
      setIsOpen(false);

      if (resolvedRole === "OKU User") {
        navigate("/PassengerDashboard");
      } else if (resolvedRole === "Driver") {
        navigate("/Driver");
      } else if (resolvedRole === "Company Admin") {
        navigate("/Admin");
      } else if (resolvedRole === "JKM Officer") {
        navigate("/OfficerDashboard");
      }
    } catch (err) {
      console.error(err);
      setError("Server error. Please try again.");
      setEmail("");
      setPassword("");
    }
  };

  return (
    <>
      {/* Tailwind Keyframes for fade-in */}
      <style>
        {`
          @keyframes fadein {
            from { opacity: 0; transform: translateY(-20px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}
      </style>

      {/* Login Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="bg-blue-600 text-white font-medium px-4 py-2 rounded-lg shadow hover:bg-blue-700 transition-all duration-300 hover:-translate-y-0.5"
      >
        Login
      </button>

      {/* Login Modal */}
      <div
        className={`fixed inset-0 flex items-center justify-center z-50
          bg-black/30 backdrop-blur-sm
          transition-opacity duration-500
          ${isOpen ? "opacity-100" : "opacity-0 pointer-events-none"}`}
      >
        <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-lg w-full max-w-md p-6">
          {/* Close button */}
          <button
            onClick={() => setIsOpen(false)}
            className="absolute top-3 right-3 text-2xl font-bold text-gray-500 hover:text-gray-700"
          >
            ×
          </button>

          {/* Error popup */}
          {error && (
            <Alert
              severity="error"
              className="mb-4"
              style={{ animation: "fadein 0.5s ease-out" }}
            >
              {error}
            </Alert>
          )}

          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            Sign in to your account
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                Email
              </label>
              <input
                type="text"
                placeholder="email@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-2.5 border rounded-lg bg-gray-50 dark:bg-gray-700 dark:text-white"
                required
              />
            </div>

            {/* Password */}
            <div>
              <label className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                Password
              </label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-2.5 border rounded-lg bg-gray-50 dark:bg-gray-700 dark:text-white"
                required
              />
            </div>


            <button
              type="submit"
              className="w-full text-white bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg"
            >
              Sign in
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
