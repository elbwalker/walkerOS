import { startFlow } from '@walkeros/collector';
import { Source } from '@walkeros/core';
import type { Destination, Ingest, WalkerOS } from '@walkeros/core';
import type { Request, Response } from 'express';
import { sourceExpress } from '../index';
import type { Types as ExpressTypes } from '../types';

/**
 * Express concurrency regression — the named real-world scenario in the
 * audit. Before withScope, a single express source instance handling
 * concurrent inbound HTTP requests would stomp the factory-scope
 * `currentIngest`/`currentRespond` mid-flight, cross-contaminating events
 * and HTTP responses.
 *
 * Uses plain-object mock req/res to exercise the express source's
 * `push(req, res)` handler directly. Mock req/res keeps this test fast
 * and deterministic. The previous `getByPath` cross-realm bug (silent
 * undefined on Node IncomingMessage) is now fixed in `@walkeros/core`;
 * a real-fetch variant can be added in a future test. Mock requests
 * carry distinct headers and bodies; mock responses capture status/body
 * per request id. Any crosstalk would show up as a mismatch between a
 * request's id and the captured ingest/response.
 */
describe('Express concurrent requests', () => {
  it('keeps ingest and respond isolated across concurrent inbound requests', async () => {
    const N = 30;
    type CapturedEvent = WalkerOS.Event & { ingest?: Ingest };
    const captured: CapturedEvent[] = [];

    const captureDestination: Destination.Instance = {
      type: 'capture',
      config: {},
      push: async (event, ctx) => {
        captured.push({ ...event, ingest: ctx.ingest as Ingest });
      },
    };

    const { collector } = await startFlow({
      consent: { functional: true },
      sources: {
        express: {
          code: sourceExpress,
          // No port: use the handler in-process via the source's `push`.
          config: {
            settings: { paths: ['/collect'] },
            ingest: { map: { testId: { key: 'headers.x-test-id' } } },
          },
        },
      },
      destinations: {
        capture: { code: captureDestination },
      },
    });

    const expressSource = Source.getSource<ExpressTypes>(collector, 'express');

    const mockRequest = (id: number): Request =>
      ({
        method: 'POST',
        url: '/collect',
        // Plain-object headers and body — getByPath descends correctly
        // when the value is a literal object (not a class instance).
        headers: {
          'content-type': 'application/json',
          'x-test-id': String(id),
        },
        body: { name: 'page view', data: { id } },
      }) as unknown as Request;

    const mockResponse = () => {
      const captures: { status: number; body: unknown }[] = [];
      let currentStatus = 200;
      const res = {
        status: (code: number) => {
          currentStatus = code;
          return res;
        },
        set: () => res,
        send: (body?: unknown) => {
          captures.push({ status: currentStatus, body });
          return res;
        },
        json: (body: unknown) => {
          captures.push({ status: currentStatus, body });
          return res;
        },
      };
      return { res: res as unknown as Response, captures };
    };

    const calls = Array.from({ length: N }, (_, id) => {
      const { res, captures } = mockResponse();
      const req = mockRequest(id);
      return { id, req, res, captures };
    });

    // Fire all N concurrent handler invocations. Promise.all interleaves
    // via the event loop; crosstalk would show up as wrong-id ingest or
    // mismatched response captures.
    await Promise.all(
      calls.map(({ req, res }) => expressSource.push(req, res)),
    );

    // Every captured event's ingest carries its own testId — no crosstalk.
    expect(captured).toHaveLength(N);
    const seenIngestIds = new Set<string>();
    for (const event of captured) {
      const eventDataId = (event.data as { id: number }).id;
      const ingestTestId = (event.ingest as Ingest).testId as string;
      expect(String(eventDataId)).toBe(ingestTestId);
      expect(seenIngestIds.has(ingestTestId)).toBe(false);
      seenIngestIds.add(ingestTestId);
    }
    expect(seenIngestIds.size).toBe(N);

    // Every request got exactly one response with status 200.
    for (const { captures } of calls) {
      expect(captures).toHaveLength(1);
      expect(captures[0].status).toBe(200);
      const body = captures[0].body as { success: boolean };
      expect(body.success).toBe(true);
    }
  });
});
