import { WebDestination } from '@elbwalker/walker.js';
declare global {
    interface Window {
        gtag: Function;
    }
}
export declare namespace DestinationGA4 {
    interface Config extends WebDestination.Config {
        custom: {
            measurementId: string;
            transport_url?: string;
        };
        mapping?: WebDestination.Mapping<EventConfig>;
    }
    interface Function extends WebDestination.Function {
        config: Config;
    }
    interface EventConfig extends WebDestination.EventConfig {
    }
}
declare const destination: DestinationGA4.Function;
export default destination;
