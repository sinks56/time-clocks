# Time. Screen clocks, series 01

Five screen clocks. Static HTML/CSS/JS, no dependencies, no trackers, works offline after the first visit.

| # | Clock | Route |
|---|-------|-------|
| 01 | Time dilation: uneven seconds, exact minutes | `#/dilation` |
| 02 | Time code: SMPTE HH:MM:SS:FF at 25 fps | `#/timecode` |
| 03 | HTML. Time.: the time as live `<time>` markup | `#/html` |
| 04 | Time stop: freezes, then catches up; hold to stop | `#/stop` |
| 05 | Time time: the time in words (EN / FR) | `#/words` |

Controls: swipe or ← → to switch, tap (or `F`) for fullscreen, back / Esc to the index. The screen is kept awake (Wake Lock) while a clock is open.

Wall display (Raspberry Pi):

```
chromium-browser --kiosk --noerrdialogs --disable-infobars "https://sinks56.github.io/time-clocks/?kiosk=1&cycle=60#/dilation"
```

`kiosk=1` hides all controls, `cycle=N` moves to the next clock every N seconds. Leave out `cycle` to stay on one clock.
