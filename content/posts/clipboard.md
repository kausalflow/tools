+++
title = "clipboard.js in hugo"
tags = ["clipboard","hugo", "javascript"]
categories = ["js"]
draft = false
description = "a modern approach to copy text to clipboard in hugo"
date = "2017-04-03T19:22:40+01:00"
+++

# Clipboard.js in hugo 




[clipboard.js](https://clipboardjs.com/) lets you easily copy text to the clipboard. With no need for Flash, it's a great lightweight way to allow your visitors to copy code snippets on your site. 

It's a perfectly combination with a syntax highlighting library like [rainbows](https://craig.is/making/rainbows) or [highlightjs](https://highlightjs.org/).

In this short tuto i implemented clipboard.js in my template [bulma](https://github.com/jeblister/bulma.git) for [hugo](https://gohugo.io/).

## Installation for hugo project

Get the package from [a third-party CDN provider](https://github.com/zenorocha/clipboard.js/wiki/CDN-Providers)
and place the clipboard.min.js file manually in your static `js` folder. Then include the JavaScript file in any of your
layouts files : 


{{< highlight html >}}
<script async type="text/javascript" 
src="{{ .Site.BaseURL }}/js/clipboard.min.js"></script>
{{< /highlight >}}


Finally, you’ll want to instantiate it. It this example we’re instantiating all `pre` elements :


{{< highlight javascript >}}


 /* * clipboard
for hugo * clip.js */ 

(function(document, Clipboard) {

    var $codes = document.querySelectorAll('pre');

    function addCopy(element) {
        var copy = document.createElement("button");
        copy.className = "copy button is-pulled-right";
        copy.textContent = "copy";
        element.append(copy);
    }

    for (var i = 0, len = $codes.length; i < len; i++) {
        addCopy($codes[i]);
    }


    new Clipboard('.copy', {
        target: function(trigger) {
            return trigger.previousElementSibling;
        }
    });
})(document, Clipboard);

{{< /highlight >}}
<hr> 
See how it look :

<img data-src="https://cldup.com/NZTjO7e4J5.png" class="lazyload">
