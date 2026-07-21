type IconProps = {
  className?: string;
};

// トップ・マスタ管理のメニュータイル用アイコン(丸い淡緑の背景の中に配置する想定)。
// 装飾目的のためaria-hiddenにする。

function BaseIcon({
  className,
  children,
}: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      aria-hidden="true"
      className={className ?? "size-5"}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  );
}

export function DocumentIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M7 3h7l4 4v14H7z" />
      <path d="M14 3v4h4" />
      <path d="M9.5 12.5h5M9.5 16h5" />
    </BaseIcon>
  );
}

export function ListIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M8 6h11M8 12h11M8 18h11" />
      <path d="M4 6h.01M4 12h.01M4 18h.01" />
    </BaseIcon>
  );
}

export function ChartIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M4 19V5M4 19h16" />
      <path d="M8 15v-3M12.5 15V8M17 15v-5" />
    </BaseIcon>
  );
}

export function GearIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 4v2M12 18v2M4 12h2M18 12h2M6.3 6.3l1.4 1.4M16.3 16.3l1.4 1.4M6.3 17.7l1.4-1.4M16.3 7.7l1.4-1.4" />
    </BaseIcon>
  );
}

export function UsersIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <circle cx="9" cy="8" r="3" />
      <path d="M3.5 19a5.5 5.5 0 0 1 11 0" />
      <circle cx="17" cy="9" r="2.3" />
      <path d="M14.5 19a4 4 0 0 1 5.5-3.7" />
    </BaseIcon>
  );
}

export function BuildingIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M4 21V5a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v16" />
      <path d="M12 10h6a1 1 0 0 1 1 1v10" />
      <path d="M7 8h1M7 12h1M7 16h1M15 13h1M15 17h1" />
    </BaseIcon>
  );
}

export function BadgeIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <circle cx="12" cy="9" r="5" />
      <path d="M9 13.5 7.5 21 12 18.5 16.5 21 15 13.5" />
    </BaseIcon>
  );
}

export function SparkleIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M12 3v4M12 17v4M3 12h4M17 12h4" />
      <path d="M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18" />
    </BaseIcon>
  );
}

export function MapPinIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21z" />
      <circle cx="12" cy="9.5" r="2.3" />
    </BaseIcon>
  );
}
