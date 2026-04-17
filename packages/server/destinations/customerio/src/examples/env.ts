import type {
  Env,
  CustomerIoTrackClientMock,
  CustomerIoApiClientMock,
} from '../types';

type TrackNoArg = () => Promise<void>;
type TrackOne = (_id: string | number) => Promise<void>;
type TrackIdentify = (
  _id: string | number,
  _attrs: Record<string, unknown>,
) => Promise<void>;
type TrackEvent = (
  _id: string | number,
  _event: {
    name: string;
    data?: Record<string, unknown>;
    timestamp?: number;
  },
) => Promise<void>;
type TrackAnonymous = (
  _id: string,
  _event: {
    name: string;
    data?: Record<string, unknown>;
    timestamp?: number;
  },
) => Promise<void>;
type TrackPage = (
  _id: string | number,
  _url: string,
  _data?: Record<string, unknown>,
) => Promise<void>;
type TrackAddDevice = (
  _id: string | number,
  _deviceId: string,
  _platform: string,
  _data?: Record<string, unknown>,
) => Promise<void>;
type TrackDeleteDevice = (
  _id: string | number,
  _deviceId: string,
  _platform: string,
) => Promise<void>;
type TrackMerge = (
  _pt: string,
  _pi: string,
  _st: string,
  _si: string,
) => Promise<void>;
type ApiSend = (_request: unknown) => Promise<void>;

const asyncIdentify: TrackIdentify = () => Promise.resolve();
const asyncEvent: TrackEvent = () => Promise.resolve();
const asyncAnonymous: TrackAnonymous = () => Promise.resolve();
const asyncPage: TrackPage = () => Promise.resolve();
const asyncOne: TrackOne = () => Promise.resolve();
const asyncAddDevice: TrackAddDevice = () => Promise.resolve();
const asyncDeleteDevice: TrackDeleteDevice = () => Promise.resolve();
const asyncMerge: TrackMerge = () => Promise.resolve();
const asyncSend: ApiSend = () => Promise.resolve();

// Suppress unused warning for narrow helper aliases used below.
void (null as unknown as TrackNoArg);

function createMockTrackClient(): CustomerIoTrackClientMock {
  return {
    identify: asyncIdentify,
    track: asyncEvent,
    trackAnonymous: asyncAnonymous,
    trackPageView: asyncPage,
    destroy: asyncOne,
    suppress: asyncOne,
    unsuppress: asyncOne,
    addDevice: asyncAddDevice,
    deleteDevice: asyncDeleteDevice,
    mergeCustomers: asyncMerge,
  };
}

function createMockApiClient(): CustomerIoApiClientMock {
  return {
    sendEmail: asyncSend,
    sendPush: asyncSend,
  };
}

export const push: Env = {
  trackClient: createMockTrackClient(),
  apiClient: createMockApiClient(),
};

export const simulation = [
  'call:trackClient.identify',
  'call:trackClient.track',
  'call:trackClient.trackAnonymous',
  'call:trackClient.trackPageView',
  'call:trackClient.destroy',
  'call:trackClient.suppress',
  'call:trackClient.unsuppress',
  'call:trackClient.addDevice',
  'call:trackClient.deleteDevice',
  'call:trackClient.mergeCustomers',
  'call:apiClient.sendEmail',
  'call:apiClient.sendPush',
];
