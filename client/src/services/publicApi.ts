import axios from 'axios';

// Unauthenticated axios instance for team-captain-facing endpoints (join/state/answers).
// Captains never hold a JWT, so this deliberately skips the auth-token interceptor
// and the 401-redirect-to-/auth behavior in services/api.ts.
// Relative baseURL so a captain's phone (loading the site through a tunnel or
// a LAN IP) hits the same origin it loaded from, proxied to Express by Vite.
const publicApi = axios.create({
  baseURL: '/api',
});

export default publicApi;
