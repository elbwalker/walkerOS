import { WebDestination } from '@elbwalker/walker.js';
declare global {
    interface Window {
    }
}
export declare namespace DestinationEventPipe {
    interface Config extends WebDestination.Config {
        custom?: {
            api?: string;
            projectId?: string;
            exclusionParameters?: ExclusionParameters;
        };
        mapping?: WebDestination.Mapping<EventConfig>;
    }
    interface Function extends WebDestination.Function {
        config: Config;
    }
    interface EventConfig extends WebDestination.EventConfig {
    }
    type ExclusionParameters = string[];
}
declare const destination: DestinationEventPipe.Function;
export default destination;
