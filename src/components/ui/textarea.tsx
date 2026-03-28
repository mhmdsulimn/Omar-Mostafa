import * as React from 'react';

import {cn} from '@/lib/utils';

const Textarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<'textarea'>>(
  ({className, ...props}, ref) => {
    return (
      <textarea
        className={cn(
          'flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:border-primary focus-visible:shadow-[0_0_0_1px_hsl(var(--primary-glow))] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
          'text-right placeholder:text-right',
          className
        )}
        ref={ref}
        dir="auto"
        {...props}
      />
    );
  }
);
Textarea.displayName = 'Textarea';

export {Textarea};
