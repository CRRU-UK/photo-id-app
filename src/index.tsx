import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ThemeProvider, BaseStyles } from '@primer/react';

import App from './frontend/App';

const container = document.getElementById('root') as HTMLDivElement;
const root = createRoot(container);

root.render(
  <StrictMode>
    <ThemeProvider colorMode="dark">
      <BaseStyles>
        <App />
      </BaseStyles>
    </ThemeProvider>
  </StrictMode>
);
