import React, { useState, useEffect } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPaintBrush } from '@fortawesome/free-solid-svg-icons';


interface ThemeSelectorProps {
    //No props needed
}

export type Theme = 'blue' | 'purple' | 'green' | 'orange' | 'dark';

const THEMES: { id: Theme; label: string; color: string }[] = [
    { id: 'blue', label: 'Ocean Blue', color: '#1F4E79' },
    { id: 'purple', label: 'Purple', color: '#6B3FA0' },
    { id: 'green', label: 'Forest Green', color: '#1F6E43' },
    { id: 'orange', label: 'Sunset Orange', color: '#C45911' },
    { id: 'dark', label: 'Dark Mode', color: '#2D2D2D' },
];

const ThemeSelector : React.FC<ThemeSelectorProps> = () => {
    const [currentTheme, setCurrentTheme] = useState<Theme>('blue');
    const [open, setOpen] = useState(false);

    useEffect(() => {
        const savedTheme = localStorage.getItem('app-theme') as Theme;
        if (savedTheme) {
            setCurrentTheme(savedTheme);
            const existing = document.getElementById('theme-stylesheet') as HTMLLinkElement | null;
            if (!existing || !existing.href.endsWith(`${savedTheme}.css`)) {
                applyTheme(savedTheme);
            }
        }        
    }, []);

    const applyTheme = (theme: Theme) => {
        const existing = document.getElementById('theme-stylesheet') as HTMLLinkElement | null;
        if (existing) {
            existing.href = `./themes/${theme}.css`;
        } else {
            const link = document.createElement('link');
            link.id = 'theme-stylesheet';
            link.rel = 'stylesheet';
            link.href = `./themes/${theme}.css`;
            document.head.appendChild(link);
        }
    };

    const handleThemeSelect = (theme: Theme) => {
        setCurrentTheme(theme);
        applyTheme(theme);
        localStorage.setItem('app-theme', theme);
        setOpen(false);
    };

    const selectedThemeLabel = THEMES.find(t => t.id === currentTheme)?.label ?? currentTheme;

    return (
        <div className="theme-selector-wrapper">
            <button 
                onClick={() => setOpen(prev => !prev)}
                title="Change theme"
                className="btn-ghost"
                style={{
                    color: 'var(--primary)'
                }}
            >
               <FontAwesomeIcon icon={faPaintBrush} />               
            </button>
            <span className="theme-selector-current">{selectedThemeLabel}</span>
            {open && (
                <div className="theme-selector-menu">
                    {THEMES.map(theme => (
                        <button
                            key={theme.id}
                            onClick={() => handleThemeSelect(theme.id)}
                            className="theme-selector-option"
                            data-selected={currentTheme === theme.id}
                        >
                            <span
                                className="theme-color-dot"
                                style={{ background: theme.color }}
                            />
                            {theme.label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

export default ThemeSelector;
