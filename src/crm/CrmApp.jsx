import { useEffect, useState } from 'react';
import { colorThemes } from '../config/theme';
import { getSession, signIn } from './api';
import Editor from './Editor';
import './crm.css';

// The editor uses the site's light theme (App.jsx sets these for the site itself)
function applyTheme() {
  const colors = colorThemes.classic;
  const root = document.documentElement.style;
  root.setProperty('--color-background', colors.background);
  root.setProperty('--color-content-area', colors.contentArea);
  root.setProperty('--color-border', colors.border);
  root.setProperty('--color-text', colors.text);
  root.setProperty('--color-text-light', colors.textLight);
  root.setProperty('--color-wire', colors.wire);
  root.setProperty('--color-accent', colors.accent);
}

function SignIn({ configured, onSignedIn }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await signIn(password);
      onSignedIn();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <form className="crm-signin" onSubmit={submit}>
      <span className="crm-title">Henry Allan</span>
      <span className="crm-subtitle">Site editor</span>
      {configured ? (
        <>
          <input
            type="password"
            autoFocus
            autoComplete="current-password"
            placeholder="Password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          <button type="submit" className="primary" disabled={!password || busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
        </>
      ) : (
        <p className="crm-muted">Sign-in isn’t set up. Add CRM_PASSWORD and CRM_SESSION_SECRET to the environment (see README).</p>
      )}
      {error && <p className="crm-error">{error}</p>}
    </form>
  );
}

// /crm: sign in, then the site editor
function CrmApp() {
  // { signedIn, configured, backend }, or { error }
  const [session, setSession] = useState(null);

  useEffect(() => {
    applyTheme();
    document.title = 'Editor · isthishenry';
    getSession().then(setSession, (error) => setSession({ error: error.message }));
  }, []);

  if (!session) return null;
  if (session.error) return <div className="crm-message">Couldn’t reach the editor’s server: {session.error}</div>;
  if (!session.signedIn) {
    return <SignIn configured={session.configured} onSignedIn={() => setSession({ ...session, signedIn: true })} />;
  }
  return <Editor onSignedOut={() => setSession({ ...session, signedIn: false })} />;
}

export default CrmApp;
