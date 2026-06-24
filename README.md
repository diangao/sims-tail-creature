# Sims Tail Creature

A small browser-rendered study of a Karl Sims-style block creature with a tail-like gait.

The first pass is intentionally a renderer, not a full genetic algorithm:

- Three.js block morphology
- articulated body and tail segments
- sine-driven joint motion
- camera/light/stage tuned for quick GIF/video capture

## Run

```bash
npm install
npm run dev
```

## Direction

1. Scripted swimmer body with tail-like motion.
2. Add a tiny genotype format for block sizes and joint phases.
3. Add mutation and a visible fitness loop.
4. Save good creature presets as named studies.
