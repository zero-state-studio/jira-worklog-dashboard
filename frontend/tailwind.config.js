/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    darkMode: 'class',
    theme: {
        extend: {
            colors: {
                // Dark theme colors
                dark: {
                    900: '#0d1117',
                    800: '#161b22',
                    700: '#21262d',
                    600: '#30363d',
                    500: '#484f58',
                    400: '#6e7681',
                    300: '#8b949e',
                    200: '#c9d1d9',
                    100: '#f0f6fc',
                },
                // Accent colors
                accent: {
                    blue: '#58a6ff',
                    green: '#3fb950',
                    purple: '#a371f7',
                    orange: '#d29922',
                    red: '#f85149',
                    pink: '#db61a2',
                    cyan: '#39c5cf',
                },
                // Primary gradient colors
                primary: {
                    from: '#667eea',
                    to: '#764ba2',
                }
            },
            fontFamily: {
                sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
            },
            fontSize: {
                'xxs': '0.625rem',     // 10px
                '4xl': '2.5rem',       // 40px
                '5xl': '3rem',         // 48px
                '6xl': '3.75rem',      // 60px
                '7xl': '4.5rem',       // 72px
            },
            lineHeight: {
                'extra-tight': '1.1',
                'hero': '1',
            },
            letterSpacing: {
                'tightest': '-0.05em',
            },
            boxShadow: {
                'glow': '0 0 20px rgba(102, 126, 234, 0.3)',
                'glow-green': '0 0 20px rgba(63, 185, 80, 0.3)',
                'glow-purple': '0 0 20px rgba(163, 113, 247, 0.3)',
            },
            backgroundImage: {
                'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
                'gradient-primary': 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                'gradient-success': 'linear-gradient(135deg, #3fb950 0%, #2ea44f 100%)',
                'gradient-purple': 'linear-gradient(135deg, #a371f7 0%, #8957e5 100%)',
            },
            animation: {
                'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                'fade-in': 'fadeIn 0.5s ease-in-out',
                'slide-up': 'slideUp 0.3s ease-out',
                'slide-in-right': 'slideInRight 0.3s ease-out',
            },
            keyframes: {
                fadeIn: {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' },
                },
                slideUp: {
                    '0%': { opacity: '0', transform: 'translateY(10px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
                slideInRight: {
                    '0%': { transform: 'translateX(100%)', opacity: '0' },
                    '100%': { transform: 'translateX(0)', opacity: '1' },
                },
            },
        },
    },
    plugins: [],
}
