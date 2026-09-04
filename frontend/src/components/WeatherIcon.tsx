import { createElement } from 'react';
import { getWeatherIconComponent } from '../lib/weather';

interface WeatherIconProps {
  icon?: string;
  condition?: string;
  className?: string;
  label?: string;
}

export default function WeatherIcon({ icon, condition, className = 'h-8 w-8', label }: WeatherIconProps) {
  const iconComponent = getWeatherIconComponent(icon, condition);
  return createElement(iconComponent, {
    className,
    'aria-hidden': label ? undefined : true,
    'aria-label': label,
  });
}
