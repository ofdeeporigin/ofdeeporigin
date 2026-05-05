(function () {
  var TAU = Math.PI * 2;

  // ---------- trochoid: small circle rolling inside a big one ----------
  // Produces ring/band lace patterns wrapping around the pattern
  // origin. Every line stays within an annular band — none of
  // them pass through the center.
  //
  //   R              radius of the big (fixed) circle. Sets the
  //                  overall pattern size; band sits roughly at
  //                  radius R−r from origin.
  //   r              radius of the small (rolling) circle. Petal
  //                  count per traversal is (R−r)/r — smaller r
  //                  means more, finer petals.
  //   d              pen offset from the rolling circle's center.
  //                  Controls petal SHAPE and band WIDTH (≈ 2d).
  //                    d < r  → smooth curtate loops (no kinks)
  //                    d = r  → true cusps at outer envelope
  //                    d > r  → self-intersecting prolate loops
  //   turns          revolutions of t. Pattern closes after
  //                  R/gcd(R,r) turns; render fewer for partial
  //                  drift / lace, more to retrace into denser mesh.
  //   samplesPerTurn smoothness only.
  function trochoid(R, r, d, turns, samplesPerTurn) {
    var samples = turns * samplesPerTurn;
    var step = (TAU * turns) / samples;
    var p = '';
    for (var i = 0; i <= samples; i++) {
      var t = i * step;
      var x = (R - r) * Math.cos(t) + d * Math.cos(((R - r) / r) * t);
      var y = (R - r) * Math.sin(t) - d * Math.sin(((R - r) / r) * t);
      p += (i === 0 ? 'M' : 'L') + x.toFixed(2) + ' ' + y.toFixed(2) + ' ';
    }
    return p;
  }

  // ---------- rose: r = a · cos(k · θ + φ) ----------
  // Flower-petal shapes radiating from origin. Every line passes
  // through the center.
  //
  //   a              petal length (size of the flower)
  //   k              petal count: odd integer → k petals;
  //                  even integer → 2k petals; non-integer →
  //                  never closes, layered lace
  //   phi            phase rotation in radians. 0 leaves the rose
  //                  pointing right. Math.PI/k = half a petal
  //                  shift; any value rotates the whole flower.
  //   turns          revolutions of θ. Integer k: doesn't matter.
  //                  Non-integer k: more turns = denser lace.
  //   samplesPerTurn smoothness only.
  function rose(a, k, phi, turns, samplesPerTurn) {
    var samples = turns * samplesPerTurn;
    var step = (TAU * turns) / samples;
    var p = '';
    for (var i = 0; i <= samples; i++) {
      var t = i * step;
      var radius = a * Math.cos(k * t + phi);
      var x = radius * Math.cos(t);
      var y = radius * Math.sin(t);
      p += (i === 0 ? 'M' : 'L') + x.toFixed(2) + ' ' + y.toFixed(2) + ' ';
    }
    return p;
  }

  // ---------- wave: r = base + amp · cos(k · θ + φ) ----------
  // A "wavy circle" — a ring at distance `base` from origin whose
  // radius oscillates by ±amp. This is what produces the
  // scalloped outer bands you see in banknote rosettes (where
  // the curve hugs a ring rather than passing through the center).
  //
  //   base           ring's average distance from origin (where
  //                  the wavy band sits)
  //   amp            wave amplitude — how far the scallops bulge
  //                  in and out. amp < base keeps it from passing
  //                  through origin.
  //   k              number of wave bumps around the ring (integer
  //                  closes a clean wavy circle; non-integer drifts)
  //   phi            phase rotation — rotates the wave pattern
  //                  around the ring (Math.PI/k = half-bump shift).
  //   turns          1 = one clean closed loop with integer k;
  //                  more turns layer offsets when k is non-integer.
  //   samplesPerTurn smoothness only.
  function wave(base, amp, k, phi, turns, samplesPerTurn) {
    var samples = turns * samplesPerTurn;
    var step = (TAU * turns) / samples;
    var p = '';
    for (var i = 0; i <= samples; i++) {
      var t = i * step;
      var radius = base + amp * Math.cos(k * t + phi);
      var x = radius * Math.cos(t);
      var y = radius * Math.sin(t);
      p += (i === 0 ? 'M' : 'L') + x.toFixed(2) + ' ' + y.toFixed(2) + ' ';
    }
    return p;
  }

  // ---------- ridges: stacked Cartesian cusped sine-bands ----------
  // Horizontal banner: y = baseline - amp · |sin(peakCount·π·x/width)|^p
  // drawn `lines` times with each baseline shifted down by `spacing`
  // and amplitude shrinking 1 → 0 across the stack. Produces the
  // engraved cusped-ridge banner you'd see along a banknote edge.
  // Unlike rose/wave/trochoid this is NOT polar — it's a horizontal
  // band, so it won't fill a circular composition.
  //
  //   x0, y0       top-left of the band (in viewBox coords).
  //                Ridges rise upward from each baseline, stack
  //                downward.
  //   width        horizontal extent of the band.
  //   peakHeight   how far the topmost line's peaks rise above
  //                its baseline.
  //   peakCount    number of peaks across the width.
  //   sharpness    exponent on |sin|. 0.5 = cusped/spiky;
  //                1 = smooth |sin| bumps; 2 = rounded humps.
  //   lines        number of stacked engraved curves.
  //   spacing      vertical gap between adjacent line baselines.
  //   samples      points per line (smoothness).
  function ridges(x0, y0, width, peakHeight, peakCount, sharpness, lines, spacing, samples) {
    var p = '';
    for (var i = 0; i < lines; i++) {
      var baseline = y0 + i * spacing;
      var amp = peakHeight * (1 - i / lines);
      for (var j = 0; j <= samples; j++) {
        var t = j / samples;
        var x = x0 + width * t;
        var s = Math.abs(Math.sin(peakCount * Math.PI * t));
        // 1 - s^p flips the curve so the SHARP tips point UP at
        // sin=0 (cusp from the vertical tangent of |sin|^p), and
        // the SMOOTH valleys sit at the bottom at sin=±1.
        var y = baseline - amp * (1 - Math.pow(s, sharpness));
        p += (j === 0 ? 'M' : 'L') + x.toFixed(2) + ' ' + y.toFixed(2) + ' ';
      }
    }
    return p;
  }

  // ---------- sineLine: a single smooth sine wave ----------
  // Useful as the "flow line" running below a ridges() banner.
  //
  //   x0, y0       starting point (y0 is the wave's centerline).
  //   width        horizontal extent.
  //   amp          half-height of the wave.
  //   freq         number of full cycles across the width.
  //   phase        phase offset in radians.
  //   samples      smoothness.
  function sineLine(x0, y0, width, amp, freq, phase, samples) {
    var p = '';
    for (var i = 0; i <= samples; i++) {
      var t = i / samples;
      var x = x0 + width * t;
      var y = y0 + amp * Math.sin(freq * TAU * t + phase);
      p += (i === 0 ? 'M' : 'L') + x.toFixed(2) + ' ' + y.toFixed(2) + ' ';
    }
    return p;
  }

  // ---------- radialRidges: ridges() in polar coordinates ----------
  // Same cusped-ridge math as ridges(), but the horizontal axis
  // becomes angle θ (sweeping around the origin) and the vertical
  // axis becomes radius. Result: a stack of concentric cusped
  // rings radiating from the pattern origin — fits the same
  // radial composition as trochoid/rose/wave.
  //
  //   baseRadius   the outermost ring's valley radius (inner edge
  //                of the band — where peaks emerge from).
  //   peakHeight   how far the topmost line's peaks rise OUTWARD
  //                from baseRadius.
  //   peakCount    number of peaks around a full 360° circle.
  //                In the visible TL-anchored composition we only
  //                see ~20–30% of the circle, so divide accordingly
  //                (e.g. peakCount=32 → ~8 visible peaks).
  //   sharpness    cusp exponent. 0.5 = sharp angular tips
  //                (matching the screenshot); 1 = smooth |sin|;
  //                2 = rounded humps.
  //   lines        number of stacked rings (engraved fill).
  //   spacing      radial gap between adjacent rings (rings stack
  //                INWARD toward origin).
  //   samples      points per ring (smoothness).
  function radialRidges(baseRadius, peakHeight, peakCount, sharpness, lines, spacing, samples) {
    var p = '';
    for (var i = 0; i < lines; i++) {
      var r0 = baseRadius - i * spacing;
      var amp = peakHeight * (1 - i / lines);
      for (var j = 0; j <= samples; j++) {
        var t = j / samples;
        var theta = TAU * t;
        var s = Math.abs(Math.sin(peakCount * theta / 2));
        // Same flipped formula as ridges(): cusps point OUTWARD
        // (away from origin) at sin=0, smooth valleys at sin=±1.
        var r = r0 + amp * (1 - Math.pow(s, sharpness));
        var x = r * Math.cos(theta);
        var y = r * Math.sin(theta);
        p += (j === 0 ? 'M' : 'L') + x.toFixed(2) + ' ' + y.toFixed(2) + ' ';
      }
    }
    return p;
  }

  // ---------- radialWaves: stacked wavy rings ----------
  // Each line follows a ring whose radius is itself a slow wave
  // (ringWaveAmp/ringWaveK), and on top of that wavy ring rides a
  // higher-frequency ripple (amp/k). Stacked N times.
  //   r(θ) = (baseRadius − i·spacing)
  //          + ringWaveAmp · cos(ringWaveK · θ)   ← slow wave shapes the ring itself
  //          + amp_i · cos(k · θ + φ_i)           ← fast ripples on top
  //
  //   baseRadius   outermost ring's average radius.
  //   amp          outermost ring's fast-ripple amplitude (drops
  //                to 0 at the innermost line).
  //   k            cycles of the fast ripple per full 360°.
  //   phi          phase rotation of the fast ripple.
  //   phaseShift   how much each successive (inward) ring's phase
  //                rotates. 0 = aligned; small (~0.05) = fanned.
  //   ringWaveAmp  amplitude of the slow wave that shapes the
  //                ring's radius itself. 0 = perfect circle; big
  //                numbers make the ring strongly wavy, breaking
  //                up the clean radial alignment of the cusps.
  //   ringWaveK    cycles of the slow ring-wave per full 360°.
  //                Low (2–4) = a few big lobes; higher = more
  //                undulations of the ring shape.
  //   lines        number of stacked rings.
  //   spacing      radial gap between adjacent rings (stack
  //                INWARD toward origin).
  //   samples      points per ring (smoothness).
  function radialWaves(baseRadius, amp, k, phi, phaseShift, ringWaveAmp, ringWaveK, lines, spacing, samples) {
    var p = '';
    for (var i = 0; i < lines; i++) {
      var r0 = baseRadius - i * spacing;
      var ampi = amp * (1 - i / lines);
      var phasei = phi + i * phaseShift;
      for (var j = 0; j <= samples; j++) {
        var t = j / samples;
        var theta = TAU * t;
        var ringWave = ringWaveAmp * Math.cos(ringWaveK * theta);
        var r = r0 + ringWave + ampi * Math.cos(k * theta + phasei);
        var x = r * Math.cos(theta);
        var y = r * Math.sin(theta);
        p += (j === 0 ? 'M' : 'L') + x.toFixed(2) + ' ' + y.toFixed(2) + ' ';
      }
    }
    return p;
  }

  // Trochoid kept around — disabled.
  var pathT = trochoid(1349, 120.5, 350.2, 402.2, 160);
  // var pathT = trochoid(1369, 210.6, 450.3, 350, 160);

  // Rose. (a, k, phi, turns, samples) — phi=0 means pointing right.
  var pathR = rose(680, 5.19, 5000, 100, 340);

  // Wave. (base, amp, k, phi, turns, samples) — wavy ring around origin.
  var pathW =  wave(400, 400, 4.16, 0, 40, 240);

  // Ridges (Cartesian — horizontal band across the page).
  var pathRG = ridges(50, 380, 1280, 220, 8, 0.5, 70, 1.6, 240);
  var pathSL = sineLine(50, 470, 1280, 14, 1.5, 0, 480);

  // Radial ridges (polar — same cusped-ridge math wrapped around
  // the pattern origin so it radiates from offscreen TL like the
  // trochoid composition).
  // (baseRadius, peakHeight, peakCount, sharpness, lines, spacing, samples)
  var pathRR = radialRidges(900, 200, 15, 0.5, 30, 1.8, 520);

  // Radial waves (smooth rolling-sine engraved band, no cusps).
  // (baseRadius, amp, k, phi, lines, spacing, samples)
  // (baseRadius, amp, k, phi, phaseShift, lines, spacing, samples)
  // (baseRadius, amp, k, phi, phaseShift, ringWaveAmp, ringWaveK, lines, spacing, samples)
  var pathRW2 = radialWaves(1350, 333, 20, 1, 0.07, 100, 9, 100, 6.3, 1000);

  // V6's crop — pattern origin near the TL viewport corner.
  // Radial fade-to-transparent baked into the SVG mask so the
  // outer (BR) reaches of the lace dissolve to transparency,
  // letting the body's red→green bloom show through.
  var svg =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="50 50 1280 800" preserveAspectRatio="none">' +
      '<defs>' +
        '<radialGradient id="laceFade" gradientUnits="userSpaceOnUse" cx="50" cy="50" r="1500">' +
          '<stop offset="0%"   stop-color="white" stop-opacity="1"/>' +
          '<stop offset="50%"  stop-color="white" stop-opacity="0.85"/>' +
          '<stop offset="80%"  stop-color="white" stop-opacity="0.5"/>' +
          '<stop offset="100%" stop-color="white" stop-opacity="0.3"/>' +
        '</radialGradient>' +
        '<mask id="laceMask" maskUnits="userSpaceOnUse" x="50" y="50" width="1280" height="800">' +
          '<rect x="50" y="50" width="1280" height="800" fill="url(#laceFade)"/>' +
        '</mask>' +
      '</defs>' +
      '<g mask="url(#laceMask)">' +
        //'<path d="' + pathT + '" fill="none" stroke="#000" stroke-width="0.5"/>' +
        // '<path d="' + pathR + '" fill="none" stroke="#000" stroke-width="0.8"/>' +
        // '<path d="' + pathW + '" fill="none" stroke="#000" stroke-width="0.8"/>' +
        // '<path d="' + pathRG + '" fill="none" stroke="#000" stroke-width="0.5"/>' +
        // '<path d="' + pathSL + '" fill="none" stroke="#000" stroke-width="0.6"/>' +
        // '<path d="' + pathRR + '" fill="none" stroke="#000" stroke-width="0.5"/>' +
        '<path d="' + pathRW2 + '" fill="none" stroke="#000" stroke-width="0.5"/>' +
      '</g>' +
    '</svg>';
  var url = 'url("data:image/svg+xml;utf8,' + encodeURIComponent(svg) + '")';
  document.documentElement.style.setProperty('--lace-mask', url);
})();
