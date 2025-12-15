# Why build Coho?

So, the Mastodon space is pretty busy when it comes to Mastodon clients. There are big players like Phanphy, Tusky, Mammoth, Elk, Moshidon etc that have large amounts of users. All of these apps are pretty good apps, they get the job more than done and each one tends to have something that sticks out about it. However, there are some common threads I have run into across many many of these clients:

- Bad performance, normally loading performance, especially on less than ideal network connections.
- Design that is very busy and overwhelming
- Web app clients that don't take full advantage of the web platform (such as share_target, custom titlebars, etc.), leaving clients that feel less powerful than their native counterparts
- Apps that don't handle offline or "lie-fi" scenarios very well. This leaves a very subpar experience.

Because of this, I decided to build my own Mastodon client that puts:

- inclusivity and respect
- performance
- user experience

first. The goal with Coho is to build a fast, easy to use Mastodon client that anyone can use, no matter what device you have or what your network connection is like.

## How do we reach this goal?

To reach this goal, this app is built with a few principles in mind:

- We only ever load the javascript the user needs for whatever the user is doing right now.
  - In practice, this means strict and widespread lazy loading that is backed by smart service worker caching strategies. With this, we can minimize latency while also reducing the first page load time.
- User interactions should never be tied to the network.
  - For instance, when the user clicks the "like" button on a post, that button will update its state separate from the actual network call, with error handling to handle unsuccessful network calls.
- All interactions that require a network call should work while offline or on a bad network connection to the extent that is possible:
  - We make very heavy use of the Background Sync API in our Service Worker to ensure that interactions are recorded offline and replayed once the user is back online.
  - We use the fetch retries origin trial in Chromium to automatically retry failed requests, which can be common in "lie-fi" scenarios.
- Our design focus is on simplicity and efficient use of color and space. The purpose of Coho is not to display every piece of information possible to the user at any time, instead presenting only what is important to the user at any point in time. This is a fine line to ride as you also need to ensure that your power users can access everything they need.
- Smart use of web workers, css containment, shadow dom, scheduling and more to ensure that our app runs at a consistent 60fps and our time to next paint is minimal to none for any interaction.
- Nothing should ever "pop-in" on the user. Any UI that dynamically displays should have a slight animation.

## Why a web app?

The web offers some crucial features that line up extremely well with my stated goals above:

- Web apps tend to be much smaller than native apps, reducing the overall disk size of my app
- Web apps (and yes there is a spectrum and I am purposefully talking in generalities. As with anything in technology, there are important details) can run better on lower-end devices than native apps can.
- Web apps enable users to "try" your app in the browser before installing, this cuts friction to entry for users who may not be ready to install your app but still want to try it. In the app stores users have to make a big decision up front before they can even try your app.
- Cross-Platform: For an app being built by one person like me, going with a web app enables me to serve users on any platform without having multiple versions of the app that I have to build and maintain.

## Common Questions

- Why a SPA (Single page app) instead of a normal multi-page web app?
  - There are a few reasons here, but it should be known that for 2.0, we are looking at a multi-page app approach. We originally chose a SPA as we wanted to show developers that you can have that SPA approach, that is unfortunately the initial approach for many web developers since React happened, and still build apps that respect users. Going with this approach means there is more complexity than needed in some cases (such as routing or SSR).
- Browser support?
  - Coho works in all modern browsers
- Why Lit?
  - Lit gives us familiar syntax, performant rendering, and more but in a tiny bundle compared to modern web frameworks. This gives us a lot of headroom for our actual application code and lets us easily make full use of the modern web platform to deliver the fastest app possible.
- Why not React, Vue, Angular etc?
  - Because we respect users
