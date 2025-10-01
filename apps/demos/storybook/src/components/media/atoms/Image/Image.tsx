import { createTrackingProps, type DataElb } from '../../../../utils/tagger';
import { assign } from '@walkeros/core';

export interface ImageProps {
  type: 'thumbnail' | 'banner' | 'postcard';
  style?: number;
  alt?: string;
  title?: string;
  className?: string;
  dataElb?: DataElb;
}

export const Image = ({
  type,
  style = 1,
  alt,
  title,
  className = '',
  dataElb,
}: ImageProps) => {
  const getPlaceholderColor = (
    styleNum: number,
    alt: string = '',
    title: string = '',
  ) => {
    const colors = [
      'from-blue-200 to-blue-800',
      'from-purple-800 to-purple-500',
      'from-green-200 to-green-400',
      'from-orange-300 to-orange-200',
      'from-pink-900 to-pink-300',
      'from-teal-400 to-teal-700',
      'from-red-800 to-red-300',
      'from-blue-700 to-blue-300',
      'from-indigo-600 to-indigo-800',
      'from-gray-200 to-gray-800',
      'from-yellow-200 to-yellow-800',
      'from-cyan-200 to-cyan-800',
      'from-emerald-200 to-emerald-800',
      'from-fuchsia-200 to-fuchsia-800',
      'from-violet-200 to-violet-800',
      'from-rose-200 to-rose-800',
      'from-amber-200 to-amber-800',
      'from-sky-200 to-sky-800',
      'from-lime-200 to-lime-800',
    ];
    return colors[(styleNum + title.length + alt.length) % colors.length];
  };

  const placeholderColor = getPlaceholderColor(style, alt, title);

  const styles = [
    ['text-base', 'text-lg', 'text-xl'], // sizes
    [
      'font-light',
      'font-normal',
      'font-medium',
      'font-semibold',
      'font-bold',
      'font-extrabold',
      'font-black',
    ], // weights
    [
      'tracking-tight',
      'tracking-normal',
      'tracking-wide',
      'tracking-wider',
      'tracking-widest',
    ], // spacing
    ['font-sans', 'font-serif', 'font-mono'], // font families
  ];

  const getStyle = (styleNum: number, title: string = '', alt: string = '') => {
    const seed = styleNum + title.length + alt.length;
    const size = styles[0][seed % styles[0].length];
    const weight = styles[1][seed % styles[1].length];
    const spacing = styles[2][seed % styles[2].length];
    const family = styles[3][seed % styles[3].length];
    return `${size} ${weight} ${spacing} ${family}`;
  };

  const titleStyle = getStyle(style, title, alt);

  const typeClasses = {
    thumbnail: 'aspect-video rounded-lg',
    banner: 'aspect-[16/6] rounded-xl',
    postcard: 'aspect-[16/20] rounded-xl',
  };

  const trackingProps = createTrackingProps(
    assign(
      {
        data: {
          img: `id-${titleStyle.length}`,
          type: type,
          ...(title && { title }),
          ...(alt && { alt }),
        },
      },
      dataElb,
    ),
    'Image',
  );

  return (
    <div
      {...trackingProps}
      className={`${typeClasses[type]} bg-gradient-to-br ${placeholderColor} flex items-center justify-center ${className}`}
    >
      <div className="text-center text-white dark:text-white">
        {title && <div className={`${titleStyle} mb-1`}>{title}</div>}
        <div className={`opacity-75`}>{alt}</div>
      </div>
    </div>
  );
};
