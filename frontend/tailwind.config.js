/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            /* ============================================
               COLORS - Mapped from CSS Variables
               ============================================ */
            colors: {
                // Surface colors
                bg: 'var(--color-bg)',
                surface: {
                    DEFAULT: 'var(--color-surface)',
                    secondary: 'var(--color-surface-secondary)',
                    hover: 'var(--color-surface-hover)',
                    active: 'var(--color-surface-active)',
                },

                // Border colors
                border: {
                    DEFAULT: 'var(--color-border)',
                    strong: 'var(--color-border-strong)',
                    focus: 'var(--color-border-focus)',
                },

                // Text colors
                text: {
                    primary: 'var(--color-text-primary)',
                    secondary: 'var(--color-text-secondary)',
                    tertiary: 'var(--color-text-tertiary)',
                    inverse: 'var(--color-text-inverse)',
                },

                // Accent (Primary brand color)
                accent: {
                    DEFAULT: 'var(--color-accent)',
                    hover: 'var(--color-accent-hover)',
                    subtle: 'var(--color-accent-subtle)',
                    text: 'var(--color-accent-text)',
                },

                // Semantic colors
                success: {
                    DEFAULT: 'var(--color-success)',
                    subtle: 'var(--color-success-subtle)',
                },
                warning: {
                    DEFAULT: 'var(--color-warning)',
                    subtle: 'var(--color-warning-subtle)',
                },
                error: {
                    DEFAULT: 'var(--color-error)',
                    subtle: 'var(--color-error-subtle)',
                },
            },

            /* ============================================
               TYPOGRAPHY - Mapped from CSS Variables
               ============================================ */
            fontFamily: {
                sans: 'var(--font-sans)',
                mono: 'var(--font-mono)',
            },
            fontSize: {
                xs: ['var(--text-xs)', { lineHeight: 'var(--leading-normal)' }],    // 11px
                sm: ['var(--text-sm)', { lineHeight: 'var(--leading-normal)' }],    // 13px
                base: ['var(--text-base)', { lineHeight: 'var(--leading-normal)' }], // 14px (DEFAULT)
                lg: ['var(--text-lg)', { lineHeight: 'var(--leading-normal)' }],    // 16px
                xl: ['var(--text-xl)', { lineHeight: 'var(--leading-tight)' }],     // 20px
                '2xl': ['var(--text-2xl)', { lineHeight: 'var(--leading-tight)' }], // 24px
            },
            lineHeight: {
                tight: 'var(--leading-tight)',       // 1.25
                normal: 'var(--leading-normal)',     // 1.5
                relaxed: 'var(--leading-relaxed)',   // 1.75
            },
            fontWeight: {
                normal: 'var(--font-normal)',     // 400
                medium: 'var(--font-medium)',     // 500
                semibold: 'var(--font-semibold)', // 600
                bold: 'var(--font-bold)',         // 700
            },

            /* ============================================
               SPACING - Mapped from CSS Variables
               ============================================ */
            spacing: {
                1: 'var(--space-1)',   // 4px
                2: 'var(--space-2)',   // 8px
                3: 'var(--space-3)',   // 12px
                4: 'var(--space-4)',   // 16px (DEFAULT)
                5: 'var(--space-5)',   // 20px
                6: 'var(--space-6)',   // 24px
                8: 'var(--space-8)',   // 32px
                12: 'var(--space-12)', // 48px
            },

            /* ============================================
               BORDER RADIUS - Mapped from CSS Variables
               ============================================ */
            borderRadius: {
                sm: 'var(--radius-sm)', // 4px
                md: 'var(--radius-md)', // 6px
                lg: 'var(--radius-lg)', // 8px
                DEFAULT: 'var(--radius-md)', // 6px (default for rounded)
            },

            /* ============================================
               SHADOWS - Minimal, strategic use
               ============================================ */
            boxShadow: {
                sm: 'var(--shadow-sm)', // Subtle card elevation
                md: 'var(--shadow-md)', // Dropdowns, popovers
                lg: 'var(--shadow-lg)', // Modals only
                DEFAULT: 'var(--shadow-sm)',
            },

            /* ============================================
               ANIMATIONS - Keep only essential ones
               ============================================ */
            animation: {
                'fade-in': 'fadeIn 0.3s ease-in-out',
                'slide-up': 'slideUp 0.2s ease-out',
            },
            keyframes: {
                fadeIn: {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' },
                },
                slideUp: {
                    '0%': { opacity: '0', transform: 'translateY(8px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
            },

            /* ============================================
               COMPONENT SIZES
               ============================================ */
            height: {
                'table-row': 'var(--table-row-height)',
                'input': 'var(--input-height)',
                'button-sm': 'var(--button-height-sm)',
                'button-md': 'var(--button-height-md)',
                'button-lg': 'var(--button-height-lg)',
                'header': 'var(--header-height)',
            },
            width: {
                'sidebar': 'var(--sidebar-width)',
                'sidebar-collapsed': 'var(--sidebar-collapsed)',
            },

            /* ============================================
               Z-INDEX SCALE
               ============================================ */
            zIndex: {
                dropdown: 'var(--z-dropdown)',
                sticky: 'var(--z-sticky)',
                'modal-backdrop': 'var(--z-modal-backdrop)',
                modal: 'var(--z-modal)',
                popover: 'var(--z-popover)',
                tooltip: 'var(--z-tooltip)',
            },
        },
    },
    plugins: [],
}
