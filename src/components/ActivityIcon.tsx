import { SessionType } from '@/types/workout';
import { CircleDot } from 'lucide-react';

import styrkeIcon from '@/assets/icons/styrke.svg?raw';
import lopingIcon from '@/assets/icons/loping.svg?raw';
import fjellturIcon from '@/assets/icons/fjelltur.svg?raw';
import svommingIcon from '@/assets/icons/svomming.svg?raw';
import syklingIcon from '@/assets/icons/sykling.svg?raw';
import gaIcon from '@/assets/icons/ga.svg?raw';
import tennisIcon from '@/assets/icons/tennis.svg?raw';
import yogaIcon from '@/assets/icons/yoga.svg?raw';
import fotballIcon from '@/assets/icons/fotball.svg?raw';
import trappemaskinIcon from '@/assets/icons/trappemaskin.svg?raw';
import roingIcon from '@/assets/icons/roing.svg?raw';
import kajakkIcon from '@/assets/icons/kajakk.svg?raw';
import tredemolleIcon from '@/assets/icons/tredemlle.svg?raw';

const iconMap: Partial<Record<SessionType, string>> = {
  styrke: styrkeIcon,
  løping: lopingIcon,
  fjelltur: fjellturIcon,
  svømming: svommingIcon,
  sykling: syklingIcon,
  gå: gaIcon,
  tennis: tennisIcon,
  yoga: yogaIcon,
  fotball: fotballIcon,
  trappemaskin: trappemaskinIcon,
  roing: roingIcon,
  kajakk: kajakkIcon,
  tredemølle: tredemolleIcon,
};

const iconDataUriCache = new Map<string, string>();

const colorizeSvg = (svg: string, color: string) =>
  svg
    .replace(/fill="(?!none)[^"]*"/gi, `fill="${color}"`)
    .replace(/stroke="(?!none)[^"]*"/gi, `stroke="${color}"`);

const getIconDataUri = (svg: string, color: string) => {
  const cacheKey = `${color}::${svg}`;
  const cached = iconDataUriCache.get(cacheKey);
  if (cached) return cached;

  const normalizedSvg = colorizeSvg(svg, color);
  const dataUri = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(normalizedSvg)}`;
  iconDataUriCache.set(cacheKey, dataUri);
  return dataUri;
};

interface ActivityIconProps {
  type: SessionType;
  className?: string;
  /** 
   * Color mode hint: 'white' for white icons (dark bg), 'colored' for activity-colored icons (light bg).
   * If a raw color string is passed, 'white'-ish colors render white, others render colored.
   * Default: white icon.
   */
  colorOverride?: string;
  style?: React.CSSProperties;
}

const ActivityIcon = ({ type, className = 'w-4 h-4', colorOverride, style: styleProp }: ActivityIconProps) => {
  const isSykling = type === 'sykling';
  const isStyrke = type === 'styrke';
  const extraStyle = { ...(isSykling ? { marginTop: '2px' } : {}), ...(isStyrke ? { marginTop: '-2px' } : {}) };
  const svg = iconMap[type];
  const resolvedColor = colorOverride || '#ffffff';

  if (!svg) {
    return <CircleDot className={className} style={{ color: colorOverride || '#fff', ...extraStyle, ...styleProp }} />;
  }

  const src = getIconDataUri(svg, resolvedColor);

  return (
    <img
      src={src}
      alt={type}
      className={className}
      style={{ ...extraStyle, ...styleProp, objectFit: 'contain' }}
      draggable={false}
    />
  );
};

export default ActivityIcon;
