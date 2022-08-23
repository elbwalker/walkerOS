import { WebDestination } from "../../types";
declare global {
    interface Window {
    }
}
export interface DestinationElbwalkerEventPipe extends WebDestination.Function {
    config: WebDestination.Config & {
        projectId?: string;
        exclusionParameters?: ExclusionParameters;
    };
}
declare type ExclusionParameters = string[];
export declare const destination: DestinationElbwalkerEventPipe;
export default destination;
