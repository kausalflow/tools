---
title: Password Protection with PassKeeper
date: 2008-12-30
modified: 2010-11-22
draft: false
---
After recently losing a USB flash drive with all my passwords on it, I was grateful for the precaution I took by storing my password data encrypted using Brad Greenlee’s PassKeeper password manager.

> <a title="PassKeeper" href="http://www.passkeeper.com/">PassKeeper</a> is a Windows utility that allows you to keep a list of accounts with usernames, passwords, and notes. This list is stored encrypted.

The utility is freeware and has been available for public download since the mid-90’s. Data are encrypted using the 56-bit <a title="DES cipher" href="http://en.wikipedia.org/wiki/Data_Encryption_Standard" rel="nofollow">DES</a> cipher and stored in an DAT file in the application’s root directory. The size of the application (189 kilobytes) and the data file (~400 bytes/entry) are lightweight and can easily be carried around on any USB flash drive.

**Update 2016-11-22**: In 2010 I switched to KeePass, which [works across devices](/managing-passwords-across-devices/) and provides features such as secure password generation and grouping.
{: .notice--info}

<!--more-->

![Image of PassKeeper running under Windows Vista](//s3.amazonaws.com/images.habdas.org/passkeeper.png)

The application’s user interface (pictured left) is straight-forward and easy to use, and the system-oriented UI design has become more visually appealing as Windows has evolved.

One thing that hasn't evolved, however, is the utility’s application icon (not pictured). The application icon has looked outdated since about Windows 98. But fixing the blemish is easy enough. Just create a Windows Shortcut and use a different icon. The `imageres.dll` located in `%windir%\system32\` in Windows Vista contains a decent-looking padlock icon that can be used if desired.

With a little practice, the entire utility can be navigated using only the keyboard, and passwords can be quickly copied from PassKeeper and pasted into online forms and desktop applications without the use of a mouse. Coincidentally, the copy/paste behavior may help enhance security by masking password keystrokes from key loggers.

Over time, one noticeable drawback of using PassKeeper is that it does not provide a built-in password generator. Another is that passwords copied to the clipboard are not automatically cleared after a set amount of time, requiring the user to do so by some other means—if at all. There is also a bug with account names using certain special characters, though in my ten years using the utility I only saw it once. According to program readme.txt on [www.passkeeper.com][1] the utility is limited to 128 entries, but offers a simple workaround for the limitation.

Overall, PassKeeper is a straight-forward, easy-to-use utility for managing and securing personal passwords and account data. And though it's starting to show its age, it continues run stably as Windows evolves. If you decide to use PassKeeper and carry around password data on a USB flash drive, the 56-bit encryption used should buy most users plenty of time to change any sensitive passwords should the device be lost.

## Other password managers worth checking out

*   <a href="http://keepass.info/">KeePass Password Safe</a> — A free open source password manager, which helps you to manage your passwords in a secure way.
*   [KeePassX][2] -- Platform-independent port of KeePass Password Safe that works on Windows, Mac and Linux to name a few. Compatible with existing KeePass password databases.
*   [KeePassDroid][3] -- A port of the KeePass Password Safe for the Android platform. Try it in conjunction with DropBox and KeePassX for a great cross-platform personal security solution.
*   [1Password][5] -- Widely-used, paid password management solution

## Password managers to pass up

[RoboForm][4] — Though it has a version specifically for use with USB flash drives, RoboForm is reliant on a web browser to function; it is not suitable for managing desktop application passwords and may not function in all browsers.

 [1]: http://www.passkeeper.com
 [2]: http://www.keepassx.org/
 [3]: http://www.keepassdroid.com/
 [4]: http://www.roboform.com/ "RoboForm"
 [5]: https://agilebits.com/onepassword
