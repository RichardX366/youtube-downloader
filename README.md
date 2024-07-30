# How to Use

1. Use `yarn && yarn build` to build the project. After building once you don't have to again.
2. Put `KEY=DEEPL_KEY` into a .env file.
3. Use the command `yarn start VIDEO_IDS` to start it up. VIDEO_IDS is a comma separated list of the video IDs. You can get this from the video URL or for playlists, the below script.

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
2. Run `yt-downloader VIDEO_IDS` to download the videos and generate the subtitles
