import React from 'react';
import MappingConfig from '../organisms/mapping';
import { formatValue, parseInput } from '../molecules/codeBox';

interface LMRCodeBoxesProps {
  left: string;
  middle: string;
  right?: string;
  height?: number;
  smallText?: boolean;
  className?: string;
  showMiddle?: boolean; // @TODO remove
  labelLeft?: string;
  labelMiddle?: string;
  labelRight?: string;
  disabledLeft?: boolean;
  disabledMiddle?: boolean;
  disabledRight?: boolean;
  fn?: (left, middle, log, options) => void;
}

export const LMRCodeBoxes: React.FC<LMRCodeBoxesProps> = ({
  left,
  middle = '',
  right,
  height,
  smallText,
  className,
  showMiddle,
  labelLeft,
  labelMiddle = 'Event Config',
  labelRight,
  disabledLeft,
  disabledMiddle,
  disabledRight,
  fn,
}) => {
  return (
    <MappingConfig
      left={formatValue(left)}
      middle={formatValue(middle)}
      right={formatValue(right)}
      height={height}
      smallText={smallText}
      className={className}
      showMiddle={showMiddle}
      labelLeft={labelLeft}
      labelMiddle={labelMiddle}
      labelRight={labelRight}
      disabledLeft={disabledLeft}
      disabledMiddle={disabledMiddle}
      disabledRight={disabledRight}
      fn={fn}
    />
  );
};
