export type IconProps = {
  size?: number | string; // width/height of the icon
  color?: string; // currentColor by default
  strokeWidth?: number; // for stroke-based icons
  className?: string;
  title?: string; // accessible title
} & React.SVGProps<SVGSVGElement>;
