import http from 'k6/http';
import { check } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const errorRate = new Rate('errors');
const signInDuration = new Trend('sign_in_duration');
const sessionDuration = new Trend('session_duration');

export const options = {
  stages: [
    { duration: '30s', target: 100 },
    { duration: '1m',  target: 500 },
    { duration: '30s', target: 1000 },
    { duration: '30s', target: 400 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],  // 95% das requests < 500ms
    errors: ['rate<0.01'],             // menos de 1% de erros
  },
};

const BASE_URL = 'http://localhost:40287';
const JSON_HEADERS = { 'Content-Type': 'application/json' };

export default function () {
  const credentials = {
    email: 'izakdvlpr@gmail.com',
    password: 'izakin321',
  };

  const signInStart = Date.now();
  
  const signInRes = http.post(
    `${BASE_URL}/auth/sign-in/email`,
    JSON.stringify({ email: credentials.email, password: credentials.password, rememberMe: false }),
    { headers: JSON_HEADERS },
  );
  
  signInDuration.add(Date.now() - signInStart);

  const signInBody = JSON.parse(signInRes.body as string);
  
  const signInOk = check(signInRes, {
    'sign-in status 200': (r) => r.status === 200,
    'tem token': () => signInBody.token !== undefined,
  });
  
  errorRate.add(!signInOk);

  if (!signInOk) return;

  const sessionStart = Date.now();
  
  const sessionRes = http.get(`${BASE_URL}/auth/get-session`, {
    headers: { ...JSON_HEADERS, Authorization: `Bearer ${signInBody.token}` },
  });
  
  sessionDuration.add(Date.now() - sessionStart);

  const sessionBody = JSON.parse(sessionRes.body as string);
  
  const sessionOk = check(sessionRes, {
    'session status 200': (r) => r.status === 200,
    'tem user': () => sessionBody.user !== undefined,
    'email correto': () => sessionBody.user?.email === credentials.email,
  });
  
  errorRate.add(!sessionOk);
}