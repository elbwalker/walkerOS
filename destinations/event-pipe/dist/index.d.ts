import { WebDestination } from '@elbwalker/walker.js';
declare global {
    interface Window {
    }
}
export interface DestinationEventPipe extends WebDestination.Function {
    config: WebDestination.Config & {
        api?: string;
        projectId?: string;
        exclusionParameters?: ExclusionParameters;
    };
}
declare type ExclusionParameters = string[];
export declare const destination: DestinationEventPipe;
export default destination;
