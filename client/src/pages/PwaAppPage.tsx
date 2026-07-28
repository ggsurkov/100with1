import React, { useEffect, useState } from 'react';
import InAppQrScanner from '../components/InAppQrScanner';
import styles from './PwaAppPage.module.scss';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

function detectStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export default function PwaAppPage() {
  const [isStandalone] = useState(detectStandalone);
  const [scannerActive, setScannerActive] = useState(detectStandalone);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(detectStandalone);
  const [showManualHint, setShowManualHint] = useState(false);

  // Chrome/Android fire this instead of doing anything automatically — capture
  // it so the "Установить PWA" button can trigger the native install flow.
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
    };
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setInstallPrompt(null);
      setShowManualHint(false);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    // The browser hasn't (yet, or ever will) fire beforeinstallprompt — e.g.
    // it's still evaluating installability criteria, or this is Safari/an
    // incognito tab where the native prompt never fires. Guide the captain
    // to the manual "Add to Home Screen" path instead of a dead button.
    if (!installPrompt) {
      setShowManualHint(true);
      return;
    }
    await installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    setInstallPrompt(null);
    if (outcome === 'accepted') setIsInstalled(true);
  };

  if (scannerActive) {
    return (
      <div className={styles.page}>
        <InAppQrScanner onClose={isStandalone ? undefined : () => setScannerActive(false)} />
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.logo}>🍺🎮 PintaGames</div>
        <h1 className={styles.title}>Добро пожаловать в PintaGames!</h1>
        <p className={styles.subtitle}>
          Установите приложение на главный экран — так игра открывается сразу во весь экран,
          без адресной строки и лишних жестов браузера.
        </p>

        {isInstalled ? (
          <div className={styles.installedBadge}>Приложение установлено ✓</div>
        ) : (
          <button type="button" className={styles.installBtn} onClick={handleInstallClick}>
            📲 Установить PWA на экран Домой
          </button>
        )}

        <button type="button" className={styles.scanBtn} onClick={() => setScannerActive(true)}>
          ▶️ Открыть сканер без установки
        </button>
      </div>

      {showManualHint && (
        <div className={styles.hintOverlay} onClick={() => setShowManualHint(false)}>
          <div className={styles.hintModal} onClick={e => e.stopPropagation()}>
            <p className={styles.hintText}>
              Инициализация приложения... Если установка не начнётся автоматически, нажмите три
              точки меню браузера (⋮) и выберите «Установить приложение» или «Добавить на главный
              экран».
            </p>
            <button type="button" className={styles.hintCloseBtn} onClick={() => setShowManualHint(false)}>
              Понятно
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
