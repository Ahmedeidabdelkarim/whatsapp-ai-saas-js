import { EventEmitter } from "events";
// Stored on globalThis so the queue worker, route handlers and hot reloads in one Node process all share the same bus.
const g = globalThis;
const bus = (g.__rtBus ??= new EventEmitter());
bus.setMaxListeners(0);
/** One channel per store: a dashboard only ever receives events of its own tenant. */
export const publish = (storeId, e) => void bus.emit(`store:${storeId}`, { ...e, at: Date.now() });
export function subscribe(storeId, fn) {
    bus.on(`store:${storeId}`, fn);
    return () => void bus.off(`store:${storeId}`, fn);
}
