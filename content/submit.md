---
title: "Submit New Tools"
date: 2020-04-26T14:25:39+02:00
draft: false
---

There are two ways to submit a new tool.

## Using Our Form

We have created a form for you to submit new tools. We will regularly collect the results and integrate them into our website. Click the button below to submit a tool. All submissions are listed on [this trello board](https://trello.com/b/SwVhZkOp/tools-submissions).

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
{{< highlight go "linenos=table,linenostart=0" >}}
---
title: # Name of the tool
images: # Create a folder in /static/images/tools that has the same name as this current markdown file and place the images there. We only need the file name here. If this is not clear, please refer to existing tools as references.
  - path: # only the file name
categories:
  -
tags:
  -
links: # Links related to the tool
  - name:
    link:
summary:
features: # list of features
  -
platforms: # the platforms that the tool runs on. e.g., Web, Min, Mac, Android, iOS
  - ""
fields: # the field of science that this tool is mostly used in
  - ""
plans: # fees
  - name:
    description:
makers: # the makers of the tool
  - name:
    description:
author:      # the person who submitted this tool to KausalFlow
date:   # current date in iso-format
draft: false
---
{{< / highlight >}}
1. Fill in the fields in the new file. If it is unclear what to type in, please refer to existing tools inside `content/tools/`.
2. Commit, Push, and Create PR on GitHub.
