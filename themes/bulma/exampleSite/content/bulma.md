+++
date = "2017-04-01T14:19:25+01:00"
title = "bulma theme"
draft = false
menu = "main"
weight = 3
+++


# Bulma Theme for Hugo

`Bulma` is a simple and a responsive Hugo theme that offers a traditional blog mixed with a landing page designed to bootstrap your frontend!.

![bulma hugo landingPage](https://cldup.com/tV6cFj0UDo.png)

# Demo

To see this theme in action, check out my [blog](http://blog.elemnts.org) which is rendered with this theme and see it’s configuration on Github.

## Features

- Mobile-first Design : Every element in Bulma is mobile-first and optmizes for vertical reading, so by default on mobile
- Responsive Design : Optimized for mobile, tablet, desktop
- Google Analytics : Google Analytics using the internal async template
- Disqus Commenting : Post comments with Disqus using the internal template
- OpenGraph support : SEO-optimized using OpenGraph
- Schema Structured Data : Schema Structured Data and Meta tags
- Paginated Lists : Simple list pagination with page indicators
- Reading Time : Post reading time and update notice set user expectations
- Last Modified time : 
- Meta data for all article : Rich post data including links to category and tag taxonomy listings, author and word count
- Related Posts : Related Content for increased page views and reader loyalty
- Section Menu : Configurable Section Menu for global site navigation
- Block Templates : Block Templates for foolproof layout extensions
- Table of Contents : Accessible Table of Contents
- Variants themes : Configurable theme
- SEO Site Verification : Site verification with Google, Bing Alexa and Yandex
- Media lazy loading : Intelligent Lazyloading for images and iFrame embeds
- Syntax Highlighting : Provide a richer experience when sharing code snippets on your post. 
- 404 page : 404 page with animated background

## Installation

Inside the folder of your Hugo site run:

    $ mkdir themes
    $ cd themes
    $ git clone https://github.com/jeblister/bulma.git

For more information read the official [setup guide](//gohugo.io/overview/installing/) for Hugo.


Copy custom archetypes to your site:

```shell
cp themes/bulma/archetypes/* archetypes
```

Finally, include the settings in your site's `config.toml`:

```toml
baseurl = "https://blog.elemnts.org" # Controls base URL
languageCode = "en-US" # Controls html lang attribute
title = "bulma for Hugo Site" # Homepage title and page title suffix
paginate = 5 # Number of posts to show before paginating
theme = "bulma" # to use as default theme

enableRobotsTXT = true # Suggested, it generates a robots.txt
googleAnalytics = "" # Optional, add tracking Id for analytics
disqusShortname = "" # Optional, add Disqus shortname for comments
SectionPagesMenu = "main" # Enable menu system for lazy bloggers

[params]
  theme_variant = "" # possible value for the theme_variant `cerulean,cosmo,cyborg,darkly,flatly,journal,litera,lumen,lux,materia,minty,pulse,sandstone,simplex,slate,solar,spacelab,superhero,united,yeti`
  description = "" # Suggested, controls default description meta and landing page
  powered_by = "" # Optional, controls name display on footer
  hide_author = false # Optional, set true to hide author name on posts
  images = [] # Suggested, controls default OpenGraph images
  theme_variant = "" # Optional, for use to   author = "" # Optional, controls author name display on meta tag
  github = "" # Optional, to display link to github account in menu bar
  twitter = "" # Optional, to display link to twitter account in menu bar
```

That's it! Everything else is optional.


## Getting Started

There are a few concepts this theme employs to make a personal blog. It's important to read this as you may not see what you expect upon launching. Since this theme is built to be a personal blog it opts for some simplifications like using the ["Section Menu for the Lazy Blogger"](https://gohugo.io/extras/menus/#section-menu-for-the-lazy-blogger) option in Hugo for displaying a simple menu. It assumes you want to call your blog posts `posts` and organizes them as such. For example, creating a new post with Hugo would require you typing:

```
  $ hugo new posts/my-new-post.md

```

It also assumes you want to display links to your sections of content `posts`and display links to other pages in the menu and requires some setup on your part. This guide will take you through the steps to configure your blog to use the theme.

### Configuring you website

#### Where should blog post markdown files be stored?

The theme works with other content types, but posts work best when grouped under `posts`. When using the `posts` content type you'll have a customized list page sorted by year and the default list page. Here's an example:

![Custom List Page](https://cldup.com/y61NIUWHTR.png)


#### How to configure the menu ?

Theme uses [Section Menu for Lazy Bloggers](https://gohugo.io/extras/menus/#section-menu-for-the-lazy-blogger) to produce global site navigation, if enabled.

Because of this you'll need to make one change to your `config.toml` file. Add **main** as the `SectionPagesMenu`.

```toml
SectionPagesMenu = "main"
```

Your individual posts don't need to organize themselves into menu groupings. Everything is assumed to be grouped at the top level. One exception to this is if you want to add a custom page to the root of the menu. In this case you would want to add `menu: main` to your page's Front Matter.

You can then control the name and weight of these menus in your `config.toml` by adding a section for each menu item you'd like to display:

```toml
[[menu.main]]
  name = "Posts"
  weight = 1
	identifier = "posts"
  url = "/posts/"
```

**Recommendation:** Add `SectionPagesMenu` to your `config.toml` file.  
**Recommendation:** Don't set a `menu` in your post's Front Matter unless you want it to display on the navigation.  
**Recommendation:** Configure the menu items by adding `menu.main` sections to your `config.toml` file.

#### Defining yourself as the Author

In this case you would want to add `author = "your name"` variable like your name to your post's Front Matter.

#### Intelligent Lazyloading

Lazyloading prioritizes when and how images and more are downloaded, improving perceived performance and reducing page load times. When activated, lazyloading will start working automatically. No JavaScript configuration is necessary.

**What makes it _Intelligent_?** If no lazyloaded content is detected on a page when the site is generated, the feature will not be activated and no additional downloads will occur.

To activate lazyloading with [lazysizes], add `lazyload` to the `class` attribute of your images/iframes in conjunction with a `data-src` and/or `data-srcset` attribute:

```html
<!-- non-responsive -->
<img data-src="image.jpg" class="lazyload">
```

```html
<!-- responsive with automatic sizes calculation -->
<img
  data-sizes="auto"
  data-src="image2.jpg"
  data-srcset="image1.jpg 300w, image2.jpg 600w, image3.jpg 900w"
  class="lazyload">
```

```html
<!-- iframe example -->
<iframe frameborder="0"
  class="lazyload"
  allowfullscreen
  data-src="//www.youtube.com/embed/ZfV-aYdU4uE">
</iframe>
```

Additional information and examples, including how to set-up and use LQIP (Low-Quality Image Placeholders), are available on the [lazysizes] repository on GitHub.

#### Webmaster Verification

Verify your site with several webmaster tools including Google, Bing, Alexa and Yandex. To allow verification of your site with any or all of these providers simply add the following to your `config.toml` and fill in their respective values:

```toml
[params.seo.webmaster_verifications]
  google = "" # Optional, Google verification code
  bing = "" # Optional, Bing verification code
  alexa = "" # Optional, Alexa verification code
  yandex = "" # Optional, Yandex verification code
```

### Index Blocking

Just because a page appears in your `sitemap.xml` does not mean you want it to appear in a SERP. Examples of pages which will appear in your `sitemap.xml` that you typically do not want indexed by crawlers include error pages, search pages, legal pages, and pages that simply list summaries of other pages.

Though it's possible to block search indexing from a `robots.txt` file, Bulma makes it possible to block page indexing using Hugo configuration as well. By default the following page types will be blocked:

- Section Pages (e.g. Post listings)
- Taxonomy Pages (e.g. Category and Tag listings)
- Taxonomy Terms Pages (e.g. Pages listing taxonomies)

To customize default blocking configure the `noindex_kinds` setting in the `[params]` section of your `config.toml`. For example, if you want to enable crawling for sections appearing in [Section Menu](#adding-a-section-menu) add the following to your configuration file:

```
[params]
  noindex_kinds = [
    "taxonomy",
    "taxonomyTerm"
  ]
```

To block individual pages from being indexed add `nofollow` to your page's front matter and set the value to `true`, like:

```toml
noindex = true
```

And, finally, if you're using Hugo `v0.18` or better, you can also add an `_index.md` file with the `noindex` front matter to control indexing for specific section list layouts:

```shell
├── content
│   ├── modules
│   │   ├── starry-night.md
│   │   └── flying-toilets.md
│   └── news
│       ├── _index.md
│       └── return-flying-toasters.md
```

To learn more about how crawlers use this feature read [block search indexing with meta tags](https://support.google.com/webmasters/answer/93710).

### Custom CSS

To add your own theme css or override existing CSS without having to change theme files do the following:

1. Create a `style.css` in your site's `layouts/static/css directory` or use `custom.css` file in 'themes/bulma/static/css/custom.css`
1. Add link to this file in 'themes/bulma/layouts/blog/single.html'.

Default `style block` :

```html
{{ define "style"}}
<link rel="stylesheet" href="{{ .Site.BaseURL}}/css/blog-post.css"> <!--base css for blog posts-->
<link rel="stylesheet" href="{{ .Site.BaseURL}}/css/code-highlighting/dark.css"> <!--Provide a richer experience when sharing code snippets on your site. bulma provides support for code highlighting using the lovely `dark` or `light`themes used in [Atom](https://github.com/atom/atom).-->
<link rel="stylesheet" href="{{ .Site.BaseURL}}/css/custom.css"> <!--Custom CSS-->
{{ end }} 

```

### Theme Variants

[`bulmaswatch`](https://jenil.github.io/bulmaswatch/) provides a few variants you may wish to use instead of the [bulma](http://bulma.io/)default theme.

You can use the variant you like by updating the `theme_variant` setting in the site configuration like:
```haml
    theme_variant = "journal"

```
here all the variants, pick one :

```
cerulean,cosmo,cyborg,darkly,flatly,journal,litera,lumen,lux,materia,minty,pulse,sandstone,simplex,slate,solar,spacelab,superhero,united,yeti
```

## Contributing

Did you find a bug or have an ideas for new features? Feel free to use the issue tracker to let me know or make a pull request.

There's only one rule...there are no rules.

## License

MIT

## Credit 
[bulma-templates]: https://dansup.github.io/bulma-templates/
[after dark]: https://github.com/comfusion/after-dark
[lazysizes]: https://github.com/aFarkas/lazysizes
[bulmaswatch] : (https://jenil.github.io/bulmaswatch/) 
[images] : https://images.unsplash.com

## Contact

This is the first theme I've made for Hugo, so I'm sure I've done some things wrong or assumed too much. If you have ideas or things that should be fixed, please let me know.

- [Mohamed JEBLI](http://findme.surge.sh) [@jebli_7](http://twitter.com/jebli_7)
