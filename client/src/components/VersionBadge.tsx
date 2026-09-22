import styles from './VersionBadge.module.scss';

// Версия берётся из package.json в корне монорепозитория и подставляется
// Vite на этапе сборки (define `__APP_VERSION__` в vite.config.ts).
export default function VersionBadge() {
  return <span className={styles.version}>v{__APP_VERSION__}</span>;
}
