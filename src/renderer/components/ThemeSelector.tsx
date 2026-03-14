import React, {useState, useEffect} from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPallet } from '@fortawesome/free-solid-svg-icons';


interface ThemeSelectorProps{
    //No props needed
}

export type Theme = 'blue' | 'purple' | 'green' | 'orange' | 'dark';

const THEMES: {id: Theme; label: string; color: string}[] = [
    { id: 'blue', label: 'Ocean Blue', color: '#1F4E79' },
    { id: 'purple', label: 'Purple', color: '#6B3FA0' },
    { id: 'green', label: 'Forest Green', color: '#1F6E43' },
    { id: 'orange', label: 'Sunset Orange', color: '#C45911' },
    { id: 'dark', label: 'Dark Mode', color: '#2D2D2D' },
];

const ThemeSelector : React.FC<ThemeSelectorProps> = () => {
    const [currentTheme, setCurrentTheme] = useState<Theme>('blue');
    const [open,setOpen] = useState(false);

    useEffect(() => {
        const savedTheme = localStorage.getItem('app-theme') as Theme;
        if (savedTheme){
            setCurrentTheme(savedTheme);
            applyTheme(savedTheme);
        }        
    })

    const applyTheme = (theme: Theme) => {
        const existingThemeLink = document.getElementById('theme-stylesheet');
        if (existingThemeLink){
            existingThemeLink.remove();
        }
        const link = document.createElement('link');
        link.id = 'theme-stylesheet';
        link.rel = 'stylesheet' ;
        link.href = `./themes/${theme}.css`;
        document.head.appendChild(link);
    };

    const handleThemeSelect = (theme: Theme) => {
        setCurrentTheme(theme);
        applyTheme(theme);
        localStorage.setItem('app-theme', theme);
        setOpen(false);
    };

    return (
        <div style={{position:'relative', display: 'inline-block'}}>
            <button 
                onClick={() => setOpen(prev => !prev)}
                title = "Change Theme"
                className="btn-ghost"
                style={{
                    padding: '6px 10px',
                    fontSize: '1.1rem',
                    lineHeight: 1,
                    color: 'var(--primary)'
                }}
            >
                <FontAwesomeIcon icon={faPallet} />
            </button>
            {open && (
                <div
                    style={{
                        position: 'absolute',
                        top: '110%',
                        right:0,
                        background: 'var(--card-bg, #a5a0a0a4)',
                        border: '1px solid var(--border-color, #ccc)',
                        borderRadius: '8px',
                        boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
                        zIndex: 1000,
                        minWidth: '160px',
                        overflow: 'hidden'
                    }}>
                    {THEMES.map(theme => (
                        <button
                            key={theme.id}
                            onClick={() => handleThemeSelect(theme.id)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                width: '100%',
                                padding: '10px 14px',
                                border: 'none',
                                background: currentTheme === theme.id ? 'var(--primary-light, #e8f0fe)' : 'transparent',
                                cursor: 'pointer',
                                fontSize: '0.9rem',
                                textAlign: 'left',
                                fontWeight: currentTheme === theme.id ? 'bold' : 'normal'
                            }}
                        >
                            <span
                                style={{
                                    width: '14px',
                                    height: '14px',
                                    borderRadius: '50%',
                                    background: theme.color,
                                    display: 'inline-block',
                                    flexShrink: 0
                                }}
                            />
                            {theme.label}
                        </button>
                    )
                    )}
                </div>
            )}
        </div>
    );
};

export default ThemeSelector;