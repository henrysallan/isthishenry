// Tests read the site content from the navigation.js snapshot, as the live site
// does when /api/site can't be reached
import { navigationData as snapshot } from '../data/navigation.js';
import { setSite } from '../data/site.js';
import { toSiteDoc } from '../data/siteDoc.js';

setSite(toSiteDoc(snapshot));
