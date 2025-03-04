import type { WalkerOS } from '@elbwalker/types';
import React, { useCallback } from 'react';
import MappingConfig from '../organisms/mapping';
import { formatValue } from '../molecules/codeBox';

interface LMRCodeBoxesProps {
  left: string;
  middle: string;
  right?: string;
  height?: number;
  smallText?: boolean;
  className?: string;
  labelLeft?: string;
  labelMiddle?: string;
  labelRight?: string;
  disabledLeft?: boolean;
  disabledMiddle?: boolean;
  disabledRight?: boolean;
}

export const LMRCodeBoxes: React.FC<LMRCodeBoxesProps> = ({
  left,
  middle,
  right,
  height,
  smallText,
  className,
  labelLeft,
  labelMiddle = 'Event Config',
  labelRight,
  disabledLeft,
  disabledMiddle,
  disabledRight,
}) => {
  return (
    <MappingConfig
      left={formatValue(left)}
      middle={formatValue(middle)}
      right={formatValue(right)}
      height={height}
      smallText={smallText}
      className={className}
      labelLeft={labelLeft}
      labelMiddle={labelMiddle}
      labelRight={labelRight}
      disabledLeft={disabledLeft}
      disabledMiddle={disabledMiddle}
      disabledRight={disabledRight}
    />
  );
};
