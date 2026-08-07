export function MenuItem({
    label,
    onClick,
    icon: Icon,
}: {
    label: string;
    onClick: () => void;
    icon?: React.ElementType;
}) {
    return (
        <button
            onClick={onClick}
            className="flex w-full items-center gap-2 px-3 py-1.5 text-left hover:bg-accent"
        >
            {Icon && <Icon className="size-3 text-muted-foreground" />}
            {label}
        </button>
    );
}