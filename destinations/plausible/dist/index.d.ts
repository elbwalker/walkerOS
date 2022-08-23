import { WebDestination } from '@elbwalker/walker.js';
declare global {
    interface Window {
        plausible?: any;
    }
}
export interface DestinationPlausible extends WebDestination.Function {
    config: WebDestination.Config & {
        domain?: string;
        scriptLoad?: boolean;
    };
}
export declare const destination: DestinationPlausible;
export default destination;
