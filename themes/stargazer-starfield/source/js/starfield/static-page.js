import { prepareEmbeddedPlayer } from './audio.js';

// Static legacy pages (and the no-WebGL fallback) remain readable independently.
if (!document.getElementById('world')) void prepareEmbeddedPlayer(document.querySelector('main'));
