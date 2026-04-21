import type {
  Env,
  RedisClientConstructor,
  RedisClientMock,
  RedisPipelineMock,
  XaddArg,
} from '../types';

// Narrow helper type aliases so the mock SDK is typed explicitly without `any`.
type XaddFn = (...args: XaddArg[]) => Promise<string | null>;
type QuitFn = () => Promise<string>;

const asyncXadd: XaddFn = () => Promise.resolve('1700000100000-0');
const asyncQuit: QuitFn = () => Promise.resolve('OK');

function createMockPipeline(): RedisPipelineMock {
  const pipeline: RedisPipelineMock = {
    xadd: () => pipeline,
    exec: () => Promise.resolve([]),
  };
  return pipeline;
}

class MockRedisClient implements RedisClientMock {
  constructor(_urlOrOptions: string | Record<string, unknown>) {}
  xadd: XaddFn = asyncXadd;
  pipeline(): RedisPipelineMock {
    return createMockPipeline();
  }
  quit: QuitFn = asyncQuit;
  on(): unknown {
    return this;
  }
}

const MockRedisConstructor: RedisClientConstructor = MockRedisClient;

export const push: Env = {
  Redis: {
    Client: MockRedisConstructor,
  },
};

export const simulation = ['call:client.xadd'];
