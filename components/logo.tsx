export const Logo = (props: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 32 32" fill="none" aria-hidden {...props}>
        <rect width="32" height="32" rx="16" fill="currentColor" />
        {/* cloud */}
        <path
            d="M10.5 21.5a4 4 0 0 1-.4-7.98 6 6 0 0 1 11.6-1.02 4.5 4.5 0 0 1 .3 9H10.5Z"
            fill="white"
            fillOpacity=".95"
        />
        {/* spark */}
        <path d="M16 13.2l.9 2 2 .9-2 .9-.9 2-.9-2-2-.9 2-.9.9-2Z" fill="currentColor" />
    </svg>
);
