---
author: LikC1606
title: TheoremOS
summary: TheoremOS is a browser workbench for mathematicians working in Lean 4 with Mathlib. Start with a problem in prose or LaTeX, or import a single Lean file.
features:
- Compare the original question, generated Lean statement, and back-translation before confirming the formal target.
- In Advanced Lean, assign up to four agents to shared subgoals or independent approaches.
- Inspect a failed candidate and its compiler diagnostics, then tell the agents what to try next.
- Check which formal goals passed and whether the researcher confirmed the statement.
- Download Lean source, a verification report, or a kit with pinned project settings and instructions for checking the proof locally without a model call.
categories:
- Analysis and Computations
- Project Research
tags:
- AI
- Coordination
- LLM
platforms:
- Web
fields:
- Mathematics
- AI
links:
- name: TheoremOS
  link: https://theoremos.top/en/
- name: Public rehearsal
  link: https://app.theoremos.top/practice.html?lang=en
date: '2026-11-24'
draft: false
open_source: false
---

With informal input, the default workflow lets you review the generated Lean statement and its back-translation before two agents draft a proof plan. You can revise the plan before approving it, then inspect failed attempts and suggest what to try next. A separate Lean kernel check records which goals a completed candidate proves.

The public rehearsal uses a preset problem and recorded checks. It requires no account or API key. New runs require approved research preview access and a supported model API key. The workbench charges no platform fee during the preview. Your model provider bills for inference. The hosted runtime is proprietary.

Submitted by a TheoremOS maintainer. The description was drafted with AI assistance.
