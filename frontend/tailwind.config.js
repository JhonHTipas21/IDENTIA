/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                // Dominican Republic flag inspired colors
                primary: {
                    50: '#eff6ff',
                    100: '#dbeafe',
                    200: '#bfdbfe',
                    300: '#93c5fd',
                    400: '#60a5fa',
                    500: '#002d62', // Navy blue
                    600: '#002654',
                    700: '#001f46',
                    800: '#001838',
                    900: '#00112a',
                },
                accent: {
                    50: '#fef2f2',
                    100: '#fee2e2',
                    200: '#fecaca',
                    300: '#fca5a5',
                    400: '#f87171',
                    500: '#ce1126', // Dominican red
                    600: '#b91c1c',
                    700: '#991b1b',
                    800: '#7f1d1d',
                    900: '#450a0a',
                },
                success: {
                    50: '#f0fdf4',
                    100: '#dcfce7',
                    500: '#22c55e',
                    600: '#16a34a',
                },
                warning: {
                    50: '#fefce8',
                    100: '#fef9c3',
                    500: '#eab308',
                    600: '#ca8a04',
                },
            },
            fontSize: {
                // Accessibility-first font sizes (minimum 18px)
                'accessible-base': ['18px', '1.6'],
                'accessible-lg': ['20px', '1.6'],
                'accessible-xl': ['24px', '1.5'],
                'accessible-2xl': ['28px', '1.4'],
                'accessible-3xl': ['36px', '1.3'],
                'accessible-4xl': ['48px', '1.2'],
            },
            spacing: {
                // Large touch targets (>50px)
                'touch': '56px',
                'touch-lg': '64px',
                'touch-xl': '72px',
            },
            borderRadius: {
                'accessible': '16px',
            },
            boxShadow: {
                'accessible': '0 4px 14px 0 rgba(0, 45, 98, 0.15)',
                'accessible-lg': '0 8px 28px 0 rgba(0, 45, 98, 0.2)',
                'glow': '0 0 20px rgba(0, 45, 98, 0.3)',
                'glow-accent': '0 0 30px rgba(206, 17, 38, 0.3)',
            },
            animation: {
                'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                'bounce-gentle': 'bounce-gentle 2s ease-in-out infinite',
                'listening': 'listening 1.5s ease-in-out infinite',
                'wave': 'wave 1s ease-in-out infinite',
            },
            keyframes: {
                'bounce-gentle': {
                    '0%, 100%': { transform: 'translateY(0)' },
                    '50%': { transform: 'translateY(-5px)' },
                },
                'listening': {
                    '0%, 100%': { transform: 'scale(1)', opacity: '1' },
                    '50%': { transform: 'scale(1.1)', opacity: '0.8' },
                },
                'wave': {
                    '0%, 100%': { transform: 'scaleY(1)' },
                    '50%': { transform: 'scaleY(1.5)' },
                },
            },
        },
    },
    plugins: [],
}
