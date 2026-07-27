import axios from 'axios';

// Unauthenticated axios instance for team-captain-facing endpoints (join/state/answers).
// Captains never hold a JWT, so this deliberately skips the auth-token interceptor
// and the 401-redirect-to-/auth behavior in services/api.ts.
const publicApi = axios.create({
  baseURL: 'http://localhost:5050/api',
});

export default publicApi;
