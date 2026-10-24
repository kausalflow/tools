{{- /* One tool as Markdown, shared by tools/single.md and llms-full.txt. */ -}}
# {{ .Title | htmlUnescape }}

{{ .Params.summary | default .Summary | plainify | replaceRE `\s+` " " | htmlUnescape }}
{{ with .Params.features }}
## Features
{{ range . }}
- {{ . | htmlUnescape }}
{{- end }}
{{ end }}
{{- with .Params.links }}
## Links
{{ range . }}{{ if .link }}
- [{{ .name | default .link | htmlUnescape }}]({{ .link }})
{{- end }}{{ end }}
{{ end }}
{{- with .Params.pricing }}
- Price: {{ index (dict "free" "free" "freemium" "free plan with paid upgrades" "paid" "paid") . | default . }}{{ end }}
{{- if .Params.open_source }}
- Open source: yes{{ end }}
{{- with .Params.alternatives_to }}
- Alternative to: {{ delimit . ", " }}{{ end }}
{{- with .Params.categories }}
- Categories: {{ delimit . ", " }}{{ end }}
{{- with .Params.fields }}
- Fields: {{ delimit . ", " }}{{ end }}
{{- with .Params.platforms }}
- Platforms: {{ delimit . ", " }}{{ end }}
{{- with .Params.tags }}
- Tags: {{ delimit . ", " }}{{ end }}
- Listed: {{ .Date.Format "2006-01-02" }}
- Page: {{ .Permalink }}
