import { useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'


export default function LandingPage() {
    const [dark, setDark] = useState(false)
    const navigate = useNavigate()

    useEffect(() => {
        if(dark) {
            document.documentElement.classList.add('dark')
        }
        else{
            document.documentElement.classList.remove('dark')
        }
    }, [dark])

    return (
        <div className="w-screen h-screen flex flex-col bg-black dark:bg-white relative">
            <div className='w-full flex justify-center mt-8'>
                <h1 className="relative xl:text-9xl md:text-8xl text-5xl sm:tracking-[17px] tracking-[10px] uppercase text-center leading-[0.70em] outline-none animate-dimlight box-reflect">
                    WELCOME TO C.A.M.P
                </h1>
            </div>

            <div className="flex flex-col items-center justify-center flex-grow space-y-6 mt-12">
                {[
                    {label: 'Our Mission', path: '/mission'},
                    {label: 'Criminal Activity Maps', path: '/maps'},
                    {label: 'Criminal Activity Geoguesser', path: '/geoguesser'},
                    {label: 'Leaderboard', path: '/leaderboard'},
                ].map(({ label,path}) => (
                    <button
                        key={label}
                        className='rounded-md border-2 border-black w-[180px] h-[60px] transition-all hover:scale-125 hover:animate-pulseGlow hover:text-xl'
                        onClick={() => navigate(path)}
                    >
                        <div className='bg-sample w-full h-full flex items-center justify-center'>
                            {label}
                        </div>
                    </button>

                ))}
            </div>
            
            <div className="absolute bottom-6 right-6">
                <button 
                    className='px-4 py-2 rounded bg-blue-500 text-white hover:bg-blue-600' 
                    onClick={() => setDark(!dark)}>
                    Dark Mode Toggle

                </button>
            </div>
        </div>
    )
}