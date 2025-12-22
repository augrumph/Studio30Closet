/** @type {import('tailwindcss').Config} */
export default {
    darkMode: ["class"],
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                // Studio 30 Closet Brand Colors - Mood Board Palette Only
                brand: {
                    // Primary Mood Board Colors
                    rose: '#FDF0ED',          // Rose Blush (fundo claro)
                    'rose-light': '#FEF7F5',
                    peach: '#F8C4B4',          // Peach/Salmon
                    terracotta: '#C75D3B',     // Terracotta (accent principal)
                    rust: '#B84830',           // Rust/Ferrugem
                    brown: '#5D2E1F',          // Deep Brown
                    'brown-dark': '#2C1810',
                    coral: '#E07B5D',          // Coral

                    // Variations
                    cream: '#FAF8F5',
                    ivory: '#FFFFF0',
                },
                background: 'hsl(var(--background))',
                foreground: 'hsl(var(--foreground))',
                card: {
                    DEFAULT: 'hsl(var(--card))',
                    foreground: 'hsl(var(--card-foreground))'
                },
                popover: {
                    DEFAULT: 'hsl(var(--popover))',
                    foreground: 'hsl(var(--popover-foreground))'
                },
                primary: {
                    DEFAULT: 'hsl(var(--primary))',
                    foreground: 'hsl(var(--primary-foreground))'
                },
                secondary: {
                    DEFAULT: 'hsl(var(--secondary))',
                    foreground: 'hsl(var(--secondary-foreground))'
                },
                muted: {
                    DEFAULT: 'hsl(var(--muted))',
                    foreground: 'hsl(var(--muted-foreground))'
                },
                accent: {
                    DEFAULT: 'hsl(var(--accent))',
                    foreground: 'hsl(var(--accent-foreground))'
                },
                destructive: {
                    DEFAULT: 'hsl(var(--destructive))',
                    foreground: 'hsl(var(--destructive-foreground))'
                },
                border: 'hsl(var(--border))',
                input: 'hsl(var(--input))',
                ring: 'hsl(var(--ring))',
            },
            fontFamily: {
                sans: ['Century Gothic', 'Questrial', 'system-ui', 'sans-serif'],
                display: ['Century Gothic', 'Questrial', 'system-ui', 'sans-serif'],
            },
            borderRadius: {
                lg: 'var(--radius)',
                md: 'calc(var(--radius) - 2px)',
                sm: 'calc(var(--radius) - 4px)'
            },
            transitionDuration: {
                '400': '400ms',
            },
            transitionTimingFunction: {
                'luxury': 'cubic-bezier(0.4, 0, 0.2, 1)',
                'bounce-subtle': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
            },
            boxShadow: {
                'soft': '0 2px 15px -3px rgba(93, 46, 31, 0.07), 0 10px 20px -2px rgba(93, 46, 31, 0.04)',
                'soft-lg': '0 10px 40px -10px rgba(93, 46, 31, 0.12), 0 20px 25px -5px rgba(93, 46, 31, 0.06)',
                'terracotta': '0 4px 20px rgba(199, 93, 59, 0.25)',
                'terracotta-lg': '0 10px 40px rgba(199, 93, 59, 0.35)',
                'coral': '0 4px 20px rgba(224, 123, 93, 0.25)',
                'coral-lg': '0 10px 40px rgba(224, 123, 93, 0.35)',
                'inner-glow': 'inset 0 2px 4px 0 rgba(255, 255, 255, 0.06)',
                '3xl': '0 35px 60px -15px rgba(93, 46, 31, 0.25)',
            },
            backgroundImage: {
                'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
                'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
                'shimmer': 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)',
            },
            keyframes: {
                'fade-in': {
                    '0%': { opacity: '0', transform: 'translateY(10px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
                'slide-up': {
                    '0%': { opacity: '0', transform: 'translateY(20px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
                'shimmer': {
                    '0%': { transform: 'translateX(-100%)' },
                    '100%': { transform: 'translateX(100%)' },
                },
                'float': {
                    '0%, 100%': { transform: 'translateY(0)' },
                    '50%': { transform: 'translateY(-10px)' },
                },
                'float-subtle': {
                    '0%, 100%': { transform: 'translateY(0)' },
                    '50%': { transform: 'translateY(-5px)' },
                },
                'scale-in': {
                    '0%': { opacity: '0', transform: 'scale(0.9)' },
                    '100%': { opacity: '1', transform: 'scale(1)' },
                },
                'reveal-up': {
                    '0%': { opacity: '0', transform: 'translateY(40px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
                'glow': {
                    '0%, 100%': { boxShadow: '0 0 20px rgba(199, 93, 59, 0.3)' },
                    '50%': { boxShadow: '0 0 30px rgba(199, 93, 59, 0.5)' },
                },
                'glow-pulse': {
                    '0%, 100%': { opacity: '0.6' },
                    '50%': { opacity: '1' },
                },
                'shine': {
                    '0%': { left: '-100%' },
                    '100%': { left: '100%' },
                },
                'zoom': {
                    '0%': { transform: 'scale(1)' },
                    '100%': { transform: 'scale(1.05)' },
                },
                'pulse-soft': {
                    '0%, 100%': { opacity: '1' },
                    '50%': { opacity: '0.7' },
                },
                'bounce-gentle': {
                    '0%, 100%': { transform: 'translateY(0)' },
                    '50%': { transform: 'translateY(-8px)' },
                },
            },
            animation: {
                'fade-in': 'fade-in 0.5s ease-out',
                'slide-up': 'slide-up 0.6s ease-out',
                'shimmer': 'shimmer 2.5s linear infinite',
                'float': 'float 3s ease-in-out infinite',
                'float-subtle': 'float-subtle 4s ease-in-out infinite',
                'scale-in': 'scale-in 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
                'reveal-up': 'reveal-up 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
                'glow': 'glow 2s ease-in-out infinite',
                'glow-pulse': 'glow-pulse 2s ease-in-out infinite',
                'shine': 'shine 1.5s ease-in-out',
                'zoom': 'zoom 0.4s ease-out forwards',
                'pulse-soft': 'pulse-soft 2s ease-in-out infinite',
                'bounce-gentle': 'bounce-gentle 2s ease-in-out infinite',
            },
            aspectRatio: {
                'product': '2/3',
                'hero': '16/9',
            },
        },
    },
    plugins: [
        require("tailwindcss-animate"),
        function({ addUtilities }) {
            addUtilities({
                '.scrollbar-hide': {
                    '-ms-overflow-style': 'none',
                    'scrollbar-width': 'none',
                    '&::-webkit-scrollbar': {
                        display: 'none'
                    }
                }
            })
        }
    ],
    // Optimizations
    future: {
        hoverOnlyWhenSupported: true,
    },
}
