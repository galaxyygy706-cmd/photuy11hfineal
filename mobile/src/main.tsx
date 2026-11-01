import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { XacThucProvider } from './auth/XacThuc';
import { ThongBaoProvider } from './components/ThongBao';
import './styles.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThongBaoProvider>
      <XacThucProvider>
        <App />
      </XacThucProvider>
    </ThongBaoProvider>
  </StrictMode>,
);
