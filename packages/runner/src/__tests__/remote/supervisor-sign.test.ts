/**
 * The supervisor signs its child's ingest writes: a fake child asks with a
 * method, a URL and a body digest, as the child's own signer does, and the
 * answer is read as a door reads it.
 */

import {
  contentDigest,
  createDoorCheck,
  SIGNATURE_TAGS,
} from '@walkeros/server-core';
import type {
  SignAnswer,
  SignRequest,
  SupervisorMessage,
} from '../../remote/ipc.js';
import { SIGNS_IN_FLIGHT_MAX } from '../../remote/supervisor.js';
import { buildRelease } from '../helpers/release-fixture.js';
import {
  answer,
  createHarness,
  settle,
  until,
  type FakeChild,
  type Harness,
} from '../helpers/supervisor-harness.js';

let h: Harness;

afterEach(async () => {
  await h.close();
});

/** A door on a loopback port no test listens on: the check runs in process. */
const DOOR = 'http://127.0.0.1:8090';
const BODY = new TextEncoder().encode('{"row":1}\n');

const HELD_HEADERS = {
  'Signature-Input': 'walkeros=("@method");tag="walkeros-ingest"',
  Signature: 'walkeros=:aGVsZA==:',
};

/** v1 from the cache, ready and serving: its child is the one that asks. */
async function servingChild(): Promise<FakeChild> {
  h = await createHarness();
  await h.cacheRelease(await buildRelease({ sequence: 1 }));
  expect(await h.supervisor.boot(answer(1))).toBe('serving');
  return h.child(1);
}

function sign(
  id: number,
  request: { method: string; url: string } = {
    method: 'POST',
    url: `${DOOR}/ingest`,
  },
): SignRequest {
  return { type: 'sign', id, ...request, contentDigest: contentDigest(BODY) };
}

function isSignAnswer(message: SupervisorMessage): message is SignAnswer {
  return message.type === 'signed' || message.type === 'sign-refused';
}

/** The supervisor's answers to the child's signs, in the order sent. */
function answersTo(child: FakeChild): SignAnswer[] {
  return child.sent.filter(isSignAnswer);
}

describe("the supervisor's signer", () => {
  it("signs a child's ingest write so that a door holding the credential's public signing key takes it", async () => {
    const child = await servingChild();

    child.emit(sign(0));
    await until(() => answersTo(child).length === 1);

    const [answer] = answersTo(child);
    if (answer.type !== 'signed') throw new Error(answer.message);
    const { kty, crv, x, y, kid } = h.credential.sig;
    const door = createDoorCheck({
      tag: SIGNATURE_TAGS.ingest,
      lookup: async (keyid) => (keyid === kid ? { kty, crv, x, y } : undefined),
      startedAt: 0,
    });
    const decision = await door.check({
      origin: DOOR,
      method: 'POST',
      target: '/ingest',
      headers: new Headers({
        ...answer.headers,
        'Content-Digest': contentDigest(BODY),
      }),
      body: BODY,
    });
    expect({ id: answer.id, decision }).toEqual({
      id: 0,
      decision: { ok: true, keyid: kid },
    });
  });

  it.each<[string, () => { method: string; url: string }, string]>([
    [
      "the app's origin",
      () => ({
        method: 'POST',
        url: `${h.standIn.origin}/api/runner/check-in`,
      }),
      'The door signer does not sign for the app or its auth server',
    ],
    [
      "the auth server's origin",
      () => ({
        method: 'POST',
        url: `${new URL(h.credential.iss).origin}/token`,
      }),
      'The door signer does not sign for the app or its auth server',
    ],
    [
      'a GET',
      () => ({ method: 'GET', url: `${DOOR}/ingest` }),
      'The door signer signs POST requests only',
    ],
    [
      'http to a public host',
      () => ({ method: 'POST', url: 'http://ingest.example.com/ingest' }),
      'The door signer signs https, or http to a loopback or private host, only',
    ],
  ])(
    "refuses a sign for %s with the rule's fact and writes no line",
    async (_case, request, fact) => {
      const child = await servingChild();
      const lines = [...h.lines];

      child.emit(sign(3, request()));
      await until(() => answersTo(child).length === 1);

      expect(answersTo(child)).toEqual([
        { type: 'sign-refused', id: 3, message: fact },
      ]);
      expect(h.lines).toEqual(lines);
    },
  );

  /** Holds every sign the supervisor asks for; each entry settles one. */
  function holdSigns(): Array<() => void> {
    const held: Array<() => void> = [];
    h.signStep = () =>
      new Promise((resolve) => {
        held.push(() => resolve(HELD_HEADERS));
      });
    return held;
  }

  it(`refuses a sign past ${SIGNS_IN_FLIGHT_MAX} in flight with the in-flight fact`, async () => {
    const child = await servingChild();
    const held = holdSigns();

    for (let id = 0; id <= SIGNS_IN_FLIGHT_MAX; id++) child.emit(sign(id));
    await until(() => answersTo(child).length === 1);

    expect({ held: held.length, answers: answersTo(child) }).toEqual({
      held: 64,
      answers: [
        {
          type: 'sign-refused',
          id: 64,
          message: '64 signing requests are in flight',
        },
      ],
    });
  });

  it(`takes a sign once one of ${SIGNS_IN_FLIGHT_MAX} in flight settled`, async () => {
    const child = await servingChild();
    const held = holdSigns();
    for (let id = 0; id < SIGNS_IN_FLIGHT_MAX; id++) child.emit(sign(id));

    held[0]();
    await until(() => answersTo(child).length === 1);
    child.emit(sign(64));

    expect({ held: held.length, answers: answersTo(child) }).toEqual({
      held: 65,
      answers: [{ type: 'signed', id: 0, headers: HELD_HEADERS }],
    });
  });

  it('drops a sign that settles after its child exited, with no line', async () => {
    const child = await servingChild();
    let settleSign: () => void = () => {};
    h.signStep = () =>
      new Promise((resolve) => {
        settleSign = () => resolve(HELD_HEADERS);
      });

    child.emit(sign(0));
    await h.supervisor.stop();
    const lines = [...h.lines];
    settleSign();
    await settle();

    expect({ exited: child.exited, answers: answersTo(child) }).toEqual({
      exited: true,
      answers: [],
    });
    expect(h.lines).toEqual(lines);
  });
});
