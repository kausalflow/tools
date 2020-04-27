---
title: "Submit New Tools"
date: 2020-04-26T14:25:39+02:00
draft: false
---

There are two ways to submit a new tool.

## Using Our Form

We have created a form for you to submit new tools. We will regularly collect the results and integrate them into our website. Click the button below.

{{< typeform-button >}}

## OR Create a Pull Request on GitHub

If your are familiar with GitHub, please create a new Pull Request here: [kausalflow/tools](https://github.com/kausalflow/tools/pulls)

We use [Hugo](https://gohugo.io/) to generate the website.

1. Install [Hugo](https://gohugo.io/)
2. Fork the repo [kausalflow/tools](https://github.com/kausalflow/tools)
3. `hugo new tools/name-of-tool.md`
4. Edit the new file in `content/tools/name-of-tools.md`
5. Commit, Push, and Create PR on GitHub

If you prefer **not** to install Hugo:

1. Fork the repo [kausalflow/tools](https://github.com/kausalflow/tools)
2. Create a new file `content/tools/name-of-tool.md` with the following content
{{< highlight go "linenos=table,hl_lines=8 15-17,linenostart=0" >}}
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
plans:
  - name:
    description:
authors:
  - name:
    description:
date: {{ .Date }}
draft: false
---
{{< / highlight >}}
4. Fill in the fields in the new file. If it is unclear what to type in, please refer to existing tools inside `content/tools/`.
5. Commit, Push, and Create PR on GitHub.
