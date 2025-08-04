export interface BannerTextProps {
  headline: string;
  subtitle: string;
  className?: string;
}

export const BannerText = ({
  headline,
  subtitle,
  className = '',
}: BannerTextProps) => {
  return (
    <div className={`space-y-2 ${className}`}>
      <h1 className="banner-headline text-4xl md:text-5xl font-bold leading-tight mb-2">
        {headline}
      </h1>
      <h3 className="banner-subtitle text-lg md:text-xl font-medium">
        {subtitle}
      </h3>
    </div>
  );
};
