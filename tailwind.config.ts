import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Acentos de marca — usar con moderación (CTAs, detalles, logo)
        'brand-teal': '#4DB8B8',
        'brand-orange': '#F4873A',
        // Fondos y texto — uso principal
        'brand-cream': '#FAFAF0',
        'dark-navy': '#1A1A2E',
        // Neutros de apoyo
        'neutral-100': '#F5F5F0',
        'neutral-200': '#E8E8E3',
        'neutral-500': '#8A8A82',
      },
      fontFamily: {
        // display: Solo para títulos de marca y encabezados principales
        // Playfair Display aporta elegancia atemporal sin ser trendy
        display: ['"Playfair Display"', 'Georgia', 'serif'],
        // body: Todo lo demás — cuerpo, precios, UI, labels
        body: ['"DM Sans"', 'system-ui', 'sans-serif'],
      },
      // Espaciado generoso para respirar el contenido
      spacing: {
        '18': '4.5rem',
        '22': '5.5rem',
      },
    },
  },
  plugins: [],
}

export default config
