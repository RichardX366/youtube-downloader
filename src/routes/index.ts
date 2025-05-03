import express, { Router } from 'express';
import { Promise as id3 } from 'node-id3';
import deepL from 'deepl';
import { unlink } from 'fs/promises';
import ytdl from '@nuclearplayer/ytdl-core';
import ffmpeg from 'fluent-ffmpeg';
import multer from 'multer';
import { fileTypeFromBuffer } from 'file-type';

const baseRouter = Router();

baseRouter.use(express.static(__dirname + '/../../public'));

const translate = async (text: string) => {
  const { data } = await deepL({
    free_api: true,
    text,
    target_lang: 'EN',
    auth_key: process.env.DEEPL_KEY as string,
  });
  return data.translations[0].text;
};

baseRouter.get('/info/:id', async (req, res) => {
  const { id } = req.params;
  if (!id || (!ytdl.validateID(id) && !ytdl.validateURL(id))) {
    return res.status(404);
  }

  const song = await ytdl.getInfo(id);

  const [artist, title] = await Promise.all([
    translate(song.videoDetails.author.name),
    translate(song.videoDetails.title).then((title) =>
      title
        .split(' ')
        .map((word) => word[0].toUpperCase() + word.slice(1).toLowerCase())
        .join(' ')
        .replaceAll('/', '')
        .replaceAll('\\', ''),
    ),
  ]);

  let thumbnail = {
    url: '',
    width: 0,
    height: 0,
  };

  song.videoDetails.thumbnails.forEach((thumb) => {
    if (thumb.width > thumbnail.width) {
      thumbnail = thumb;
    }
  });

  const thumbnailBuffer = Buffer.from(
    await fetch(thumbnail.url).then(
      async (res) => new Uint8Array(await res.arrayBuffer()),
    ),
  );

  const thumbnailDataUrl = `data:${
    (await fileTypeFromBuffer(thumbnailBuffer))?.mime
  };base64,${thumbnailBuffer.toString('base64')}`;

  res.json({
    artist,
    title,
    thumbnail: thumbnailDataUrl,
    loudness: song.player_response.playerConfig.audioConfig.loudnessDb,
  });
});

baseRouter.post(
  '/download/:id',
  multer({
    storage: multer.diskStorage({}),
    fileFilter(req, file, callback) {
      const { id } = req.params;
      if (!id || (!ytdl.validateID(id) && !ytdl.validateURL(id))) {
        return callback(new Error('Invalid video ID'));
      }

      if (file.mimetype === 'image/png' || file.mimetype === 'image/jpeg') {
        callback(null, true);
      } else {
        callback(new Error('Invalid file type'));
      }
    },
  }).single('thumbnail') as any,
  async (req, res) => {
    const { id } = req.params;
    if (!id || (!ytdl.validateID(id) && !ytdl.validateURL(id))) {
      return res.status(404);
    }

    if (!req.body.title) {
      return res.status(400).send('Title is required');
    }

    if (!req.body.loudness) {
      return res.status(400).send('Loudness is required');
    }

    if (!req.file) {
      return res.status(400).send('Thumbnail file is required');
    }

    const filename = `/tmp/${ytdl.getVideoID(id)}.mp3`;

    const stream = ytdl(id, {
      quality: 'highestaudio',
      filter: 'audioonly',
    });

    await new Promise<void>((resolve, reject) =>
      ffmpeg(stream)
        .audioCodec('libmp3lame')
        .audioBitrate(192)
        .audioFilters([
          {
            filter: 'volume',
            options: 8 - req.body.loudness + 'dB',
          },
        ])
        .save(filename)
        .on('end', () => resolve())
        .on('error', (err) => reject(err)),
    );

    await id3.write(
      {
        title: req.body.title,
        artist: req.body.artist,
        album: req.body.album,
        image: req.file.path,
      },
      filename,
    );

    await unlink(req.file.path);

    res.sendFile(filename, () => unlink(filename));
  },
);

export default baseRouter;
