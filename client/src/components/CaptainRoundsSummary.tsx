import type { CaptainRoundSummary } from '../types/launch';
import styles from './CaptainRoundsSummary.module.scss';

interface CaptainRoundsSummaryProps {
  rounds: CaptainRoundSummary[];
}

// Captain's phone between rounds: completed rounds as collapsible sections with
// the team's own answers. The latest round starts open.
export default function CaptainRoundsSummary({ rounds }: CaptainRoundsSummaryProps) {
  return (
    <div className={styles.summary}>
      <h2 className={styles.title}>Раунд завершён</h2>
      <p className={styles.hint}>Ожидайте начала следующего вопроса. Ниже — ответы вашей команды.</p>

      <div className={styles.rounds}>
        {rounds.map((round, index) => (
          <details key={round.roundId} className={styles.round} open={index === rounds.length - 1}>
            <summary className={styles.roundTitle}>{round.title}</summary>
            <ol className={styles.questions}>
              {round.questions.map(q => (
                <li key={q.questionId} className={styles.question}>
                  <span className={styles.questionTitle}>{q.title}</span>
                  {q.answerText ? (
                    <span className={styles.answer}>«{q.answerText}»</span>
                  ) : (
                    <span className={styles.noAnswer}>
                      {q.wasAway ? 'Ответ заблокирован: уход из игры' : 'Нет ответа'}
                    </span>
                  )}
                </li>
              ))}
            </ol>
          </details>
        ))}
      </div>
    </div>
  );
}
