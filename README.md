# How to Use

1. Use `yarn && yarn build` to build the project. After building once you don't have to again.
2. Put `DEEPL_KEY=INSERT_YOUR_DEEPL_KEY` into a .env file.
3. Use the command `yarn start` to start it up. This will open a server on `localhost:3005`.

# Playlists

Paste this into browser console and pass in results.

```js
const links = [];
document
  .querySelectorAll('#items #wc-endpoint')
  .forEach((x) => links.push(x.href.split('=')[1].split('&')[0]));
console.log(links.join(','));
```

# Shortcut

1. Add `alias yt-downloader="node ~/PROJECT_ROOT/dist"` to your .bashrc or .zshrc
2. Run `yt-downloader` to start the server
3. Open `localhost:3005` in your browser
