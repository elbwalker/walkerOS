import { ButtonPrimary, ButtonSecondary } from '../molecules/buttons';

interface Props {
  title: string;
  description: string;
  position: string;
}

export default function CTA({ title, description, position }: Props) {
  return (
    <div
      data-elb="promotion"
      data-elbaction="visible"
      data-elb-promotion={`position:${position}`}
      className="max-w-7xl mx-auto text-center py-12 px-4 sm:px-6 lg:py-16 lg:px-8"
    >
      <h2 className="text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl">
        <span data-elb-promotion={`title:${title}`} className="block">
          {title}
        </span>
        <span className="block">{description}</span>
      </h2>
      <div className="mt-8 flex justify-center">
        <div className="inline-flex rounded-md shadow">
          <ButtonPrimary action="start" label="Get started" />
        </div>
        <div className="ml-3 inline-flex">
          <ButtonSecondary action="learn" label="Learn more" />
        </div>
      </div>
    </div>
  );
}
