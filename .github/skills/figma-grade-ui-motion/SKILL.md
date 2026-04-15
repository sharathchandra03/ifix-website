---
name: figma-grade-ui-motion
description: "Design and implement premium, creative, smooth website UI/UX motion like a senior Figma motion designer (10+ years). Optimized for React + Framer Motion and playful futuristic interfaces across landing pages, product pages, hero sections, interaction design, animation systems, and polished micro-interactions."
argument-hint: "Feature/page goal, target audience, brand vibe, and preferred stack (default: React + Framer Motion)."
user-invocable: true
---

# Figma-Grade UI + Motion Workflow

## What This Skill Produces

- A high-quality UI/UX direction with a clear visual system.
- A motion system that feels intentional, smooth, and performance-aware.
- Production-ready implementation guidance and/or code, prioritizing React + Framer Motion.

## Default Profile

- Stack: React + Framer Motion.
- Style direction: playful futuristic.
- Interaction tone: expressive but controlled; smooth transitions with clear hierarchy.

## When To Use

- You want a website or section to look and feel premium, creative, and modern.
- You need animation and interaction quality above basic template-level UI.
- You want a consistent motion language across a page, not isolated effects.

## Inputs To Collect First

1. Primary goal: conversion, storytelling, product clarity, brand impact, or trust.
2. Audience: who will use it and on what devices.
3. Brand direction: personality, colors, typography mood, and references.
4. Scope: full page, section, or component-level redesign.
5. Tech constraints: stack, libraries, performance budget, browser support.
6. Accessibility target: reduced motion support, contrast level, keyboard behavior.

## Procedure

1. Define Creative Direction

- Convert goals into 2 to 3 visual directions with explicit tradeoffs.
- Pick one direction with a short rationale tied to audience and KPI.

2. Build Visual System

- Establish typography scale, spacing rhythm, color tokens, and component rules.
- Define reusable layout primitives before detailing sections.

3. Define Motion Principles

- Set motion intent categories: attention, transition, feedback, and hierarchy.
- Set timing/easing ranges and choreography rules (stagger, overlap, delay caps).
- Keep motion subtle by default; reserve bold motion for key moments.

4. Map Interaction States

- Specify hover, focus, active, loading, success, and error behaviors.
- Ensure keyboard and touch states are equivalent in quality and clarity.

5. Compose Page Narrative

- Create section-by-section reveal logic (entry order and focal points).
- Use motion to guide reading flow, not distract from content.

6. Implement With Performance Constraints

- Prefer React component orchestration with Framer Motion variants and shared transition tokens.
- Prefer transform/opacity animations over layout-triggering properties.
- Avoid heavy repaint effects during scroll.
- Add progressive enhancement and safe fallbacks.

7. Accessibility and Responsiveness Pass

- Implement prefers-reduced-motion alternatives.
- Verify spacing, type scale, and motion cadence on mobile and desktop.

8. QA and Polish

- Review smoothness at common refresh rates.
- Remove redundant animation and reduce visual noise.
- Ensure consistency across all components and pages in scope.

## Decision Points And Branching

- If brand is premium/minimal:
  Use restrained contrast, larger whitespace, and low-amplitude motion.

- If brand is playful/expressive:
  Use stronger shapes, layered backgrounds, and higher motion variety with strict rhythm rules.

- If performance budget is tight:
  Reduce simultaneous animated elements, shorten active animation windows, and avoid blur-heavy effects.

- If user flow is conversion-heavy:
  Prioritize CTA clarity, feedback speed, and reduced decorative motion near actions.

## Quality Criteria (Definition Of Done)

- Visual coherence: typography, spacing, and color feel like one system.
- Motion coherence: all animations follow shared timing/easing principles.
- Smoothness: no obvious jank on realistic devices.
- Accessibility: reduced-motion mode and clear focus states are present.
- Responsiveness: desktop and mobile both feel intentionally designed.
- Production readiness: styles and animations are structured for reuse/maintenance.

## Output Format For Each Task

1. Creative direction summary (5 to 8 lines).
2. Design tokens and component behavior rules.
3. Motion spec table: interaction, trigger, duration, easing, delay.
4. Implementation plan by section/component.
5. Code implementation (or patch) in the requested stack.
6. QA checklist with performance and accessibility checks.

## Prompt Starters

- Build a playful futuristic React hero section with Framer Motion variants and premium reveal choreography.
- Redesign this page into a futuristic product experience with smooth motion hierarchy and mobile-first behavior.
- Create a reusable Framer Motion animation system for cards, modals, nav, and CTA interactions.
