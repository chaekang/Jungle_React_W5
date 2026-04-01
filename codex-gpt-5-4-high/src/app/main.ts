import '../app/styles.css';

import { FunctionComponent, h, infoLog, setLogLevel } from '../mini-react';
import { App } from './App';

const container = document.getElementById('app');

if (!(container instanceof HTMLElement)) {
  throw new Error('Root container "#app" was not found.');
}

if (import.meta.env.DEV) {
  setLogLevel('info');
  infoLog('App:Bootstrap', '개발 환경이므로 mini-react info 로그를 활성화합니다.');
}

const app = new FunctionComponent(container, () => h(App, null));
app.mount();
