/**
 * The process entry of `runneros remote`'s flow child, built as
 * `dist/remote-child.js` beside the bin. The supervisor forks it with an IPC
 * channel and sends it one start message; it is no package entry point.
 */

import { createCLILogger } from '@walkeros/core/node';
import { RUNTIME_COLORS } from '../runtime-logging.js';
import { runChild, type ParentLink } from './child.js';
import { isSupervisorMessage } from './ipc.js';

/** The longest an exit waits for messages still on their way out. */
const SEND_FLUSH_MS = 1000;

const send = process.send?.bind(process);

if (send === undefined) {
  createCLILogger({}, RUNTIME_COLORS).error('runneros remote starts this file');
  process.exit(1);
} else {
  // An exit right after a send would drop the message (a `failed` the
  // supervisor reads), so an exit waits until every send has left the
  // process, at most SEND_FLUSH_MS.
  let pending = 0;
  let exitCode: number | undefined;

  const parent: ParentLink = {
    send(message) {
      // A gone supervisor reads nothing; the drain may still report once.
      if (!process.connected) return;
      pending += 1;
      send(message, undefined, {}, () => {
        pending -= 1;
        if (pending === 0 && exitCode !== undefined) process.exit(exitCode);
      });
    },
    onMessage(listener) {
      process.on('message', (message) => {
        if (isSupervisorMessage(message)) listener(message);
      });
    },
    onDisconnect(listener) {
      process.on('disconnect', listener);
    },
  };

  void runChild(parent, {
    exit: (code) => {
      exitCode = code;
      if (pending === 0) process.exit(code);
      setTimeout(() => process.exit(code), SEND_FLUSH_MS);
    },
  });
}
