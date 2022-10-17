import { Button } from '../atoms/button';

interface Props {
  label: string;
  action?: string;
}

export const ButtonPrimary = ({ label, action }: Props) => {
  return (
    <Button
      label={label}
      action={action}
      colors="text-white bg-elbwalker-600 hover:bg-elbwalker-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-elbwalker-500"
    />
  );
};

export const ButtonSecondary = ({ label, action }: Props) => {
  return (
    <Button
      label={label}
      action={action}
      colors="text-elbwalker-700 bg-elbwalker-100 hover:bg-elbwalker-200"
    />
  );
};
