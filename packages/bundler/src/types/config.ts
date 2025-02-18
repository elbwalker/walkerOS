interface BaseTag {
  type: string;
  active: boolean;
}

interface WalkerJSTag extends BaseTag {
  type: 'walkerjs';
  config: {
    run: boolean;
    globalsStatic: {
      timeId: string;
      [key: string]: string;
    };
  };
}

interface DestinationTag extends BaseTag {
  type: 'destination';
  config: {
    url: string;
    transport: 'beacon' | 'xhr' | 'fetch';
  };
}

interface CustomCodeTag extends BaseTag {
  type: 'customCode';
  config: {
    code: string;
  };
}

type Tag = WalkerJSTag | DestinationTag | CustomCodeTag;

export interface BundlerConfig {
  tags: Tag[];
}
