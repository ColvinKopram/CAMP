import { useNavigate } from 'react-router-dom'

export default function NotFound() {
    const navigate = useNavigate()

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-red-100">
            <h1 className="text-4xl font-bold text-red-600 mb-6">404</h1>
            <h2 className="text-2xl fond-semibold mb-4">Page Not Found</h2>
            <p className="text-lg text-gray-700 mb-8 text-center max-w-md">
                You wandered too far away from the CAMP, Its not safe!
            </p>
            <button
                className='bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700'
                onClick={() => navigate('/')}
            >
                Return To CAMP
            </button>
        </div>
    )
}