import { navigationData } from '../data/navigation';
import { useNavigationStore } from '../store/navigationStore';
import { isCaseStudy, linkLabel } from '../utils/caseStudy';
import './CaseStudyInfo.css';

function findContent(items, id) {
  for (const item of items) {
    if (item.id === id) return item.content;
    if (item.submenu) {
      const content = findContent(item.submenu, id);
      if (content) return content;
    }
  }
  return null;
}

// Case study title, year, tags, description and link, shown in the left column
// on desktop. Phones keep them at the top of the page in ContentArea.
function CaseStudyInfo() {
  const currentView = useNavigationStore(state => state.currentView);
  const content = currentView ? findContent(navigationData.mainMenu, currentView) : null;

  if (!isCaseStudy(content)) return null;

  return (
    <div className="case-info" key={currentView}>
      <div className="case-info-top">
        <h1 className="case-info-title">{content.title}</h1>
        {content.year && <span className="case-info-year">{content.year}</span>}
      </div>
      {content.tags && <span className="case-info-tags">{content.tags}</span>}
      {content.description && <p className="case-info-description">{content.description}</p>}
      {content.link && (
        <a className="case-info-link" href={content.link} target="_blank" rel="noopener noreferrer">
          {linkLabel(content.link)} ↗
        </a>
      )}
    </div>
  );
}

export default CaseStudyInfo;
