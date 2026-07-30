import React, { useState, useEffect, useMemo } from 'react';
import { 
  View, 
  ScrollView, 
  TouchableOpacity, 
  ActivityIndicator, 
  Dimensions, 
  StyleSheet,
  Platform,
  LayoutChangeEvent
} from 'react-native';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { Wind, Cloud, Sun, Moon, CloudSnow } from 'lucide-react-native';
import Svg, { Path, Rect, G, Line, Circle, Text as SvgText, TSpan, Polygon } from 'react-native-svg';
import { Image } from 'expo-image';
import useColorScheme from '@/hooks/useColorScheme';
import { flattenStyle } from '@/utils/flatten-style';
import { mapWmoCodeToEmoji } from '@/utils/weatherUtils';

interface WeatherTabProps {
  latitude: number;
  longitude: number;
}

interface WeatherData {
  time: string;
  temp: number;
  precip: number;
  windSpeed: number;
  windDir: number;
  symbol: string;
  snowDepth: number;
}

export function WeatherTab({ latitude, longitude }: WeatherTabProps) {
  const isDark = useColorScheme() === 'dark';
  const [data, setData] = useState<WeatherData[]>([]);
  const [dailyInfo, setDailyInfo] = useState<Record<string, { sunrise: string; sunset: string }>>({});
  const [loading, setLoading] = useState(true);
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);
  const [containerWidth, setContainerWidth] = useState(Dimensions.get('window').width - 48);

  const onLayout = (event: LayoutChangeEvent) => {
    setContainerWidth(event.nativeEvent.layout.width);
  };

  useEffect(() => {
    async function fetchWeather() {
      try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&hourly=temperature_2m,precipitation,snow_depth,weather_code,wind_speed_10m,wind_direction_10m&daily=sunrise,sunset&timezone=auto&forecast_days=10&models=metno_nordic,best_match`;
        const response = await fetch(url);
        
        if (!response.ok) {
          throw new Error(`Weather API returned ${response.status}`);
        }

        const json = await response.json();

        if (!json || typeof json !== 'object') {
          throw new Error('Invalid response from weather API');
        }

        const hourly = json.hourly;
        const daily = json.daily;
        const hourlyUnits = json.hourly_units;

        if (!hourly || !Array.isArray(hourly.time)) {
          throw new Error('Missing hourly data from weather API');
        }

        const isWindKmH = (hourlyUnits?.wind_speed_10m_best_match || hourlyUnits?.wind_speed_10m) === 'km/h';

        const formattedData: WeatherData[] = hourly.time.map((time: string, i: number) => {
          const windSpeedRaw = hourly.wind_speed_10m_best_match?.[i] ?? hourly.wind_speed_10m?.[i] ?? 0;
          const windSpeed = isWindKmH ? windSpeedRaw / 3.6 : windSpeedRaw;
          
          const snowDepth = hourly.snow_depth_metno_nordic?.[i] ?? hourly.snow_depth_best_match?.[i] ?? hourly.snow_depth?.[i] ?? 0;
          
          const weatherCode = hourly.weather_code_best_match?.[i] ?? hourly.weather_code?.[i] ?? 0;
          const emoji = mapWmoCodeToEmoji(weatherCode);

          return {
            time,
            temp: hourly.temperature_2m_best_match?.[i] ?? hourly.temperature_2m?.[i] ?? 0,
            precip: hourly.precipitation_best_match?.[i] ?? hourly.precipitation?.[i] ?? 0,
            windSpeed,
            windDir: hourly.wind_direction_10m_best_match?.[i] ?? hourly.wind_direction_10m?.[i] ?? 0,
            symbol: emoji,
            snowDepth,
          };
        });

        const dailyInfoMap: Record<string, { sunrise?: string; sunset?: string }> = {};
        if (daily && Array.isArray(daily.time)) {
          daily.time.forEach((date: string, i: number) => {
            if (daily.sunrise?.[i] || daily.sunset?.[i]) {
              dailyInfoMap[date] = {
                sunrise: daily.sunrise?.[i],
                sunset: daily.sunset?.[i],
              };
            }
          });
        }

        setData(formattedData);
        setDailyInfo(dailyInfoMap);
      } catch (error) {
        console.error('Failed to fetch weather from Open-Meteo:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchWeather();
  }, [latitude, longitude]);

  const days = useMemo(() => {
    if (!data || data.length === 0) return [];
    
    const dayGroups: Record<string, WeatherData[]> = {};
    data.forEach(item => {
      if (!item || !item.time) return;
      const dateStr = item.time.split('T')[0];
      if (!dayGroups[dateStr]) dayGroups[dateStr] = [];
      dayGroups[dateStr].push(item);
    });

    const entries = Object.entries(dayGroups);
    if (entries.length === 0) return [];

    return entries.slice(0, 10).map(([date, hours]) => {
      const d = new Date(date);
      const isToday = new Date().toDateString() === d.toDateString();
      const isTomorrow = new Date(Date.now() + 86400000).toDateString() === d.toDateString();
      
      let label = '';
      if (isToday) label = 'I dag';
      else if (isTomorrow) label = 'I morgen';
      else {
        const dayName = d.toLocaleDateString('no-NO', { weekday: 'short' });
        const dayDate = d.getDate();
        const monthName = d.toLocaleDateString('no-NO', { month: 'short' });
        label = `${dayName} ${dayDate}. ${monthName}`;
      }

      return { 
        date, 
        label, 
        hours,
        sunrise: dailyInfo[date]?.sunrise,
        sunset: dailyInfo[date]?.sunset,
      };
    });
  }, [data, dailyInfo]);

  const currentDay = days[selectedDayIndex] || days[0];
  
  const snowDepthAtNoon = useMemo(() => {
    const noon = currentDay?.hours?.find(h => h.time?.includes('T12:00'));
    if (!noon) return 0;
    return noon.snowDepth;
  }, [currentDay]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color="#10B981" />
      </View>
    );
  }

  if (days.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <Text className="text-typography-500">Værdata utilgjengelig</Text>
      </View>
    );
  }

  const formatSnowDepth = (cm: number) => {
    if (cm === 0) return '0 cm';
    if (cm >= 100) return `${(cm / 100).toFixed(2)} m`;
    return `${Math.round(cm)} cm`;
  };

  const formatTime = (isoString?: string) => {
    if (!isoString || typeof isoString !== 'string') return '--:--';
    const parts = isoString.split('T');
    if (parts.length < 2) return '--:--';
    return parts[1].substring(0, 5);
  };
  
  const graphPoints = [0, 3, 6, 9, 12, 15, 18, 21].map(hour => {
    const timeStr = `${currentDay?.date}T${String(hour).padStart(2, '0')}:00:00`;
    const closest = currentDay?.hours?.find(h => h.time.startsWith(timeStr)) || 
                    currentDay?.hours?.find(h => h.time >= timeStr) || 
                    currentDay?.hours?.[currentDay?.hours?.length - 1];
    
    if (!closest) {
      return {
        time: timeStr,
        temp: 0,
        precip: 0,
        windSpeed: 0,
        windDir: 0,
        symbol: 'cloudy_day',
        snowDepth: 0,
        label: String(hour).padStart(2, '0')
      };
    }

    return {
      ...closest,
      label: String(hour).padStart(2, '0')
    };
  });

  const hourlyData = currentDay?.hours || [];
  
  const allTemps = hourlyData.length > 0 ? hourlyData.map(h => h.temp) : [0];
  const maxTemp = Math.max(...allTemps);
  const minTemp = Math.min(...allTemps);
  const graphMinTemp = Math.floor(minTemp - 1);
  const graphMaxTemp = Math.ceil(maxTemp + 3);

  const maxPrecip = Math.max(...hourlyData.map(h => h.precip), 2);

  const graphHeight = 240;
  const paddingLeft = 45; 
  const paddingRight = 40; 
  const paddingTop = 60; 
  const paddingBottom = 35; 
  
  const chartWidth = containerWidth - paddingLeft - paddingRight;
  const chartHeight = graphHeight - paddingTop - paddingBottom;

  const getXFromPointIndex = (index: number) => {
    const hour = index * 3;
    return paddingLeft + (hour / 21) * chartWidth; 
  };

  const getYTemp = (temp: number) => {
    const range = graphMaxTemp - graphMinTemp;
    return paddingTop + chartHeight - ((temp - graphMinTemp) / range) * chartHeight;
  };

  const getYPrecip = (precip: number) => {
    return paddingTop + chartHeight - (Math.min(precip, maxPrecip) / maxPrecip) * chartHeight;
  };

  const linePath = graphPoints.map((h, i) => `${i === 0 ? 'M' : 'L'} ${getXFromPointIndex(i)} ${getYTemp(h.temp)}`).join(' ');

  return (
    <VStack style={{ gap: 0 }}>
      {/* Day Selector - Narrower and less spacing */}
      <View style={{ marginTop: 2, marginBottom: 2 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.daysScroll}>
          {days.map((day, index) => (
            <TouchableOpacity
              key={day.date}
              onPress={() => setSelectedDayIndex(index)}
              style={flattenStyle([
                styles.dayButton,
                selectedDayIndex === index 
                  ? { backgroundColor: isDark ? '#FFFFFF' : '#111827' }
                  : { backgroundColor: isDark ? '#1F2937' : '#F3F4F6' }
              ])}
            >
              <Text style={flattenStyle([
                styles.dayButtonText,
                selectedDayIndex === index 
                  ? { color: isDark ? '#000000' : '#FFFFFF' } 
                  : { color: isDark ? '#9CA3AF' : '#111827' }
              ])}>
                {day.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Weather Card */}
      <View 
        onLayout={onLayout}
        style={flattenStyle([
          styles.weatherCard, 
          { backgroundColor: isDark ? '#111827' : '#F8FAFC', paddingHorizontal: 12, marginTop: 4 }
        ])}
      >
        {/* Unit indicators */}
        <HStack className="justify-between items-center mb-0">
          <HStack space="xs" className="items-center">
            <Wind size={12} color={isDark ? '#9CA3AF' : '#64748B'} />
            <Text style={styles.unitText}>m/s</Text>
          </HStack>
          <HStack space="xs" className="items-center">
            <Text style={styles.unitText}>mm</Text>
          </HStack>
        </HStack>

        <View style={{ height: graphHeight }}>
          <Svg width={containerWidth} height={graphHeight}>
            {/* Grid lines (Temperature) */}
            <G>
              {[graphMinTemp, (graphMinTemp + graphMaxTemp) / 2, graphMaxTemp].map((t, i) => {
                const y = getYTemp(t);
                return (
                  <G key={i}>
                    <Line 
                      x1={paddingLeft} 
                      y1={y} 
                      x2={containerWidth - paddingRight + 5} 
                      y2={y} 
                      stroke={isDark ? '#1F2937' : '#E2E8F0'} 
                      strokeWidth="1"
                    />
                    <SvgText
                      x={paddingLeft - 12}
                      y={y + 4}
                      fontSize="11"
                      fontWeight="500"
                      fill={isDark ? '#9CA3AF' : '#64748B'}
                      textAnchor="end"
                    >
                      <TSpan>{Math.round(t)}</TSpan>
                      <TSpan dx="-1.5">°</TSpan>
                    </SvgText>
                  </G>
                );
              })}
            </G>

            {/* Grid lines (Precipitation Labels on right) */}
            <G>
               {[0, maxPrecip / 2, maxPrecip].map((p, i) => (
                 <SvgText
                    key={i}
                    x={containerWidth - paddingRight + 12}
                    y={getYPrecip(p) + 4}
                    fontSize="10"
                    fontWeight="500"
                    fill={isDark ? '#9CA3AF' : '#64748B'}
                    textAnchor="start"
                  >
                    {p === 0 ? '0' : p.toFixed(1).replace('.0', '')}
                 </SvgText>
               ))}
            </G>

            {/* Precipitation Bars - Hourly */}
            <G>
              {hourlyData.map((h, i) => {
                // We want to show even small amounts of rain, so we use a min height
                const rawHeight = chartHeight - (getYPrecip(h.precip) - paddingTop);
                if (h.precip <= 0 && rawHeight <= 1) return null;
                
                // Ensure the bar has some visible height if there's any precip
                const barHeight = h.precip > 0 ? Math.max(2, rawHeight) : 0;
                if (barHeight === 0) return null;

                const x = paddingLeft + (i / (hourlyData.length - 1)) * chartWidth;
                return (
                  <Rect
                    key={i}
                    x={x - 4}
                    y={paddingTop + chartHeight - barHeight}
                    width="8"
                    height={barHeight}
                    fill="#3B82F6"
                    opacity={0.4}
                    rx="1.5"
                  />
                );
              })}
            </G>

            {/* Temperature Line */}
            <Path
              d={linePath}
              fill="none"
              stroke={isDark ? '#FFFFFF' : '#000000'}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Points and Labels */}
            {graphPoints.map((h, i) => {
              const x = getXFromPointIndex(i);
              const y = getYTemp(h.temp);
              return (
                <G key={i}>
                  {/* Point */}
                  <Circle cx={x} cy={y} r="3.5" fill={isDark ? '#FFFFFF' : '#000000'} stroke={isDark ? '#111827' : '#F8FAFC'} strokeWidth="1.5" />
                  
                  {/* Wind Arrow & Speed */}
                  <G transform={`translate(${x}, 15)`}>
                    <G transform={`rotate(${h.windDir})`}>
                      <Line x1="0" y1="-5" x2="0" y2="5" stroke={isDark ? '#9CA3AF' : '#64748B'} strokeWidth="1.2" strokeLinecap="round" />
                      <Polygon points="0,-6 -2.5,-2 2.5,-2" fill={isDark ? '#9CA3AF' : '#64748B'} />
                    </G>
                    <SvgText
                      x="0"
                      y="18"
                      fontSize="9"
                      fontWeight="bold"
                      fill={isDark ? '#9CA3AF' : '#64748B'}
                      textAnchor="middle"
                    >
                      {Math.round(h.windSpeed)}
                    </SvgText>
                  </G>

                  {/* Temperature label */}
                  <SvgText
                    x={x}
                    y={y - 4}
                    fontSize="11"
                    fontWeight="bold"
                    fill={isDark ? '#FFFFFF' : '#000000'}
                    textAnchor="middle"
                  >
                    <TSpan>{Math.round(h.temp)}</TSpan>
                    <TSpan dx="-1.5">°</TSpan>
                  </SvgText>

                </G>
              );
            })}

            {/* X-Axis Labels */}
            <G transform={`translate(0, ${graphHeight - 10})`}>
              {graphPoints.map((h, i) => (
                <SvgText
                  key={i}
                  x={getXFromPointIndex(i)}
                  y="0"
                  fontSize="10"
                  fontWeight="500"
                  fill={isDark ? '#9CA3AF' : '#64748B'}
                  textAnchor="middle"
                >
                  {h.label}
                </SvgText>
              ))}
            </G>
          </Svg>

          {/* Icons positioned over points (using emojis for standard iOS look) */}
          {graphPoints.map((h, i) => {
             const x = getXFromPointIndex(i);
             const y = getYTemp(h.temp);
             return (
               <View 
                 key={i} 
                 pointerEvents="none"
                 style={{ 
                   position: 'absolute', 
                   left: x - 15, 
                   top: y - 40,
                   width: 30,
                   height: 30,
                   alignItems: 'center',
                   justifyContent: 'center'
                 }}
               >
                 <Text style={{ fontSize: 20 }}>{h.symbol}</Text>
               </View>
             );
          })}
        </View>

        {/* Legend */}
        <HStack style={styles.chartFooter}>
          <HStack space="xs" className="items-center">
            <View style={[styles.legendLine, { backgroundColor: isDark ? '#FFFFFF' : '#000000' }]} />
            <Text style={styles.legendText}>Temperatur</Text>
          </HStack>
          <HStack space="xs" className="items-center">
            <View style={[styles.legendPill, { backgroundColor: '#3B82F6', opacity: 0.4 }]} />
            <Text style={styles.legendText}>Nedbør</Text>
          </HStack>
        </HStack>
      </View>
      
      {/* Extra info: Sunrise, Sunset, Snow Depth */}
      <HStack style={flattenStyle([
        styles.extraInfoContainer,
        { 
          backgroundColor: isDark ? '#1F2937' : '#F9FAFB',
          borderColor: isDark ? '#374151' : '#E5E7EB'
        }
      ])}>
        <VStack className="items-center" space="xs">
          <Sun size={14} color="#FBBF24" />
          <Text style={styles.legendText}>Soloppgang</Text>
          <Text style={flattenStyle([styles.infoValue, { color: isDark ? '#FFFFFF' : '#111827' }])}>{formatTime(currentDay?.sunrise)}</Text>
        </VStack>
        
        <VStack className="items-center" space="xs">
          <Moon size={14} color="#60A5FA" />
          <Text style={styles.legendText}>Solnedgang</Text>
          <Text style={flattenStyle([styles.infoValue, { color: isDark ? '#FFFFFF' : '#111827' }])}>{formatTime(currentDay?.sunset)}</Text>
        </VStack>

        <VStack className="items-center" space="xs">
          <CloudSnow size={14} color="#9CA3AF" />
          <Text style={styles.legendText}>Snødybde</Text>
          <Text style={flattenStyle([styles.infoValue, { color: isDark ? '#FFFFFF' : '#111827' }])}>{formatSnowDepth(snowDepthAtNoon)}</Text>
        </VStack>
      </HStack>

      <Text className="text-center text-xs text-typography-400 dark:text-typography-500 italic mt-1">
        Værdata fra Open-Meteo
      </Text>
    </VStack>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  daysScroll: {
    gap: 4,
    paddingVertical: 2,
    paddingHorizontal: 4,
  },
  dayButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    minWidth: 70,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayButtonText: {
    fontSize: 12,
    fontWeight: '800',
  },
  weatherCard: {
    padding: 12,
    borderRadius: 20,
    overflow: 'hidden',
  },
  unitText: {
    fontSize: 10,
    color: '#9CA3AF',
    fontWeight: '700',
  },
  chartFooter: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginTop: 8,
  },
  legendLine: {
    width: 16,
    height: 2.5,
    borderRadius: 1.25,
  },
  legendPill: {
    width: 14,
    height: 8,
    borderRadius: 2,
  },
  legendText: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '700',
  },
  extraInfoContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    marginTop: 8,
    borderWidth: 1,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: 'bold',
  },
});