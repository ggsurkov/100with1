import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode';
import styles from './InAppQrScanner.module.scss';

const SCANNER_ELEMENT_ID = 'in-app-qr-scanner-viewport';

interface InAppQrScannerProps {
  onClose?: () => void;
}

// Accepts either a full join URL (…/launch/:launchId/join) or a bare
// launchId, so the scanner tolerates both a printed QR and a raw ObjectId.
function extractLaunchId(decodedText: string): string | null {
  try {
    const url = new URL(decodedText);
    const match = url.pathname.match(/\/launch\/([^/]+)\/join/);
    if (match) return match[1];
  } catch {
    // Not a URL — fall through to the bare-id check below.
  }
  return /^[a-fA-F0-9]{24}$/.test(decodedText) ? decodedText : null;
}

export default function InAppQrScanner({ onClose }: InAppQrScannerProps) {
  const navigate = useNavigate();
  const handledRef = useRef(false);

  useEffect(() => {
    const scanner = new Html5Qrcode(SCANNER_ELEMENT_ID);
    let cancelled = false;

    scanner
      .start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 260, height: 260 } },
        (decodedText: string) => {
          if (handledRef.current || cancelled) return;
          const launchId = extractLaunchId(decodedText);
          if (!launchId) return;
          handledRef.current = true;
          scanner
            .stop()
            .catch(() => {})
            .finally(() => navigate(`/launch/${launchId}/join`));
        },
        () => {
          // Per-frame decode misses while the camera is still aiming — expected, ignore.
        }
      )
      .catch(() => {});

    return () => {
      cancelled = true;
      if (scanner.isScanning) {
        scanner.stop().catch(() => {}).finally(() => scanner.clear());
      } else {
        scanner.clear();
      }
    };
  }, [navigate]);

  return (
    <div className={styles.scannerWrap}>
      <div id={SCANNER_ELEMENT_ID} className={styles.viewport} />

      <div className={styles.frame}>
        <span className={`${styles.corner} ${styles.tl}`} />
        <span className={`${styles.corner} ${styles.tr}`} />
        <span className={`${styles.corner} ${styles.bl}`} />
        <span className={`${styles.corner} ${styles.br}`} />
        <div className={styles.scanLine} />
      </div>

      <p className={styles.hint}>Наведите камеру на QR-код игры</p>

      {onClose && (
        <button type="button" className={styles.closeBtn} onClick={onClose}>
          ✕ Отмена
        </button>
      )}
    </div>
  );
}
