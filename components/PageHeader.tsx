import type { ReactNode } from 'react';
import { ArrowRightIcon } from '@/components/UiIcons';

export function PageHeader({
  title,
  description,
  aside,
  kicker = 'Control center'
}: {
  title: string;
  description?: string;
  aside?: ReactNode;
  kicker?: string;
}) {
  return (
    <section className="page-header page-header-shell motion-fade-up">
      <div className="page-header-copy">
        <div className="page-header-kicker">
          <span>{kicker}</span>
          <ArrowRightIcon className="h-3.5 w-3.5" />
          <span>{title}</span>
        </div>
        <h1 className="page-header-title">{title}</h1>
        {description ? <p className="page-header-note mt-2.5 max-w-3xl text-sm leading-6">{description}</p> : null}
      </div>
      {aside ? <div className="lg:min-w-[260px]">{aside}</div> : null}
    </section>
  );
}
