import axios from 'axios';
import fs from 'fs';
import ora from 'ora';
import path from 'path';

import { ThreadTweet } from './types';

export const downloadImages = async (
  tweets: ThreadTweet[],
  directory: string
) => {
  console.log('Downloading images...');

  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory);
  }

  const images = tweets.flatMap((tweet) => tweet.images);

  let completed = 0;
  const spinner = ora(`0 of ${images.length} complete`);

  const promises = images.map(async (image) => {
    const { url, filename } = image;
    const outputPath = path.resolve('__dirname', directory, filename);
    const writer = fs.createWriteStream(outputPath);

    const response = await axios.get(url, { responseType: 'stream' });
    response.data.pipe(writer);

    return new Promise<void>((resolve, reject) => {
      writer.on('finish', () => {
        completed += 1;
        spinner.text = `${completed} of ${images.length} complete`;
        resolve();
      });
      writer.on('error', reject);
    });
  });

  await Promise.all(promises);
  spinner.succeed();
};
