// walkerOS design system — window.WalkerOS (React 18). Documentation types.

/** Full-width `primary` strip above the header announcing the latest release. */
export interface AnnouncementBarProps { children: React.ReactNode; linkLabel?: string; href?: string; }
export declare function AnnouncementBar(props: AnnouncementBarProps): JSX.Element;

/** Sticky 60px site header with the walkerOS wordmark, primary nav, GitHub link and theme toggle. */
export interface SiteHeaderProps { links?: { label: string; href: string }[]; theme?: 'dark' | 'light'; onToggleTheme?: () => void; githubHref?: string; homeHref?: string; }
export declare function SiteHeader(props: SiteHeaderProps): JSX.Element;

/** The walkerOS call-to-action: a `primary` fill with `on-primary` text, or a flat `surface` secondary. */
export interface ButtonProps { children: React.ReactNode; href?: string; onClick?: () => void; variant?: 'primary' | 'secondary'; arrow?: boolean; block?: boolean; className?: string; }
export declare function Button(props: ButtonProps): JSX.Element;

/** A copy-to-clipboard chip for the CLI install command, set in `mono`. */
export interface InstallCommandProps { command?: string; }
export declare function InstallCommand(props: InstallCommandProps): JSX.Element;

/** Inline or stacked list of short claims, each led by a `primary` check. */
export interface CheckListProps { items: React.ReactNode[]; layout?: 'inline' | 'stack'; align?: 'start' | 'center'; }
export declare function CheckList(props: CheckListProps): JSX.Element;

/** Eyebrow, heading and optional lead — the opening of every section, or the hero when `level` is 1. */
export interface SectionHeadingProps { title: React.ReactNode; eyebrow?: string; lead?: React.ReactNode; level?: 1 | 2; highlight?: React.ReactNode; align?: 'start' | 'center'; }
export declare function SectionHeading(props: SectionHeadingProps): JSX.Element;

/** Numbered card naming one problem, in a three-up `auto-fit` grid (min 280px, gap `space-5`). */
export interface ProblemCardProps { number: string; title: React.ReactNode; children: React.ReactNode; }
export declare function ProblemCard(props: ProblemCardProps): JSX.Element;

/** A checked feature with title, one-sentence description and a `Docs →` link. */
export interface FeatureItemProps { title: React.ReactNode; children: React.ReactNode; href?: string; linkLabel?: string; }
export declare function FeatureItem(props: FeatureItemProps): JSX.Element;

/** A service tier: label, name, description, checked features and a full-width CTA. */
export interface PlanCardProps { label: string; title: React.ReactNode; children: React.ReactNode; features?: React.ReactNode[]; cta?: { label: string; href?: string }; highlight?: boolean; }
export declare function PlanCard(props: PlanCardProps): JSX.Element;

/** A native `<details>` disclosure for one FAQ question, stacked 12px apart (max 900px). */
export interface FaqItemProps { question: React.ReactNode; children: React.ReactNode | React.ReactNode[]; open?: boolean; }
export declare function FaqItem(props: FaqItemProps): JSX.Element;

/** Mono code token inside prose: attribute names, function calls, event names. */
export interface InlineCodeProps { children: React.ReactNode; }
export declare function InlineCode(props: InlineCodeProps): JSX.Element;

/** The fixed colour key for the five parts of a walkerOS event, as used in every product visualisation. */
export interface EventLegendProps { parts?: Array<'entity' | 'action' | 'property' | 'context' | 'globals'>; }
export declare function EventLegend(props: EventLegendProps): JSX.Element;

/** Footer on `bg-2` with the brand statement, four link columns and the copyright line. */
export interface SiteFooterProps { statement?: React.ReactNode; columns?: { title: string; links: [string, string][] }[]; copyright?: React.ReactNode; }
export declare function SiteFooter(props: SiteFooterProps): JSX.Element;

/** Hero demo: `data-elb` attributes are typed into an article teaser, the card lights up as each part is tagged, a cursor clicks it, and the events land in a live `walkerOS.events` table. */
export interface HeroTaggingVizProps { playing?: boolean; speed?: number; startAt?: number; }
export declare function HeroTaggingViz(props: HeroTaggingVizProps): JSX.Element;

/** Tagging feature demo: one `ArticleTeaser` tagged once, walked through atom → molecule → organisms → pages, showing how every instance inherits entity, action, properties, context and globals. */
export interface ArticleTeaserTrackingProps { autoplay?: boolean; speed?: number; initialStep?: 1 | 2 | 3 | 4 | 5; }
export declare function ArticleTeaserTracking(props: ArticleTeaserTrackingProps): JSX.Element;

/** Mapping feature demo: pick one `elb()` event and see the mapping rule and the exact call it produces in GA4, Meta Pixel, TikTok Pixel and Amplitude. */
export interface DestinationMappingVizProps { initialEvent?: 0 | 1 | 2; caption?: string; }
export declare function DestinationMappingViz(props: DestinationMappingVizProps): JSX.Element;
