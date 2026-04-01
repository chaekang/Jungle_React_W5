import '../app/styles.css';

import { FunctionComponent, h } from '../mini-react';
import { App } from './App';

const container = document.getElementById('app');

if (!(container instanceof HTMLElement)) {
  throw new Error('Root container "#app" was not found.');
}

const app = new FunctionComponent(container, () => h(App, null));
app.mount();
