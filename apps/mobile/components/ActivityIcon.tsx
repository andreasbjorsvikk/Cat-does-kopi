import React from 'react';
import * as Lucide from 'lucide-react-native';
import { SessionType } from '@/types/workout';
import { 
  FjellturIcon, 
  StyrkeIcon, 
  LopingIcon, 
  SyklingIcon, 
  GaIcon, 
  SvommingIcon, 
  TennisIcon, 
  YogaIcon, 
  FotballIcon, 
  TrappemaskinIcon, 
  RoingIcon, 
  KajakkIcon, 
  TredemolleIcon 
} from './icons/CustomActivityIcons';

interface ActivityIconProps {
  type: SessionType | string;
  size?: number;
  color?: string;
}

export const ActivityIcon = ({ type, size = 22, color = "#FFFFFF" }: ActivityIconProps) => {
  // Custom SVG icons often look smaller than stroke icons at the same size,
  // so we apply a scale factor to specific types as requested.
  const getScaledSize = (targetType: string) => {
    const largeIcons = ['løping', 'fjelltur', 'roing', 'tredemølle', 'yoga', 'tennis', 'fotball', 'trappemaskin'];
    return largeIcons.includes(targetType) ? Math.round(size * 1.3) : size;
  };

  const props = { size: getScaledSize(type), color };

  switch (type) {
    case 'styrke':
      return <Lucide.Dumbbell {...props} />;
    case 'løping':
      return <LopingIcon {...props} />;
    case 'fjelltur':
      return <FjellturIcon {...props} />;
    case 'sykling':
      return <Lucide.Bike {...props} />;
    case 'gå':
      return <Lucide.Footprints {...props} />;
    case 'svømming':
      return <SvommingIcon {...props} />;
    case 'tennis':
      return <TennisIcon {...props} />;
    case 'yoga':
      return <YogaIcon {...props} />;
    case 'fotball':
      return <FotballIcon {...props} />;
    case 'trappemaskin':
      return <TrappemaskinIcon {...props} />;
    case 'roing':
      return <RoingIcon {...props} />;
    case 'kajakk':
      return <KajakkIcon {...props} />;
    case 'tredemølle':
      return <TredemolleIcon {...props} />;
    case 'sickness':
      return <Lucide.Ambulance {...props} />;
    case 'injury':
      return <Lucide.Cross {...props} />;
    default:
      return <Lucide.Circle {...props} />;
  }
};