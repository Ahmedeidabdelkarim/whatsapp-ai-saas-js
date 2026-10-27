/** One Server-Sent Event frame. */
export const sseData = (payload) => `data: ${JSON.stringify(payload)}\n\n`;
/** Comment frame: keeps proxies from closing an idle connection; browsers ignore it. */
export const SSE_PING = ": ping\n\n";
