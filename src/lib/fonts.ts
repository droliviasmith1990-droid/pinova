export const GOOGLE_FONTS = [
    { name: 'Roboto', category: 'Sans Serif' },
    { name: 'Open Sans', category: 'Sans Serif' },
    { name: 'Lato', category: 'Sans Serif' },
    { name: 'Montserrat', category: 'Sans Serif' },
    { name: 'Oswald', category: 'Sans Serif' },
    { name: 'Poppins', category: 'Sans Serif' },
    { name: 'Raleway', category: 'Sans Serif' },
    { name: 'Nunito', category: 'Sans Serif' },
    { name: 'Merriweather', category: 'Serif' },
    { name: 'Playfair Display', category: 'Serif' },
    { name: 'Lora', category: 'Serif' },
    { name: 'PT Serif', category: 'Serif' },
    { name: 'Bitter', category: 'Serif' },
    { name: 'Arvo', category: 'Serif' },
    { name: 'Dancing Script', category: 'Handwriting' },
    { name: 'Pacifico', category: 'Handwriting' },
    { name: 'Satisfy', category: 'Handwriting' },
    { name: 'Great Vibes', category: 'Handwriting' },
    { name: 'Sacramento', category: 'Handwriting' },
    { name: 'Lobster', category: 'Display' },
    { name: 'Bebas Neue', category: 'Display' },
    { name: 'Anton', category: 'Display' },
    { name: 'Abril Fatface', category: 'Display' },
    { name: 'Comfortaa', category: 'Display' },
    { name: 'Fredoka One', category: 'Display' },
    { name: 'Righteous', category: 'Display' },
    { name: 'Inter', category: 'Sans Serif' }
];

export const loadFonts = (fonts: string[]) => {
    if (typeof document === 'undefined') return;

    const families = fonts.map(font => font.replace(/ /g, '+')).join('|');
    const href = `https://fonts.googleapis.com/css?family=${families}&display=swap`;

    if (!document.querySelector(`link[href="${href}"]`)) {
        const link = document.createElement('link');
        link.href = href;
        link.rel = 'stylesheet';
        document.head.appendChild(link);
    }
};
