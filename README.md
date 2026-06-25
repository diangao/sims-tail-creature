# Sims Tail Creature

A small browser-rendered study of a Karl Sims-style block creature with a tail-like gait.

The first pass is intentionally a renderer, not a full genetic algorithm:

- Three.js block morphology
- articulated body and tail segments
- sine-driven joint motion
- tiny genotype surface for body/tail/fin proportions
- stable, mutate, and crawler controls
- visible mutation jumps across palette, tail count, body depth, and gait
- camera/light/stage tuned for quick GIF/video capture

## Run

```bash
npm install
npm run dev
```

## Direction

1. Scripted swimmer body with tail-like motion.
2. Tiny genotype format for block sizes and joint phases.
3. Mutation controls and a visible stability readout.
4. Save good creature presets as named studies.
5. Add a real physics / selection loop once the visual target feels right.
