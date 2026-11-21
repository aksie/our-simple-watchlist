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

## Licence

The code of the page (`index.html` and `core.js`) is free software under the
GNU Affero General Public License, version 3 (`AGPL-3.0-only`). You may use,
change and share it; if you distribute it or run a changed version for others,
you must publish your source under the same licence. See the `LICENSE` file.

`watchlist.md` is our own list and is not part of that offer. If you fork this,
replace it with your own.
