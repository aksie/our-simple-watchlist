# Our simple watchlist

A shared list of films, series and podcasts to watch, with a small page to tick things off.

- `watchlist.md` is the list: one line per title, newest at the bottom. It can be edited by hand.
- `index.html` and `core.js` are the page, served with GitHub Pages.
- `inbox/` receives items sent from the phone's share sheet; the page asks you to review them.

## The list format

```
- [ ] Title (note) #movie #label +2026-11-21 https://link
```

`[ ]` is not seen, `[x]` is seen, a balloon after the box means we loved it.
`#movie`, `#series` or `#podcast` sets the type; any other `#word` is a label.
