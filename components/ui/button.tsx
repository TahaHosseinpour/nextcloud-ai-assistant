import { cn } from '@/lib/utils';
import { forwardRef } from 'react';

/** Same variants as @repo/ui Button in oostaai (trimmed). */
const variants = {
    default: 'bg-foreground shadow-subtle-xs text-background font-semibold hover:opacity-90 [&>svg]:text-background',
    brand: 'bg-brand text-white font-semibold hover:opacity-90 [&>svg]:text-white',
    bordered:
        'bg-background dark:border dark:border-border shadow-subtle-xs text-foreground hover:opacity-80 [&>svg]:text-foreground font-semibold',
    secondary:
        'bg-tertiary dark:border dark:border-hard text-muted-foreground hover:opacity-80 [&>svg]:text-muted-foreground font-semibold',
    ghost: 'hover:bg-quaternary text-muted-foreground hover:text-foreground',
    destructive: 'bg-destructive text-destructive-foreground hover:opacity-90',
} as const;

const sizes = {
    default: 'h-9 px-3 text-xs md:text-sm',
    sm: 'h-8 px-3 text-xs',
    xs: 'h-7 px-2 text-xs',
    icon: 'h-8 min-w-8 text-sm',
    'icon-sm': 'h-7 min-w-7 text-sm',
    'icon-xs': 'h-6 min-w-6 text-xs',
} as const;

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: keyof typeof variants;
    size?: keyof typeof sizes;
    tooltip?: string;
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant = 'default', size = 'default', tooltip, ...props }, ref) => (
        <button
            ref={ref}
            title={tooltip}
            aria-label={tooltip}
            className={cn(
                'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg font-medium transition-colors focus-visible:outline-none disabled:pointer-events-none disabled:opacity-60 [&>svg]:text-muted-foreground',
                variants[variant],
                sizes[size],
                className
            )}
            {...props}
        />
    )
);
Button.displayName = 'Button';
