// Telegram Mini App support for the captain screens.
// The official SDK script loads only when the page runs inside Telegram, so
// regular web visitors never wait for telegram.org.

interface TelegramWebApp {
  initData: string;
  initDataUnsafe: { start_param?: string };
  platform: string;
  ready: () => void;
  expand: () => void;
  close: () => void;
  isVersionAtLeast: (version: string) => boolean;
  disableVerticalSwipes?: () => void;
  enableClosingConfirmation?: () => void;
  requestFullscreen?: () => void;
  requestWriteAccess?: (callback?: (granted: boolean) => void) => void;
  onEvent: (event: string, handler: () => void) => void;
  offEvent: (event: string, handler: () => void) => void;
}

declare global {
  interface Window {
    Telegram?: { WebApp?: TelegramWebApp };
  }
}

const SDK_URL = 'https://telegram.org/js/telegram-web-app.js';

// Telegram opens the Mini App with #tgWebAppData=... in the URL. The SDK keeps
// these params in sessionStorage, so a reload after SPA navigation still counts.
function isOpenedFromTelegram(): boolean {
  if (window.location.hash.includes('tgWebAppData')) return true;
  try {
    return !!sessionStorage.getItem('__telegram__initParams');
  } catch {
    return false;
  }
}

// Returns the Mini App object only when the page really runs inside Telegram.
export function getTelegramWebApp(): TelegramWebApp | null {
  const webApp = window.Telegram?.WebApp;
  return webApp && webApp.initData ? webApp : null;
}

// Loads the SDK and sets up the captain shell: full height, no swipe-to-close,
// confirmation before closing, fullscreen on phones. Resolves immediately
// outside Telegram. Never rejects — the app must start in any case.
export function initTelegram(): Promise<void> {
  if (!isOpenedFromTelegram()) return Promise.resolve();

  return new Promise(resolve => {
    const script = document.createElement('script');
    script.src = SDK_URL;
    script.onload = () => {
      const webApp = getTelegramWebApp();
      if (webApp) {
        webApp.ready();
        webApp.expand();
        webApp.disableVerticalSwipes?.();
        webApp.enableClosingConfirmation?.();
        if (webApp.isVersionAtLeast('8.0') && ['ios', 'android'].includes(webApp.platform)) {
          webApp.requestFullscreen?.();
        }
      }
      resolve();
    };
    script.onerror = () => resolve();
    document.head.appendChild(script);
  });
}
