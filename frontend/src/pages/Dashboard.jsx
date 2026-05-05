import { useNavigate } from "react-router-dom";

function Dashboard() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user"));

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-100 via-white to-cyan-100 p-10">
      <div className="bg-white rounded-3xl shadow-xl p-10">
        <h1 className="text-4xl font-bold text-slate-900">
          Welcome to Chatrix, {user?.name} 👋
        </h1>

        <p className="text-slate-600 mt-3">
          Your login/signup system is working successfully.
        </p>

        <button
          onClick={logout}
          className="mt-8 px-6 py-3 bg-red-500 text-white rounded-xl"
        >
          Logout
        </button>
      </div>
    </div>
  );
}

export default Dashboard;