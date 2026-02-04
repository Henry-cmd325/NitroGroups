import * as React from 'react';
import { IconProps } from './types';

export function PlayIcon({
  size = 24,
  color = 'currentColor',
  strokeWidth = 1.5,
  className,
  title,
  ...props
}: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      className={className}
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : 'presentation'}
      {...props}
    >
      {title ? <title>{title}</title> : null}
      <polygon points="5 3 19 12 5 21 5 3"></polygon>
    </svg>
  );
}

export default PlayIcon;
