import { WebDestination } from '@elbwalker/walker.js';
declare global {
    interface Window {
    }
}
export declare namespace DestinationGTM {
    interface Config extends WebDestination.Config {
        custom?: {
            containerId?: string;
            dataLayer?: string;
            domain?: string;
        };
        mapping?: WebDestination.Mapping<EventConfig>;
    }
    interface Function extends WebDestination.Function {
        config: Config;
    }
    interface EventConfig extends WebDestination.EventConfig {
    }
}
export declare const destination: DestinationGTM.Function;
export default destination;
