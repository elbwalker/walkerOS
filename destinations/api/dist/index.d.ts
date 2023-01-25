import { WebDestination } from '@elbwalker/walker.js';
declare global {
    interface Window {
    }
}
export declare namespace DestinationAPI {
    export interface Config extends WebDestination.Config {
        custom?: {
            url?: string;
            transport?: Transport;
        };
        mapping?: WebDestination.Mapping<EventConfig>;
    }
    export interface Function extends WebDestination.Function {
        config: Config;
    }
    export interface EventConfig extends WebDestination.EventConfig {
    }
    type Transport = 'fetch' | 'xhr';
    export {};
}
export declare const destination: DestinationAPI.Function;
export default destination;
