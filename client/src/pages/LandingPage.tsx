import React from 'react';
import { Link } from 'react-router-dom';
import styles from './LandingPage.module.scss';

const FEATURES = [
  {
    icon: '🍻',
    title: 'Лайтовый вайб',
    description: 'Простые правила, фан, юмор и никакого душного академизма.',
  },
  {
    icon: '📱',
    title: 'Интерактив капитанов',
    description: 'Подключение смартфонов как кнопок ответов в реальном времени.',
  },
  {
    icon: '🎬',
    title: 'Пульт ведущего',
    description: 'Удобная панель управления на планшете/ноутбуке, открывание плашек, автоподсчет очков и звуковые эффекты.',
  },
];

export default function LandingPage() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <div className={styles.logo}>
            <span className={styles.logoIcon}>🍺🎮</span>
            <span>
              Pinta<span className={styles.logoAccent}>Games</span>
            </span>
          </div>
          <nav className={styles.nav}>
            <Link to="/results" className={styles.navLink}>
              Результаты игр
            </Link>
            <Link to="/auth" className={styles.loginBtn}>
              Войти
            </Link>
          </nav>
        </div>
      </header>

      <section className={styles.hero}>
        <span className={styles.badge}>Ураганные офлайн-игры и шоу</span>
        <h1 className={styles.title}>
          Офлайн-игры и интерактивные ТВ-шоу для ваших вечеринок
        </h1>
        <p className={styles.subtitle}>
          Забудьте про задротские викторины. PintaGames — это легкие, шумные и азартные шоу
          вроде «100 к 1» прямо на вашем экране с мобильными кнопками для капитанов.
        </p>
        <Link to="/auth" className={styles.heroCta}>
          Регистрация / Вход
        </Link>
      </section>

      <section className={styles.features}>
        <h2 className={styles.featuresTitle}>Почему PintaGames</h2>
        <div className={styles.featuresGrid}>
          {FEATURES.map(feature => (
            <div key={feature.title} className={styles.featureCard}>
              <div className={styles.featureIcon}>{feature.icon}</div>
              <h3 className={styles.featureTitle}>{feature.title}</h3>
              <p className={styles.featureDescription}>{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.resultsTeaser}>
        <div className={styles.resultsCard}>
          <p className={styles.resultsText}>Хотите посмотреть, как прошли прошлые баттлы?</p>
          <Link to="/results" className={styles.resultsBtn}>
            Смотреть результаты игр
          </Link>
        </div>
      </section>

      <footer className={styles.footer}>
        <p className={styles.copyright}>© 2026 PintaGames. Все права защищены.</p>
        <p className={styles.disclaimer}>
          Информация на сайте носит ознакомительный характер и не является публичной офертой.
        </p>
      </footer>
    </div>
  );
}
