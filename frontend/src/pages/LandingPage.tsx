import { useNavigate } from "react-router-dom";

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="h-screen flex flex-col items-center justify-center bg-black text-white">
      <h1 className="text-4xl font-bold mb-6">
        Welcome to CrimeGeoGuessr
      </h1>

      <button
        onClick={() => navigate("/crime_guesser")}
        className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-lg transition-all"
      >
        Play Game
      </button>
    </div>
  );
}
