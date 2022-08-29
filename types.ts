export interface Image {
  url: string;
  filename: string;
  altText?: string;
}

export interface ThreadTweet {
  id: string;
  previousId?: string;
  text: string;
  timestamp: number;
  images: Image[];
  videos: string[];
}
