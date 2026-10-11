import { navigationData } from '../data/navigation';
import './HomeTextOverlay.css';

function HomeTextOverlay() {
  return <div className="site-name">{navigationData.home.content.name}</div>;
}

export default HomeTextOverlay;
