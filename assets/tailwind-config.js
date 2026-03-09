/* global tailwind */

// Tailwind Configuration - Loaded asynchronously
if (typeof tailwind !== 'undefined') {
  tailwind.config = {
    darkMode: 'class',
    theme: {
      extend: {
        colors: {
          'primary': '#271b3b',
          'primary-light': '#3a2a52',
          'background-light': '#f7f6f7',
          'background-dark': '#18151d',
          'accent': '#e84545',
          'success': '#22c55e'
        },
        fontFamily: {
          'display': ['Inter', 'sans-serif']
        },
        borderRadius: {
          'DEFAULT': '0.25rem',
          'lg': '0.5rem',
          'xl': '0.75rem',
          'full': '9999px'
        },
        animation: {
          'float': 'float 3s ease-in-out infinite',
          'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
          'slide-in-right': 'slideInRight 0.5s ease-out forwards',
          'fade-in': 'fadeIn 0.3s ease-out forwards',
          'scale-in': 'scaleIn 0.3s ease-out forwards',
          'bounce-gentle': 'bounceGentle 2s infinite'
        },
        keyframes: {
          float: {
            '0%, 100%': { transform: 'translateY(0px)' },
            '50%': { transform: 'translateY(-10px)' }
          },
          slideInRight: {
            '0%': { transform: 'translateX(-100px)', opacity: '0' },
            '100%': { transform: 'translateX(0)', opacity: '1' }
          },
          fadeIn: {
            '0%': { opacity: '0' },
            '100%': { transform: 'translateX(0)', opacity: '1' }
          },
          scaleIn: {
            '0%': { transform: 'scale(0.9)', opacity: '0' },
            '100%': { transform: 'scale(1)', opacity: '1' }
          },
          bounceGentle: {
            '0%, 100%': { transform: 'translateY(0)' },
            '50%': { transform: 'translateY(-5px)' }
          }
        }
      }
    }
  };
}