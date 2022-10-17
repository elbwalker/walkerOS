import { WebDestination } from '@elbwalker/walker.js';
declare global {
    interface Window {
        plausible?: any;
    }
}
export declare namespace DestinationPlausible {
    interface Config extends WebDestination.Config {
        custom?: {
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
export declare const destination: DestinationPlausible.Function;
export default destination;
