import React, {useEffect, useRef, useState} from 'react';
import {Animated, Dimensions, Easing, StyleSheet, Text, View} from 'react-native';
import {KeepAwakeVideo} from './components/KeepAwakeVideo';

// --- Weather code -> label + emoji (Open-Meteo WMO codes) ---
const WEATHER: {[k: number]: {label: string; icon: string}} = {
  0: {label: 'Clear', icon: '☀️'},
  1: {label: 'Mostly Clear', icon: '🌤️'},
  2: {label: 'Partly Cloudy', icon: '⛅'},
  3: {label: 'Overcast', icon: '☁️'},
  45: {label: 'Fog', icon: '🌫️'},
  48: {label: 'Fog', icon: '🌫️'},
  51: {label: 'Light Drizzle', icon: '🌦️'},
  53: {label: 'Drizzle', icon: '🌦️'},
  55: {label: 'Drizzle', icon: '🌦️'},
  61: {label: 'Light Rain', icon: '🌧️'},
  63: {label: 'Rain', icon: '🌧️'},
  65: {label: 'Heavy Rain', icon: '🌧️'},
  71: {label: 'Light Snow', icon: '🌨️'},
  73: {label: 'Snow', icon: '🌨️'},
  75: {label: 'Heavy Snow', icon: '❄️'},
  77: {label: 'Snow', icon: '🌨️'},
  80: {label: 'Rain Showers', icon: '🌧️'},
  81: {label: 'Rain Showers', icon: '🌧️'},
  82: {label: 'Heavy Showers', icon: '⛈️'},
  85: {label: 'Snow Showers', icon: '🌨️'},
  86: {label: 'Snow Showers', icon: '🌨️'},
  95: {label: 'Thunderstorm', icon: '⛈️'},
  96: {label: 'Thunderstorm', icon: '⛈️'},
  99: {label: 'Thunderstorm', icon: '⛈️'},
};

// Fallback location if IP lookup fails (Seattle). Change lat/lon/city here to hardcode.
const FALLBACK = {lat: 47.61, lon: -122.33, city: 'Seattle'};

// Bounce tuning. Travel is screen size minus an estimate of the clock cluster size,
// so the clock reaches the edges. No live measurement -> no animation restarts -> smooth.
const EST_W = 980; // approx clock cluster width
const EST_H = 560; // approx clock cluster height
const EDGE_INSET = 10; // small gap from the very edge
const SPEED = 0.24; // px per ms

const SCREEN = Dimensions.get('window');
const X_RANGE = Math.max(40, (SCREEN.width - EST_W) / 2 - EDGE_INSET);
const Y_RANGE = Math.max(40, (SCREEN.height - EST_H) / 2 - EDGE_INSET);

type WeatherState = {temp: number; code: number; city: string} | null;
type Star = {left: number; top: number; size: number; opacity: number};

const Starfield = React.memo(({stars}: {stars: Star[]}) => (
  <View style={StyleSheet.absoluteFill} pointerEvents="none">
    {stars.map((s, i) => (
      <View
        key={i}
        style={{
          position: 'absolute',
          left: `${s.left}%`,
          top: `${s.top}%`,
          width: s.size,
          height: s.size,
          borderRadius: s.size / 2,
          backgroundColor: '#FFFFFF',
          opacity: s.opacity,
        }}
      />
    ))}
  </View>
));

export const App = () => {
  const [now, setNow] = useState(new Date());
  const [weather, setWeather] = useState<WeatherState>(null);

  const [stars] = useState<Star[]>(() =>
    Array.from({length: 200}, () => ({
      left: Math.random() * 100,
      top: Math.random() * 100,
      size: Math.random() * 3 + 1,
      opacity: Math.random() * 0.7 + 0.15,
    })),
  );

  // --- Edge-to-edge bounce (starts at a corner so each loop is a round-trip; no teleport) ---
  const driftX = useRef(new Animated.Value(-X_RANGE)).current;
  const driftY = useRef(new Animated.Value(-Y_RANGE)).current;
  useEffect(() => {
    const bounce = (val: Animated.Value, range: number, duration: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(val, {toValue: range, duration, easing: Easing.linear, useNativeDriver: true}),
          Animated.timing(val, {toValue: -range, duration, easing: Easing.linear, useNativeDriver: true}),
        ]),
      );
    // Constant speed; X and Y on different periods so it roams the whole screen
    const ax = bounce(driftX, X_RANGE, Math.max(2500, (2 * X_RANGE) / SPEED));
    const ay = bounce(driftY, Y_RANGE, Math.max(1800, (2 * Y_RANGE) / (SPEED * 0.8)));
    ax.start();
    ay.start();
    return () => {
      ax.stop();
      ay.stop();
    };
  }, [driftX, driftY]);

  // Tick the clock every second
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  // Load weather (location via IP, conditions via Open-Meteo), refresh every 10 min
  useEffect(() => {
    const load = async () => {
      let {lat, lon, city} = FALLBACK;
      try {
        const geo = await fetch('https://ipwho.is/').then((r) => r.json());
        if (geo && geo.success !== false && geo.latitude) {
          lat = geo.latitude;
          lon = geo.longitude;
          city = geo.city || city;
        }
      } catch (e) {
        // keep fallback location
      }
      try {
        const url =
          `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
          `&current=temperature_2m,weather_code&temperature_unit=fahrenheit`;
        const w = await fetch(url).then((r) => r.json());
        if (w && w.current) {
          setWeather({
            temp: Math.round(w.current.temperature_2m),
            code: w.current.weather_code,
            city,
          });
        }
      } catch (e) {
        // leave previous weather
      }
    };
    load();
    const id = setInterval(load, 10 * 60 * 1000);
    return () => clearInterval(id);
  }, []);

  const hours24 = now.getHours();
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
  const minutes = now.getMinutes().toString().padStart(2, '0');
  const ampm = hours24 < 12 ? 'AM' : 'PM';

  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
    'August', 'September', 'October', 'November', 'December'];
  const dateStr = `${days[now.getDay()]}, ${months[now.getMonth()]} ${now.getDate()}`;

  const wx = weather ? WEATHER[weather.code] || {label: 'Weather', icon: '🌡️'} : null;

  return (
    <View style={styles.root}>
      <KeepAwakeVideo />
      <Starfield stars={stars} />

      <View style={styles.center} pointerEvents="none">
        <Animated.View style={{transform: [{translateX: driftX}, {translateY: driftY}]}}>
          <View style={styles.cluster}>
            <View style={styles.clockRow}>
              <Text style={styles.time}>{`${hours12}:${minutes}`}</Text>
              <Text style={styles.ampm}>{ampm}</Text>
            </View>

            <Text style={styles.date}>{dateStr}</Text>

            <View style={styles.weatherRow}>
              {weather && wx ? (
                <>
                  <Text style={styles.wxIcon}>{wx.icon}</Text>
                  <Text style={styles.temp}>{`${weather.temp}°`}</Text>
                  <Text style={styles.wxLabel}>{`${wx.label}  ·  ${weather.city}`}</Text>
                </>
              ) : (
                <Text style={styles.wxLabel}>Loading weather…</Text>
              )}
            </View>
          </View>
        </Animated.View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#05070F',
  },
  center: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cluster: {
    alignItems: 'center',
  },
  clockRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  time: {
    color: '#FFFFFF',
    fontSize: 280,
    fontWeight: '200',
    letterSpacing: 2,
    lineHeight: 290,
  },
  ampm: {
    color: '#7AA2F7',
    fontSize: 80,
    fontWeight: '500',
    marginTop: 40,
    marginLeft: 20,
  },
  date: {
    color: '#C0CAF5',
    fontSize: 72,
    fontWeight: '300',
    marginTop: 10,
  },
  weatherRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 80,
  },
  wxIcon: {
    fontSize: 90,
    marginRight: 28,
  },
  temp: {
    color: '#FFFFFF',
    fontSize: 96,
    fontWeight: '400',
    marginRight: 28,
  },
  wxLabel: {
    color: '#9AA5CE',
    fontSize: 56,
    fontWeight: '300',
  },
});
