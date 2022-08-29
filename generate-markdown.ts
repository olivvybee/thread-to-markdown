import path from 'path';

import { ThreadTweet } from './types';

interface Options {
  ensurePeriods?: boolean;
  imagePath: string;
}

export const generateMarkdown = (tweets: ThreadTweet[], options: Options) => {
  const { ensurePeriods = false, imagePath } = options;

  let output = '';

  tweets.forEach((tweet) => {
    output += tweet.text;
    if (ensurePeriods && !tweet.text.match(/.+[.,!?…-]$/)) {
      output += '.';
    }
    output += '\n\n';

    tweet.images.forEach((image) => {
      output += `![${image.altText || ''}](${path.join(
        imagePath,
        image.filename
      )})`;
      output += '\n\n';
    });

    tweet.videos.forEach((video) => {
      output += `!!! Video goes here: ${video} !!!`;
      output += '\n\n';
    });
  });

  return output.trim();
};
