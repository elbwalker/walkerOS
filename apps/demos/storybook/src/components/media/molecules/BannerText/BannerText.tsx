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
      <h1 className="mb-2 text-heading-md text-fg md:text-heading-xl">
        {headline}
      </h1>
      <h3 className="text-body-lg text-fg-2 md:text-lead">{subtitle}</h3>
    </div>
  );
};
