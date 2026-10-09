import { Button } from '../../../../shared/atoms/Button';
import { Icon } from '../../../../shared/atoms/Icon';
import { useText } from '../../../../shared/language';

export interface SearchButtonProps {
  onClick?: () => void;
}

export const SearchButton = ({ onClick }: SearchButtonProps) => {
  const t = useText();
  return (
    <Button variant="icon" aria-label={t('Search')} onClick={onClick}>
      <Icon name="search" className="size-6" />
    </Button>
  );
};
