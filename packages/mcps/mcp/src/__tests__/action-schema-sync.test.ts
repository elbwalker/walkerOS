import { createLocalRuntime } from '../runtime/local.js';
import './support/version.js';

// Mock @walkeros/core so mcpError/mcpResult render a parseable shape: we read
// `isError` and pull the canonical message out of content[0].text. This mirrors
// the per-tool tests so the real handlers run against a faithful stub.
jest.mock('@walkeros/core', () => ({
  mcpResult: jest.fn((result, hints) => ({
    content: [
      {
        type: 'text',
        text: JSON.stringify(
          hints ? { ...result, _hints: hints } : result,
          null,
          2,
        ),
      },
    ],
    structuredContent: hints ? { ...result, _hints: hints } : result,
  })),
  mcpError: jest.fn((error, hint) => ({
    content: [
      {
        type: 'text',
        text: JSON.stringify({
          error: error instanceof Error ? error.message : 'Unknown error',
          ...(hint ? { hint } : {}),
        }),
      },
    ],
    isError: true,
  })),
}));

// flow_simulate pulls these in at module-eval; the schema-shape and the no-step
// guard never reach them, but they must resolve for the import to succeed.
jest.mock('@walkeros/cli/dev', () => jest.requireActual('@walkeros/cli/dev'));

jest.mock('@walkeros/cli', () => ({
  simulateSource: jest.fn(),
  simulateTransformer: jest.fn(),
  simulateDestination: jest.fn(),
}));

import { z } from 'zod';
import type { ZodRawShape } from 'zod';
import {
  FLOW_MANAGE_REQUIREMENTS,
  DEPLOY_MANAGE_REQUIREMENTS,
  PROJECT_MANAGE_REQUIREMENTS,
  SECRET_MANAGE_REQUIREMENTS,
  FRAME_MANAGE_REQUIREMENTS,
} from '../action-requirements.js';
import type {
  ActionRequirementMap,
  ActionRule,
} from '../action-requirements.js';
import { createFlowManageToolSpec } from '../tools/flow-manage.js';
import { createDeployManageToolSpec } from '../tools/deploy-manage.js';
import { createProjectManageToolSpec } from '../tools/project-manage.js';
import { createSecretManageToolSpec } from '../tools/secret-manage.js';
import { createFrameManageToolSpec } from '../tools/frame-manage.js';
import { createFlowSimulateToolSpec } from '../tools/simulate.js';
import type { ToolSpec } from '../tool-spec.js';
import { stubClient } from './support/stub-client.js';
import { isErrorResult, record, str, textOf } from './support/tool-result.js';

function errorText(result: unknown): string {
  expect(isErrorResult(result)).toBe(true);
  const parsed: unknown = JSON.parse(textOf(result));
  return str(record(parsed).error);
}

/** A registered param schema, narrowed to the classic zod type it is built as. */
function zodType(schema: unknown): z.ZodType {
  if (!(schema instanceof z.ZodType)) {
    throw new Error('Registered param is not a zod schema');
  }
  return schema;
}

function describeOf(shape: ZodRawShape, param: string): string {
  const schema = shape[param];
  expect(schema).toBeDefined();
  const description = zodType(schema).description;
  expect(typeof description).toBe('string');
  return description ?? '';
}

/**
 * A tool whose required params are driven by an exported requirement map. The
 * map is the single source of truth; this test asserts the registered schema
 * description and the handler guard agree with it for every map-listed param.
 */
interface MapDrivenTool {
  name: string;
  spec: ToolSpec;
  map: ActionRequirementMap;
  /** A satisfying value for every param the map can require, so the test can
   *  omit exactly one and leave the rest present. */
  satisfied: Record<string, string>;
}

const mapDrivenTools: MapDrivenTool[] = [
  {
    name: 'flow_manage',
    spec: createFlowManageToolSpec(stubClient()),
    map: FLOW_MANAGE_REQUIREMENTS,
    satisfied: {
      flowId: 'flow_1',
      previewId: 'prv_1',
      name: 'My Flow',
      flowName: 'demo',
      flowSettingsId: 'set_1',
    },
  },
  {
    name: 'deploy_manage',
    spec: createDeployManageToolSpec(stubClient()),
    map: DEPLOY_MANAGE_REQUIREMENTS,
    satisfied: {
      flowId: 'flow_1',
    },
  },
  {
    name: 'project_manage',
    spec: createProjectManageToolSpec(stubClient()),
    map: PROJECT_MANAGE_REQUIREMENTS,
    satisfied: {
      projectId: 'proj_1',
      name: 'My Project',
    },
  },
  {
    name: 'secret_manage',
    spec: createSecretManageToolSpec(stubClient()),
    map: SECRET_MANAGE_REQUIREMENTS,
    satisfied: {
      flowId: 'flow_1',
      name: 'SLACK_WEBHOOK_URL',
      value: 'https://example.test/hook',
      secretId: 'sec_1',
    },
  },
  {
    name: 'frame_manage',
    spec: createFrameManageToolSpec(stubClient()),
    map: FRAME_MANAGE_REQUIREMENTS,
    satisfied: {
      pageKey: 'https://shop.example/cart',
      frameId: 'frm_V1StGXR8Z5jdHi6BmyT7K',
    },
  },
];

/** Build a base input that satisfies every map-required param of an action, so
 *  a test can omit exactly one and isolate that param's guard. */
function satisfyingInput(
  tool: MapDrivenTool,
  action: string,
  rule: ActionRule,
): Record<string, unknown> {
  const input: Record<string, unknown> = { action };
  for (const param of rule.required ?? []) {
    input[param] = tool.satisfied[param];
  }
  for (const group of rule.oneOf ?? []) {
    // Satisfy the first member so omitting a `required` param isolates it.
    input[group[0]] = tool.satisfied[group[0]];
  }
  return input;
}

describe('action ↔ schema ↔ handler contract is in sync', () => {
  for (const tool of mapDrivenTools) {
    describe(`${tool.name}`, () => {
      for (const [action, rule] of Object.entries(tool.map)) {
        for (const param of rule.required ?? []) {
          it(`schema description for "${param}" mentions the "${action}" action`, () => {
            const description = describeOf(tool.spec.inputSchema, param);
            expect(description).toContain(action);
          });

          it(`handler errors "${param} is required for ${action} action" when "${param}" omitted`, async () => {
            const input = satisfyingInput(tool, action, rule);
            delete input[param];
            const result = await tool.spec.handler(input);
            // A param the input shape itself requires is refused by the
            // shape, before the per-action guard runs.
            const shapeRequired = !z
              .object(tool.spec.inputSchema)
              .pick({ [param]: true })
              .safeParse({}).success;
            expect(errorText(result)).toContain(
              shapeRequired
                ? `${param}: Invalid input: expected string, received undefined`
                : `${param} is required for ${action} action`,
            );
          });
        }

        for (const group of rule.oneOf ?? []) {
          it(`handler errors "requires one of: ${group.join(', ')}" when none of [${group.join(
            ', ',
          )}] present for "${action}"`, async () => {
            // Satisfy all hard-required params, omit the entire oneOf group.
            const input: Record<string, unknown> = { action };
            for (const r of rule.required ?? []) {
              input[r] = tool.satisfied[r];
            }
            const result = await tool.spec.handler(input);
            const message = errorText(result);
            expect(message).toContain('requires one of');
            for (const member of group) {
              expect(message).toContain(member);
            }
          });
        }
      }
    });
  }

  describe('flow_simulate.step', () => {
    const spec = createFlowSimulateToolSpec(stubClient(), createLocalRuntime());

    it('registers step as a required (non-optional) zod string', () => {
      const stepSchema = zodType(spec.inputSchema.step);
      expect(stepSchema.safeParse('destination.gtag').success).toBe(true);
      expect(stepSchema.safeParse(undefined).success).toBe(false);
      expect(stepSchema.isOptional()).toBe(false);
    });

    it('handler errors "step is required" when step omitted (event present)', async () => {
      const result = await spec.handler({
        configPath: './flow.json',
        event: '{"name":"page view"}',
        flow: undefined,
        platform: undefined,
        step: undefined,
      });
      expect(errorText(result)).toBe(
        'step: Invalid input: expected string, received undefined',
      );
    });
  });
});
