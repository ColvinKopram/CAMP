/**@type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    darkMode:'class',
    theme: {
        extend: {
            keyframes: {
                police: {
                    '0% , 100%' : {
                        color: '#ff0000',
                        textShadow:'0 0 15px #ff0000',
                    },
                },
                pulseGlow: {
                    '0%, 100%' : { transform: 'scale(1)', opacity: 1},
                    '50%' : { transform: 'scale(1.05)',opacity: 0.8},
                },
            },
            animation: {
                police: 'police 1s infinite alternate',
                pulseGlow: 'pulseGlow 1.5s infinite',
            },
        },
    },
    plugins: [
        function ({ addUtilities }) {
            addUtilities({
                '.box-reflect': {
                    '-webkit-box-reflect': 'below 1px linear-gradient(transparent, #0004)',
                },
            })
        },
    ],
}