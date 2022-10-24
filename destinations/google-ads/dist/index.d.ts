import { WebDestination } from '@elbwalker/walker.js';
declare global {
    interface Window {
    }
}
export declare namespace DestinationAds {
    interface Config extends WebDestination.Config {
        custom: {
            conversionId: string;
            currency?: string;
            defaultValue?: number;
        };
        mapping?: WebDestination.Mapping<EventConfig>;
    }
    interface Function extends WebDestination.Function {
        config: Config;
    }
    interface EventConfig extends WebDestination.EventConfig {
        id?: string;
        label?: string;
        value?: string;
    }
}
export declare const destination: DestinationAds.Function;
export default destination;
