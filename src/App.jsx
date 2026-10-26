import { useEffect } from 'react';
import P5Menu from './components/P5Menu_canvas';
import CaseStudyInfo from './components/CaseStudyInfo';
import SiteSearch from './components/SiteSearch';
import ContentArea from './components/ContentArea';
import CustomCursor from './components/CustomCursor';
import ContextMenu from './components/ContextMenu';
import { useNavigationStore } from './store/navigationStore';
import './App.css';

function App() {
  // Listen for browser back/forward to sync URL with navigation state
  useEffect(() => {
    const cleanup = useNavigationStore.getState().setupPopstateListener();
    return cleanup;
  }, []);

  return (
    <div className="App">
      <P5Menu />
      <CaseStudyInfo />
      <SiteSearch />
      <ContentArea />
      <ContextMenu />
      <CustomCursor />
    </div>
  );
}

export default App;
