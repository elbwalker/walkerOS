import { Button } from '../atoms/button';

interface Props {
  label: string;
}

export const ButtonPrimary = ({ label }: Props) => {
  return (
    <Button
      label={label}
      colors="text-white bg-elbwalker-600 hover:bg-elbwalker-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-elbwalker-500"
    />
  );
};

export const ButtonSecondary = ({ label }: Props) => {
  return (
    <Button
      label={label}
      colors="text-elbwalker-700 bg-elbwalker-100 hover:bg-elbwalker-200"
    />
  );
};
