import { navigationData } from '../data/navigation';
import P5Logo from './P5Logo';
import './HomeTextOverlay.css';

function HomeTextOverlay() {
  const homeContent = navigationData.home.content;

  return (
    <>
      {/* P5 canvas is fullscreen, positioned to match the text location */}
      <P5Logo text={homeContent.name} fontSize={24} />
      
      <div className="home-text-overlay">
        <div className="home-section-1">
          {/* Name is rendered by P5Logo canvas */}
          
    </div>
    </div>
    </>
  );
}

export default HomeTextOverlay;
