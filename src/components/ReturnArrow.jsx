import { useNavigationStore } from '../store/navigationStore';
import { colorThemes } from '../config/theme';

function ReturnArrow() {
  const currentTheme = useNavigationStore(state => state.currentTheme);
  const isThemeInverted = useNavigationStore(state => state.isThemeInverted);
  const isDismissed = useNavigationStore(state => state.isLandingDismissed);
  const setLandingDismissed = useNavigationStore(state => state.setLandingDismissed);
  
  const activeColors = colorThemes[currentTheme];
  const strokeColor = isThemeInverted ? activeColors.background : activeColors.text;

  const handleClick = () => {
    if (isDismissed) {
      // Signal that we want to return to landing
      // The LandingOverlay will listen for this
      setLandingDismissed('returning');
    }
  };

  return (
    <div
      className="return-arrow-container"
      onClick={handleClick}
      style={{
        position: 'fixed',
        top: '0px',
        left: '0px',
        width: '30px',
        height: '30px',
        zIndex: 99999,
        pointerEvents: isDismissed === true ? 'auto' : 'none',
        opacity: isDismissed === true ? 1 : 0,
        transition: 'opacity 0.3s ease',
        cursor: 'pointer'
      }}
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 30 30"
        style={{ display: 'block' }}
      >
        {/* Arrow pointing to corner (diagonal) */}
        <path
          d="M 22 22 L 6 6"
          stroke={strokeColor}
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
        />
        {/* Arrow head - two lines forming the point */}
        <path
          d="M 6 14 L 6 6 L 14 6"
          stroke={strokeColor}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </svg>
    </div>
  );
}

export default ReturnArrow;
