import './style.css';
import { initTheme } from './ui/theme.js';
import { initApp } from './ui/app.js';

// Apply persisted theme before first paint
initTheme();

// Boot the app
initApp();
