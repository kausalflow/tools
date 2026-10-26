---
title: "{{ replace .Name "-" " " | title }}"
images: # Create a folder in /static/images/tools that has the same name as this current markdown file and place the images there. We only need the file name here. If this is not clear, please refer to existing tools as references.
  - path:
categories:
  - ""
tags:
  - ""
links:
  - name:
    link:
summary: ""
features:
  - ""
platforms:
  - ""
fields:
  - ""
pricing: # free, freemium (free plan with paid upgrades) or paid
open_source: # true or false
alternatives_to: # well-known tools this one replaces, e.g. EndNote; each becomes an /alternatives/ page
  - ""
plans:
  - name:
    description:
makers: # the makers of the tool
  - name:
    description:
author:    # the person who submitted this tool to KausalFlow
date: {{ .Date }}
draft: false
---