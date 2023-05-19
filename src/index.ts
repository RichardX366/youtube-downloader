import downloader from 'youtube-mp3-downloader';
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
import { Configuration, OpenAIApi } from 'openai';
import axios from 'axios';

const outDir = __dirname + '/../out';

config({ path: __dirname + '/../.env' });
if (!existsSync(outDir)) mkdirSync(outDir);

let cost = 0;
const ETAs: { [id: string]: number } = {};
const songs: {
  videoId: string;
  stats: { transferredBytes: number; runtime: number; averageSpeed: number };
  file: string;
  youtubeUrl: string;
  videoTitle: string;
  artist: string;
  title: string;
  thumbnail: string;
}[] = [];

const YD = new downloader({
  ffmpegPath: '/usr/local/bin/ffmpeg',
  outputPath: outDir,
  youtubeVideoQuality: 'highestaudio',
  queueParallelism: 999,
  progressTimeout: 1000,
});

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openAI = new OpenAIApi(configuration);

const translate = async (text: string) => {
  const { data } = await deepL({
    free_api: true,
    text,
    target_lang: 'EN',
    auth_key: process.env.KEY as string,
  });
  return data.translations[0].text;
};

const prompt = async (text: string) => {
  const {
    data: { choices, usage },
  } = await openAI.createChatCompletion({
    model: 'gpt-3.5-turbo',
    messages: [
      {
        content: text,
        role: 'user',
      },
    ],
  });
  cost += (usage?.total_tokens as number) * 2e-6;
  const message = choices[0].message?.content as string;
  return message;
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

const logUpdate = (text: string) => {
  process.stdout.clearLine(0);
  process.stdout.cursorTo(0);
  process.stdout.write(text);
};

YD.on('progress', (progress) => {
  ETAs[progress.videoId] = progress.progress.eta;
  logUpdate(`ETA: ${Math.round(Math.max(...Object.values(ETAs)))} seconds`);
});

YD.on('finished', async (err, data) => {
  songs.push(data);
  if (songs.length !== ids.length) return;

  const processedSongs = JSON.parse(
    await prompt(`Print the pure titles and artists without feat/ft of the following songs in original order and the format [{"title":TITLE,"artist":ARTIST},...]
${await translate(songs.map((song) => song.videoTitle).join('\n'))}`),
  ) as [];

  await Promise.all(processedSongs.map(handleSong));
  logUpdate('Done!\n');
});

const handleSong = async (
  song: { title: string; artist: string },
  i: number,
) => {
  const artist = song.artist.split(' feat')[0].split(' ft')[0];

  const title = song.title
    .split(' ')
    .map((word) => word[0].toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');

  renameSync(songs[i].file, `${outDir}/${title}.mp3`);

  await downloadImage(
    songs[i].thumbnail.split('?')[0],
    `${outDir}/${title}.jpg`,
  );

  await id3.write(
    {
      title: title,
      artist: artist,
      APIC: `${outDir}/${title}.jpg`,
    } as any,
    `${outDir}/${title}.mp3`,
  );

  unlinkSync(`${outDir}/${title}.jpg`);
};

const ids = process.argv[2].split(',');
ids.forEach((id) => YD.download(id));

process.on('beforeExit', () => console.log(`$${cost.toFixed(5)} used`));
