import { useNavigationStore } from '../store/navigationStore';
import { colorThemes } from '../config/theme';
import './ColorPicker.css';

function ColorPicker() {
  const currentTheme = useNavigationStore(state => state.currentTheme);
  const isThemeInverted = useNavigationStore(state => state.isThemeInverted);
  const setTheme = useNavigationStore(state => state.setTheme);

  const themes = [
    { name: 'classic', label: 'Classic' },
    { name: 'ocean', label: 'Ocean' },
    { name: 'sunset', label: 'Sunset' },
    { name: 'forest', label: 'Forest' },
    { name: 'midnight', label: 'Midnight' },
    { name: 'matrix', label: 'Matrix' }
  ];

  const handleThemeClick = (themeName) => {
    console.log('Clicking theme:', themeName, 'Current:', currentTheme, 'Inverted:', isThemeInverted);
    setTheme(themeName);
  };

  return (
    <div className="color-picker">
      {themes.map((theme) => (
        <button
          key={theme.name}
          className={`color-swatch ${currentTheme === theme.name ? 'active' : ''}`}
          style={{ backgroundColor: colorThemes[theme.name].accent }}
          onClick={() => handleThemeClick(theme.name)}
          title={theme.label}
          aria-label={`Switch to ${theme.label} theme`}
        />
      ))}
    </div>
  );
}

export default ColorPicker;
