export interface ImageProps {
  type: 'thumbnail' | 'banner';
  src?: string;
  alt: string;
  title?: string;
  className?: string;
}

export const Image = ({ type, src, alt, title, className = '' }: ImageProps) => {
  const placeholderColor = type === 'banner' ? 'from-primary-700 to-primary-900' : 'from-surface-700 to-surface-900';
  
  const typeClasses = {
    thumbnail: 'aspect-video rounded-lg',
    banner: 'aspect-[16/6] rounded-xl',
  };

  if (!src) {
    return (
      <div className={`${typeClasses[type]} bg-gradient-to-br ${placeholderColor} flex items-center justify-center ${className}`}>
        <div className="text-center text-white dark:text-white">
          {title && <div className="font-semibold text-lg mb-1">{title}</div>}
          <div className="text-sm opacity-75">{alt}</div>
        </div>
      </div>
    );
  }

  return (
    <div className={`${typeClasses[type]} overflow-hidden ${className}`}>
      <img
        src={src}
        alt={alt}
        className="w-full h-full object-cover"
      />
      {title && type === 'banner' && (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6">
          <h2 className="text-white text-2xl font-bold">{title}</h2>
        </div>
      )}
    </div>
  );
};