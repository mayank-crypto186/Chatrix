import { useState } from "react";
import { User, Mail, Lock, MessageCircle, ShieldCheck, Cloud } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { signupUser } from "../api/authApi";

function Signup() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
  });

  const [message, setMessage] = useState("");

  const handleChange = (e) => {
    setFormData({ 
      ...formData, 
      [e.target.name]: e.target.value 
    });
  };

  const handleSignup = async (e) => {
    e.preventDefault();

    try {
      const res = await signupUser(formData);

      localStorage.setItem("token", res.data.token);
      localStorage.setItem("user", JSON.stringify(res.data.user));

      setMessage("Signup successful");
      navigate("/dashboard");
    } catch (error) {
      console.log("Signup error:", error);
      console.log("Backend response:", error.response?.data);

      setMessage(error.response?.data?.message || "Signup failed");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-100 via-white to-cyan-200 relative overflow-hidden">
      <div className="absolute bottom-0 left-0 w-full h-[42%] bg-gradient-to-t from-cyan-500 to-transparent opacity-70"></div>

      <div className="relative z-10 flex justify-between items-center px-12 py-8">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-400 flex items-center justify-center text-white">
            💬
          </div>
          <h1 className="text-3xl font-bold text-slate-900">Chatrix</h1>
        </div>

        <p className="text-slate-700">
          Already have an account?{" "}
          <Link to="/login" className="text-blue-600 font-semibold">
            Login
          </Link>
        </p>
      </div>

      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 px-16 py-8 gap-10 items-center">
        <div className="max-w-xl">
          <h2 className="text-6xl font-bold text-slate-900 mb-6">
            Join Chatrix 🌊
          </h2>

          <p className="text-2xl text-slate-600 mb-12">
            Create your account and start chatting with your world.
          </p>

          <Feature icon={<MessageCircle />} title="Connect Instantly" text="Chat with friends, share stories and stay in touch." />
          <Feature icon={<ShieldCheck />} title="Private & Secure" text="Your privacy is our priority. Your data is safe with us." />
          <Feature icon={<Cloud />} title="Cloud Sync" text="Access your chats and media from anywhere, anytime." />
        </div>

        <div className="flex justify-center">
          <div className="w-full max-w-xl bg-white/90 backdrop-blur-xl rounded-[28px] shadow-2xl p-12">
            <div className="text-center mb-8">
              <h2 className="text-4xl font-bold text-slate-900">
                Create Account
              </h2>
              <p className="text-slate-500 mt-3">
                Sign up to start using Chatrix.
              </p>
            </div>

            <form onSubmit={handleSignup} className="space-y-6">
              <div>
                <label className="block text-sm font-semibold mb-2">
                  Full Name
                </label>
                <div className="flex items-center border rounded-xl px-4 py-4">
                  <User className="text-slate-400 mr-3" size={22} />
                  <input
                    type="text"
                    name="name"
                    placeholder="Your name"
                    value={formData.name}
                    onChange={handleChange}
                    className="w-full outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">
                  Email Address
                </label>
                <div className="flex items-center border rounded-xl px-4 py-4">
                  <Mail className="text-slate-400 mr-3" size={22} />
                  <input
                    type="email"
                    name="email"
                    placeholder="you@example.com"
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">
                  Password
                </label>
                <div className="flex items-center border rounded-xl px-4 py-4">
                  <Lock className="text-slate-400 mr-3" size={22} />
                  <input
                    type="password"
                    name="password"
                    placeholder="Create password"
                    value={formData.password}
                    onChange={handleChange}
                    className="w-full outline-none"
                  />
                </div>
              </div>

              {message && (
                <p className="text-center text-sm text-red-500">{message}</p>
              )}

              <button className="w-full py-4 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-400 text-white font-semibold shadow-lg">
                Sign Up
              </button>
            </form>

            <div className="flex items-center gap-4 my-8">
              <div className="h-px bg-slate-200 flex-1"></div>
              <span className="text-slate-400">or continue with</span>
              <div className="h-px bg-slate-200 flex-1"></div>
            </div>

            <button className="w-full border rounded-xl py-3 font-medium hover:bg-slate-50">
              Continue with Google
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Feature({ icon, title, text }) {
  return (
    <div className="flex items-start gap-5 mb-8">
      <div className="h-16 w-16 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
        {icon}
      </div>
      <div>
        <h3 className="text-lg font-bold text-slate-900">{title}</h3>
        <p className="text-slate-600 mt-2">{text}</p>
      </div>
    </div>
  );
}

export default Signup;