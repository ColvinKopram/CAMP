import { useNavigate } from 'react-router-dom'

export default function LandingPage() {
    const navigate = useNavigate()

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
            <h1 className="text-4xl font-bold mb-8">WELCOME TO C.A.M.P</h1>
            <div className="space-y-4">
                <button className="bg-blue-500 text-white px-4 py-2 rounded" onClick={() => navigate('/mission')}>Our Mission</button>
                <button className="bg-blue-500 text-white px-4 py-2 rounded" onClick={() => navigate('/maps')}>Criminal Activity Maps</button>
                <button className="bg-blue-500 text-white px-4 py-2 rounded" onClick={() => navigate('/geoguesser')}>Criminal Activity Geoguesser</button>
                <button className="bg-blue-500 text-white px-4 py-2 rounded" onClick={() => navigate('/leaderboard')}>Leaderboard</button>
            </div>
        </div>
    )
}