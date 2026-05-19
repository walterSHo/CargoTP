import type { ReactNode } from 'react';

export function PageHeader({
  title,
  description,
  aside
}: {
  title: string;
  description?: string;
  aside?: ReactNode;
}) {
  return (
    <section className="page-header">
      <div className="page-header-copy motion-fade-up">
        <h1 className="page-header-title">{title}</h1>
        {description ? <p className="page-header-note mt-2 text-sm leading-6 md:text-base">{description}</p> : null}
      </div>
      {aside ? <div className="motion-fade-up lg:min-w-[260px]">{aside}</div> : null}
    </section>
  );
}
