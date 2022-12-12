/// <reference types="facebook-pixel" />
import { WebDestination } from '@elbwalker/walker.js';
declare global {
    interface Window {
        _fbq?: facebook.Pixel.Event;
        fbq?: facebook.Pixel.Event;
    }
}
export declare namespace DestinationMeta {
    interface Config extends WebDestination.Config {
        custom?: {
            pixelId?: string;
            currency?: string;
            pageview?: boolean;
        };
        mapping?: WebDestination.Mapping<EventConfig>;
    }
    interface Function extends WebDestination.Function {
        config: Config;
    }
    interface EventConfig extends WebDestination.EventConfig {
        id?: string;
        name?: string;
        track?: StandardEventNames;
        value?: string;
    }
    type StandardEventNames = 'AddPaymentInfo' | 'AddToCart' | 'AddToWishlist' | 'CompleteRegistration' | 'Contact' | 'CustomizeProduct' | 'Donate' | 'FindLocation' | 'InitiateCheckout' | 'Lead' | 'Purchase' | 'Schedule' | 'Search' | 'StartTrial' | 'SubmitApplication' | 'Subscribe' | 'ViewContent';
    interface StartSubscribeParameters {
        currency?: string;
        predicted_ltv?: number;
        value?: number;
    }
}
export declare const destination: DestinationMeta.Function;
export default destination;
