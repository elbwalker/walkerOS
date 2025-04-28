import {
  Content as ContentOrg,
  CustomData as CustomDataOrg,
  EventRequest as EventRequestOrg,
  ServerEvent as ServerEventOrg,
  UserData as UserDataOrg,
} from 'facebook-nodejs-business-sdk';

// Create a global mock function that can be accessed from tests
const globalMockFn = (global as any).__facebookMockFn || jest.fn();
(global as any).__facebookMockFn = globalMockFn;

// Export the mock function
export const mockFn = globalMockFn;

// Create mock implementations
export class Content {
  constructor(...args: ConstructorParameters<typeof ContentOrg>) {
    mockFn('Content', args);
  }
}

export class CustomData {
  constructor(...args: ConstructorParameters<typeof CustomDataOrg>) {
    mockFn('CustomData', args);
  }
}

export class EventRequest {
  constructor(...args: ConstructorParameters<typeof EventRequestOrg>) {
    mockFn('EventRequest', ...args);
    return this;
  }

  setDebugMode(debug: boolean) {
    mockFn('EventRequest.setDebugMode', debug);
    return this;
  }

  execute() {
    mockFn('EventRequest.execute');
    return this;
  }
}

export class ServerEvent {
  constructor(...args: ConstructorParameters<typeof ServerEventOrg>) {
    mockFn('ServerEvent', args);
  }

  setEventId(id: string) {
    mockFn('ServerEvent.setEventId', id);
    return this;
  }

  setEventName(name: string) {
    mockFn('ServerEvent.setEventName', name);
    return this;
  }

  setEventTime(time: number) {
    mockFn('ServerEvent.setEventTime', time);
    return this;
  }

  setUserData(userData: UserData) {
    mockFn('ServerEvent.setUserData', userData);
    return this;
  }

  setCustomData(customData: CustomData) {
    mockFn('ServerEvent.setCustomData', customData);
    return this;
  }

  setEventSourceUrl(url: string) {
    mockFn('ServerEvent.setEventSourceUrl', url);
    return this;
  }

  setActionSource(source: string) {
    mockFn('ServerEvent.setActionSource', source);
    return this;
  }
}

export class UserData {
  constructor(...args: ConstructorParameters<typeof UserDataOrg>) {
    mockFn('UserData', args);
  }

  setExternalIds(ids: string[]) {
    mockFn('UserData.setExternalIds', ids);
    return this;
  }
}
