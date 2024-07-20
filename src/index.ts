import { Downloader } from 'ytdl-mp3';
import { Promise as id3 } from 'node-id3';
import deepL from 'deepl';
import {
  renameSync,
  createWriteStream,
  unlinkSync,
  mkdirSync,
  existsSync,
} from 'fs';
import { config } from 'dotenv';
import axios from 'axios';
import ytdl from '@distube/ytdl-core';

const outDir = __dirname + '/../out';

config({ path: __dirname + '/../.env' });
if (!existsSync(outDir)) mkdirSync(outDir);

const downloader = new Downloader({
  outputDir: outDir,
});

const translate = async (text: string) => {
  const { data } = await deepL({
    free_api: true,
    text,
    target_lang: 'EN',
    auth_key: process.env.KEY as string,
  });
  return data.translations[0].text;
};

const downloadImage = async (url: string, path: string) => {
  const { data: response } = (await axios({
    method: 'GET',
    url,
    responseType: 'stream',
  })) as { data: NodeJS.ReadableStream };

  const stream = createWriteStream(path);
  response.pipe(stream);

  return new Promise<void>((res) => stream.on('finish', res));
};

const ids = process.argv[2].split(',');

ids.forEach(async (id) => {
  const file = await downloader.downloadSong(id);
  const song = await ytdl.getInfo(id);

  const artist = await translate(song.videoDetails.author.name);
  const title = (await translate(song.videoDetails.title))
    .split(' ')
    .map((word) => word[0].toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');

  let thumbnail = {
    url: '',
    width: 0,
    height: 0,
  };

  song.videoDetails.thumbnails.forEach((thumb) => {
    if (thumb.width > thumbnail.width && thumb.url.includes('.jpg')) {
      thumbnail = thumb;
    }
  });

  const thumbnailPath = file.replace('.mp3', '.jpg');

  await downloadImage(thumbnail.url.split('?')[0], thumbnailPath);

  await id3.write(
    {
      title: title,
      artist: artist,
      image: thumbnailPath,
    },
    file,
  );

  renameSync(file, `${outDir}/${title}.mp3`);
  unlinkSync(thumbnailPath);
});
