import { navigationData } from '../data/navigation';
import P5Logo from './P5Logo';
import './HomeTextOverlay.css';

function HomeTextOverlay() {
  const homeContent = navigationData.home.content;

  return (
    <>
      {/* P5 canvas is fullscreen, positioned to match the text location */}
      <P5Logo text={homeContent.name} fontSize={16} />
      
      <div className="home-text-overlay">
        <div className="home-section-1">
          {/* Name is rendered by P5Logo canvas */}
          <div className="name-spacer" />
          <p className="subtitle">{homeContent.subtitle}</p>
        </div>
      <div className="home-section-2">
        <p className="info-text">
          current:
          <br />
          <a href="https://thecollectedworks.com" target="_blank" rel="noopener noreferrer">
            the collected works
          </a>
        </p>
        <p className="info-text">
          past:
          <br />
          <a href="https://vmgroupe.com" target="_blank" rel="noopener noreferrer">
            vmgroupe
          </a>
          <br />
          <a href="https://kalshi.com" target="_blank" rel="noopener noreferrer">
            kalshi
          </a>
          <br />
          <a href="https://mschf.com" target="_blank" rel="noopener noreferrer">
            mschf
          </a>
        </p>
      </div>
    </div>
    </>
  );
}

export default HomeTextOverlay;
