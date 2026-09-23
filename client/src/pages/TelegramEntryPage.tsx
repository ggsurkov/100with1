import { Navigate } from 'react-router-dom';
import { getTelegramWebApp } from '../utils/telegram';

// Entry point of the Telegram Mini App (the URL registered in @BotFather).
// The QR link t.me/<bot>/<app>?startapp=<launchId> passes the launch id as
// start_param; from here the captain goes through the usual join flow.
export default function TelegramEntryPage() {
  const launchId = getTelegramWebApp()?.initDataUnsafe.start_param;
  if (launchId && /^[a-f0-9]{24}$/i.test(launchId)) {
    return <Navigate to={`/launch/${launchId}/join`} replace />;
  }
  return <Navigate to="/" replace />;
}
