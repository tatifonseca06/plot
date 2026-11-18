export type IconName =
  | "grid"
  | "compass"
  | "users"
  | "ticket"
  | "calendar"
  | "arrow"
  | "plus"
  | "search"
  | "pin"
  | "check"
  | "spark"
  | "edit"
  | "clock"
  | "exit"
  | "chevron"
  | "lock"
  | "trash"
  | "eye";
const paths: Record<IconName, string> = {
  grid: "M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z",
  compass: "M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-5-4-3 5-5 3 3-5 5-3Z",
  users:
    "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M16 3a4 4 0 0 1 0 8M22 21v-2a4 4 0 0 0-3-3.87M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z",
  ticket: "M3 5h18v5a2 2 0 0 0 0 4v5H3v-5a2 2 0 0 0 0-4V5Zm12 0v3m0 3v2m0 3v3",
  calendar:
    "M8 2v4m8-4v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14H3V6a2 2 0 0 1 2-2ZM7 14h2m3 0h2m3 0h1M7 17h2m3 0h2",
  arrow: "M4 12h16m-6-6 6 6-6 6",
  plus: "M12 5v14M5 12h14",
  search: "m21 21-5-5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z",
  pin: "M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Zm-5 0a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z",
  check: "m5 12 4 4L19 6",
  spark: "m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3Z",
  edit: "m15 5 4 4M4 20l4-1L20 7a2.8 2.8 0 0 0-4-4L4 15l-1 6Z",
  clock: "M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM12 7v5l3 2",
  exit: "M9 4H4v16h5m5-13 5 5-5 5M9 12h10",
  chevron: "m9 5 7 7-7 7",
  lock: "M6 10h12v11H6V10Zm2 0V6a4 4 0 0 1 8 0v4m-4 5v2",
  trash: "M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14M10 10v7M14 10v7",
  eye: "M2 12s3-7 10-7 10 7 10 7-3 7-10 7S2 12 2 12Zm13 0a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z",
};
export function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[name]} />
    </svg>
  );
}
export function Cover({
  theme = "LAVENDER",
  category = "Tu próximo plan",
  compact = false,
}: {
  theme?: string;
  category?: string;
  compact?: boolean;
}) {
  return (
    <div data-theme={theme} data-compact={compact} className="plot-cover">
      <svg
        viewBox="0 0 480 200"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
      >
        <circle cx="420" cy="0" r="150" fill="currentColor" opacity=".09" />
        <circle cx="70" cy="220" r="125" fill="currentColor" opacity=".06" />
        <path
          d="M35 160C130 190 100 25 230 70S340 190 445 55"
          stroke="currentColor"
          strokeWidth="2"
          strokeDasharray="7 7"
          fill="none"
          opacity=".25"
        />
        <circle cx="230" cy="70" r="10" fill="currentColor" opacity=".25" />
        <path
          d="m350 25 8 21 21 8-21 8-8 21-8-21-21-8 21-8Z"
          fill="currentColor"
          opacity=".18"
        />
      </svg>
      <span>
        <Icon
          name={
            category === "Aventura"
              ? "compass"
              : category === "Gastronomía"
                ? "users"
                : "spark"
          }
          size={compact ? 24 : 34}
        />
        <span>{category}</span>
      </span>
    </div>
  );
}
