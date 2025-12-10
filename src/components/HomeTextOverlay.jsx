import { useNavigationStore } from '../store/navigationStore';
import { navigationData } from '../data/navigation';
import './HomeTextOverlay.css';

function HomeTextOverlay() {
  const homeContent = navigationData.home.content;

  return (
    <div className="home-text-overlay">
      <div className="home-section-1">
        <h1>{homeContent.name}</h1>
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
  );
}

export default HomeTextOverlay;
