# Time. Screen clocks

Fifteen screen clocks in three series. Static HTML/CSS/JS, no dependencies, no trackers, works offline after the first visit.

## Series 01

| # | Clock | Route |
|---|-------|-------|
| 01 | Time dilation: uneven seconds, exact minutes | `#/dilation` |
| 02 | Time code: SMPTE HH:MM:SS:FF at 25 fps | `#/timecode` |
| 03 | HTML. Time.: the time as live `<time>` markup | `#/html` |
| 04 | Time stop: freezes, then catches up; hold to stop | `#/stop` |
| 05 | Time time: the time in words (EN / FR) | `#/words` |

## Series 02

| # | Clock | Route | How it shows the time |
|---|-------|-------|-----------------------|
| 06 | Live by the clock. Die by the clock. | `#/livedie` | The sentence is the dial: LIVE at 12, DIE at 6, hands cut through the words (difference blend), seconds in orange |
| 07 | Time is here | `#/here` | A wayfinding loop of 12 hour stops. The pin is YOU ARE HERE; the line fills toward the next stop; the time is set large in the middle |
| 08 | Is it time | `#/isit` | It only answers: Not yet / Soon / Almost, then Yes. for the whole first minute of every hour. Exact time and countdown underneath |
| 09 | Time is all we have | `#/left` | What is left of today, to the second, counting down to midnight. A 24-cell day bar drains and a marker shows the real time now |
| 10 | Time to wait | `#/wait` | A waiting-room board: counter = the hour, ticket now serving = the minute, wait = the seconds |

## Series 03

| # | Clock | Route | How it shows the time |
|---|-------|-------|-----------------------|
| 11 | Time is money | `#/money` | A running meter: 86,400 units per day, one spent every second. Shows units spent and remaining |
| 12 | Do you have the time | `#/doyou` | A conversation. Someone keeps asking for the time in different ways, you keep answering |
| 13 | Time Machine | `#/machine` | A sci-fi control panel showing present coordinates. Velocity: always 1.00×. Destination: always now |
| 14 | Time in a box | `#/inbox` | A shipping manifest. Dimensions = hours × minutes × seconds. Contents: the present moment. Fragile |
| 15 | On time | `#/ontime` | A schedule board tracking whether you're on time for life's daily events |

Controls: swipe or ← → to switch, tap (or `F`) for fullscreen, back / Esc to the index. The screen is kept awake (Wake Lock) while a clock is open.

Wall display (Raspberry Pi):

```
chromium-browser --kiosk --noerrdialogs --disable-infobars "https://sinks56.github.io/time-clocks/?kiosk=1&cycle=60#/dilation"
```

`kiosk=1` hides all controls, `cycle=N` moves to the next clock every N seconds (minimum 5). Leave out `cycle` to stay on one clock.
`series=1`, `series=2`, or `series=3` limits the cycle to one series; leave it out to cycle through all fifteen.

```
.../time-clocks/?kiosk=1&cycle=60&series=3#/money
```

The index has a Wall mode tile for each series and one for all fifteen.

Tests: headless Chrome (Playwright), phone 412x915 and 360x640, desktop 1280x800, wall 1920x1080, plus fixed-time checks (on the hour, midnight, a 25 hour day).
