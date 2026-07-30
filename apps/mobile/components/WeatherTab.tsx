import React, { useState, useEffect, useMemo } from 'react';
import { 
  View, 
  ScrollView, 
  TouchableOpacity, 
  ActivityIndicator, 
  Dimensions, 
  StyleSheet,
  Platform
} from 'react-native';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { Wind, ArrowDown, Cloud, Sun, CloudRain, CloudLightning, CloudSnow } from 'lucide-react-native';
import Svg, { Path, Rect, G, Line, Circle, Text as SvgText } from 'react-native-svg';
import useColorScheme from '@/hooks/useColorScheme';
import { flattenStyle } from '@/utils/flatten-style';

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
}

const WEATHER_SYMBOLS: Record<string, any> = {
  clearsky: Sun,
  fair: Sun,
  partlycloudy: Cloud,
  cloudy: Cloud,
  lightrain: CloudRain,
  rain: CloudRain,
  heavyrain: CloudRain,
  lightrainshowers: CloudRain,
  rainshowers: CloudRain,
  heavyrainshowers: CloudRain,
  lightsnow: CloudSnow,
  snow: CloudSnow,
  heavysnow: CloudSnow,
  lightsnowshowers: CloudSnow,
  snowshowers: CloudSnow,
  heavysnowshowers: CloudSnow,
  lightrainandthunder: CloudLightning,
  rainandthunder: CloudLightning,
  heavyrainandthunder: CloudLightning,
};

function getWeatherIcon(symbol: string) {
  const baseSymbol = symbol.split('_')[0];
  return WEATHER_SYMBOLS[baseSymbol] || Cloud;
}

export function WeatherTab({ latitude, longitude }: WeatherTabProps) {
  const isDark = useColorScheme() === 'dark';
  const [data, setData] = useState<WeatherData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);

  useEffect(() => {
    async function fetchWeather() {
      try {
        const response = await fetch(
          `https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=${latitude}&lon=${longitude}`,
          { headers: { 'User-Agent': 'Treningsappen/1.0' } }
        );
        const json = await response.json();
        const timeseries = json.properties.timeseries;

        const formattedData: WeatherData[] = timeseries.map((ts: any) => ({
          time: ts.time,
          temp: ts.data.instant.details.air_temperature,
          windSpeed: ts.data.instant.details.wind_speed,
          windDir: ts.data.instant.details.wind_from_direction,
          precip: ts.data.next_1_hours?.details?.precipitation_amount || 0,
          symbol: ts.data.next_1_hours?.summary?.symbol_code || 'cloudy',
        }));

        setData(formattedData);
      } catch (error) {
        console.error('Failed to fetch weather from Yr:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchWeather();
  }, [latitude, longitude]);

  const days = useMemo(() => {
    if (data.length === 0) return [];
    
    const dayGroups: Record<string, WeatherData[]> = {};
    data.forEach(item => {
      const dateStr = item.time.split('T')[0];
      if (!dayGroups[dateStr]) dayGroups[dateStr] = [];
      dayGroups[dateStr].push(item);
    });

    return Object.entries(dayGroups).slice(0, 10).map(([date, hours]) => {
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

      return { date, label, hours };
    });
  }, [data]);

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

  const currentDay = days[selectedDayIndex];
  // Filter for specific hours (00, 03, 06, 09, 12, 15, 18, 21) or just show 8 points
  const graphHours = currentDay.hours.filter((_, i) => i % 3 === 0).slice(0, 8);
  
  const maxTemp = Math.max(...graphHours.map(h => h.temp));
  const minTemp = Math.min(...graphHours.map(h => h.temp));
  const maxPrecip = Math.max(...graphHours.map(h => h.precip), 1);

  const screenWidth = Dimensions.get('window').width - 48; // Padding
  const graphHeight = 180;
  const paddingVertical = 30;
  const chartHeight = graphHeight - paddingVertical * 2;

  const getX = (index: number) => (index / (graphHours.length - 1)) * screenWidth;
  const getY = (temp: number) => {
    const range = maxTemp - minTemp || 1;
    return paddingVertical + chartHeight - ((temp - minTemp) / range) * chartHeight;
  };

  const linePath = graphHours.map((h, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(h.temp)}`).join(' ');

  return (
    <VStack style={{ gap: 16 }}>
      {/* Day Selector */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.daysScroll}>
        {days.map((day, index) => (
          <TouchableOpacity
            key={day.date}
            onPress={() => setSelectedDayIndex(index)}
            style={flattenStyle([
              styles.dayButton,
              selectedDayIndex === index 
                ? { backgroundColor: isDark ? '#374151' : '#111827' }
                : { backgroundColor: isDark ? '#1F2937' : '#F3F4F6' }
            ])}
          >
            <Text style={flattenStyle([
              styles.dayButtonText,
              selectedDayIndex === index ? { color: '#FFFFFF' } : { color: isDark ? '#9CA3AF' : '#111827' }
            ])}>
              {day.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Weather Card */}
      <View style={flattenStyle([styles.weatherCard, { backgroundColor: isDark ? '#1F2937' : '#F8FAFC' }])}>
        <View style={styles.chartHeader}>
          <Wind size={14} color={isDark ? '#9CA3AF' : '#64748B'} />
          <Text style={styles.unitText}>m/s</Text>
        </View>

        <View style={{ height: graphHeight + 40 }}>
          <Svg width={screenWidth} height={graphHeight + 40}>
            {/* Wind Arrows & Speed */}
            <G>
              {graphHours.map((h, i) => (
                <G key={i} transform={`translate(${getX(i)}, 15)`}>
                  <ArrowDown 
                    size={14} 
                    color={isDark ? '#9CA3AF' : '#64748B'} 
                    style={{ transform: [{ rotate: `${h.windDir}deg` }] }} 
                  />
                  <SvgText
                    x="0"
                    y="22"
                    fontSize="10"
                    fill={isDark ? '#9CA3AF' : '#64748B'}
                    textAnchor="middle"
                  >
                    {Math.round(h.windSpeed)}
                  </SvgText>
                </G>
              ))}
            </G>

            {/* Grid lines (Y-axis helpers) */}
            <G>
              {[minTemp, (minTemp + maxTemp) / 2, maxTemp].map((t, i) => (
                <G key={i}>
                  <SvgText
                    x="10"
                    y={getY(t) + 4}
                    fontSize="10"
                    fill={isDark ? '#9CA3AF' : '#64748B'}
                    textAnchor="end"
                  >
                    {Math.round(t)}°
                  </SvgText>
                </G>
              ))}
            </G>

            {/* Precipitation Bars */}
            <G>
              {graphHours.map((h, i) => {
                const barHeight = (h.precip / maxPrecip) * chartHeight;
                return (
                  <Rect
                    key={i}
                    x={getX(i) - 4}
                    y={paddingVertical + chartHeight - barHeight}
                    width="8"
                    height={barHeight}
                    fill="#3B82F6"
                    opacity={0.5}
                    rx="2"
                  />
                );
              })}
            </G>

            {/* Temperature Line */}
            <Path
              d={linePath}
              fill="none"
              stroke={isDark ? '#FFFFFF' : '#000000'}
              strokeWidth="2"
            />

            {/* Symbols and Points */}
            {graphHours.map((h, i) => {
              const x = getX(i);
              const y = getY(h.temp);
              const Icon = getWeatherIcon(h.symbol);
              return (
                <G key={i}>
                  <Circle cx={x} cy={y} r="3" fill={isDark ? '#FFFFFF' : '#000000'} />
                  {/* We can't easily put Lucide components inside SVG like this without foreignObject, 
                      so we skip it or use absolute positioning for icons. 
                      Instead let's just render points and put icons in a separate layer if needed.
                  */}
                </G>
              );
            })}

            {/* X-Axis Labels (Time) */}
            <G transform={`translate(0, ${graphHeight + 20})`}>
              {graphHours.map((h, i) => (
                <SvgText
                  key={i}
                  x={getX(i)}
                  y="0"
                  fontSize="10"
                  fill={isDark ? '#9CA3AF' : '#64748B'}
                  textAnchor="middle"
                >
                  {h.time.split('T')[1].substring(0, 2)}
                </SvgText>
              ))}
            </G>
          </Svg>

          {/* Absolute positioned weather icons on top of the graph points */}
          {graphHours.map((h, i) => {
             const Icon = getWeatherIcon(h.symbol);
             return (
               <View 
                 key={i} 
                 style={{ 
                   position: 'absolute', 
                   left: getX(i) - 10, 
                   top: getY(h.temp) - 25,
                   width: 20,
                   height: 20,
                   alignItems: 'center',
                   justifyContent: 'center'
                 }}
               >
                 <Icon size={16} color={isDark ? '#F9FAFB' : '#111827'} />
                 <Text style={{ fontSize: 9, fontWeight: 'bold', color: isDark ? '#F9FAFB' : '#111827' }}>
                   {Math.round(h.temp)}°
                 </Text>
               </View>
             );
          })}
        </View>

        <HStack style={styles.chartFooter}>
          <HStack space="xs" className="items-center">
            <View style={[styles.legendDot, { backgroundColor: isDark ? '#FFFFFF' : '#000000' }]} />
            <Text style={styles.legendText}>Temperatur</Text>
          </HStack>
          <HStack space="xs" className="items-center">
            <View style={[styles.legendDot, { backgroundColor: '#3B82F6', opacity: 0.5 }]} />
            <Text style={styles.legendText}>Nedbør</Text>
          </HStack>
        </HStack>
      </View>
      
      <Text className="text-center text-xs text-typography-400 dark:text-typography-500 italic">
        Værdata hentet fra Yr.no
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
    gap: 8,
    paddingVertical: 4,
  },
  dayButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    minWidth: 80,
    alignItems: 'center',
  },
  dayButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  weatherCard: {
    padding: 16,
    borderRadius: 24,
  },
  chartHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 10,
  },
  unitText: {
    fontSize: 10,
    color: '#64748B',
  },
  chartFooter: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginTop: 20,
  },
  legendDot: {
    width: 12,
    height: 4,
    borderRadius: 2,
  },
  legendText: {
    fontSize: 10,
    color: '#64748B',
  },
});