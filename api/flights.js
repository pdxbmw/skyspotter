import { handleFlightsApi } from '../proxyHandlers.mjs';

export default async function handler(req, res) {
  const reqUrl = new URL(req.url ?? '/', 'http://localhost');
  await handleFlightsApi(reqUrl, res);
}
