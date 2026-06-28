# k-time-weather-date

A full-screen ambient **clock / date / weather** app for **Amazon Fire TV Stick 4K Select (Vega OS)**, built with React Native for Vega (Kepler).

A large clock drifts and bounces across a starfield (DVD-logo style, to avoid burn-in), showing the time, date, and live local weather. It also **keeps the screen on indefinitely** — working around the fact that Vega has no public keep-awake API (see below).

![platform](https://img.shields.io/badge/platform-Vega%20OS%20(Fire%20TV)-blue)
![framework](https://img.shields.io/badge/React%20Native-Vega%2FKepler-61dafb)

---

## Features

- **Big clock + date**, updates every second.
- **Live weather** — [Open-Meteo](https://open-meteo.com) (free, no API key), location auto-detected by IP via [ipwho.is](https://ipwho.is). Fahrenheit by default; fallback city is editable in `src/App.tsx` (`FALLBACK`).
- **Starfield** background (200 procedurally-placed stars), memoized so it never re-renders.
- **Edge-to-edge bounce** — the clock cluster travels the whole screen at constant velocity and bounces off the edges, to prevent OLED/QLED burn-in. Tunables in `src/App.tsx`: `EST_W`/`EST_H` (how close to the edges), `SPEED`, `EDGE_INSET`.
- **Stay-awake** — keeps the system screensaver from covering the app (`src/components/KeepAwakeVideo.tsx`).

## Project layout

```
src/App.tsx                     # clock + date + weather + starfield + bounce
src/components/KeepAwakeVideo.tsx  # silent looping video that keeps the screen awake
docs/awake2.mp4                 # the keep-awake clip, served via GitHub Pages
manifest.toml, app.json         # Vega package manifest (id: com.thesalleys.hellovega)
```

## Build & deploy

Requires the **Vega SDK** (`vega` CLI) installed and on PATH.

```bash
npm install
npm run build:release          # -> build/armv7-release/hellovega_armv7.vpkg

# Fire TV Stick 4K Select in developer mode, connected by USB-C:
vega device install-app --packagePath build/armv7-release/hellovega_armv7.vpkg
vega device launch-app  --appName com.thesalleys.hellovega.main
```

Emulator: `npm run build:debug`, then `vega run-app build/x86_64-debug/hellovega_x86_64.vpkg`
(on a **Wayland** host, start the virtual device with `--no-gl-accel` or it hangs on boot).

### Getting a Fire TV Stick 4K Select into developer mode

There is **no on-device toggle** on Vega. You register the device online:
1. Get the **DSN** (serial): Settings → My Fire TV → About → Serial Number.
2. At [developer.amazon.com](https://developer.amazon.com) → Vega docs → *Run your app on … Fire TV Stick* → the **"Fire TV Stick" tab** → **Step 2: Register Fire TV Stick for Developer Mode** → enter the DSN → Add Device.
3. The stick picks up the registration, reboots, and Developer Options appears.
4. Connect USB-C → laptop (data) + HDMI → TV (display). `vega device list` should show it.

## Keeping the screen awake (the interesting part)

Vega OS provides **no public API** for a non-media app to prevent the system
screensaver — confirmed by Amazon staff on the developer forums. After ~5 minutes
idle, the screensaver covers any foreground app.

**Workaround:** Vega's resource manager *does* keep the display awake for an app
with an **active video-playback session**. So `KeepAwakeVideo.tsx` loops a tiny
silent video using the W3C media player (`@amazon-devices/react-native-w3cmedia`).
With it playing, the clock stays up until you press Home/Back.

**Verified** on a Fire TV Stick 4K Select: 8+ minutes idle, clock stayed up, no
screensaver, same app process the whole time.

### Hard-won gotchas (so you don't repeat them)

- **`file://` is not supported** by the W3C player — the keep-awake clip must be a
  real `http(s)` URL. It's hosted here via GitHub Pages (`docs/awake2.mp4`).
- **The clip must be a "normal" encode.** A solid-black clip compresses to ~10 kb/s,
  which the hardware decoder rejects (`open failed`, W3C error code 4). Encode it
  with a forced bitrate (CBR ~1.2 Mbps) so it's a real, decoder-friendly stream —
  still visually black. See the ffmpeg command below.
- **Play only when ready.** Call `play()` only after *both* the surface is created
  *and* `loadedmetadata` has fired, or you get a spurious error.
- **Use a URL the device can actually fetch.** Google's `commondatastorage` sample
  returns 403 to the device (→ error 4). GitHub Pages works.
- **Heavy test-deploy cycling can wedge the media stack.** After many rapid
  install/launch/terminate loops the player may start failing to open *any* source;
  a full power-cycle of the stick clears it. Normal single-launch use is fine.

Regenerate the keep-awake clip:
```bash
ffmpeg -y -f lavfi -i color=c=black:s=1280x720:r=30:d=10 \
  -f lavfi -i anullsrc=channel_layout=stereo:sample_rate=48000 -shortest \
  -c:v libx264 -profile:v high -pix_fmt yuv420p \
  -b:v 1200k -minrate 1200k -maxrate 1200k -bufsize 2400k -x264opts nal-hrd=cbr -g 60 \
  -c:a aac -b:a 128k -movflags +faststart -t 10 docs/awake2.mp4
```

## Tech

- React Native for Vega — `@amazon-devices/react-native-kepler`
- `@amazon-devices/react-native-w3cmedia` (W3C media player) for the keep-awake video
- Animated (core RN) for the bounce, with native driver
- Open-Meteo (weather) + ipwho.is (geolocation)

## License

MIT
