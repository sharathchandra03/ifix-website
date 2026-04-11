const express = require('express');
const router = express.Router();
const axios = require('axios');

function parseRssVideos(xml) {
  const entries = xml.match(/<entry>[\s\S]*?<\/entry>/g) || [];

  return entries.map(entry => {
    const title = (entry.match(/<title>([\s\S]*?)<\/title>/) || [])[1] || '';
    const videoId = (entry.match(/<yt:videoId>([\s\S]*?)<\/yt:videoId>/) || [])[1] || '';
    const publishedAt = (entry.match(/<published>([\s\S]*?)<\/published>/) || [])[1] || '';
    const description = (entry.match(/<media:description[^>]*>([\s\S]*?)<\/media:description>/) || [])[1] || '';

    return {
      id: videoId,
      title: title.trim(),
      description: description.trim(),
      thumbnail: videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : '',
      publishedAt,
      channelTitle: 'IFIX Academy'
    };
  }).filter(video => video.id);
}

async function fetchVideosFromRss() {
  const YOUTUBE_CHANNEL_ID = 'UCEFbnYCVxll7Q3OPKb1B6jQ';
  const response = await axios.get(`https://www.youtube.com/feeds/videos.xml?channel_id=${YOUTUBE_CHANNEL_ID}`);
  return parseRssVideos(response.data);
}

// GET YouTube videos (fetch from API and cache)
router.get('/videos', async (req, res) => {
  try {
    const YOUTUBE_CHANNEL_ID = 'UCEFbnYCVxll7Q3OPKb1B6jQ';
    const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

    if (!YOUTUBE_API_KEY) {
      const rssVideos = await fetchVideosFromRss();
      return res.json(rssVideos.slice(0, 12));
    }

    // Fetch latest 12 videos from channel
    const response = await axios.get('https://www.googleapis.com/youtube/v3/search', {
      params: {
        part: 'snippet',
        channelId: YOUTUBE_CHANNEL_ID,
        maxResults: 12,
        order: 'date',
        type: 'video',
        key: YOUTUBE_API_KEY
      }
    });

    const videos = response.data.items.map(item => ({
      id: item.id.videoId,
      title: item.snippet.title,
      description: item.snippet.description,
      thumbnail: item.snippet.thumbnails.medium.url,
      publishedAt: item.snippet.publishedAt,
      channelTitle: item.snippet.channelTitle
    }));

    res.json(videos);
  } catch (error) {
    try {
      const rssVideos = await fetchVideosFromRss();
      return res.json(rssVideos.slice(0, 12));
    } catch (rssError) {
      console.error('YouTube API Error:', error.message);
      console.error('YouTube RSS Error:', rssError.message);
      res.status(500).json({ error: 'Failed to fetch YouTube videos' });
    }
  }
});

// GET channel info
router.get('/channel-info', async (req, res) => {
  try {
    const YOUTUBE_CHANNEL_ID = 'UCEFbnYCVxll7Q3OPKb1B6jQ';
    const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

    if (!YOUTUBE_API_KEY) {
      return res.json({
        id: YOUTUBE_CHANNEL_ID,
        title: 'IFIX Academy',
        description: 'Repair education and tutorials from IFIX Academy.',
        thumbnail: '',
        subscribers: '367K+',
        videoCount: '3200+',
        viewCount: '5Cr+'
      });
    }

    const response = await axios.get('https://www.googleapis.com/youtube/v3/channels', {
      params: {
        part: 'snippet,statistics',
        id: YOUTUBE_CHANNEL_ID,
        key: YOUTUBE_API_KEY
      }
    });

    const channel = response.data.items[0];
    res.json({
      id: channel.id,
      title: channel.snippet.title,
      description: channel.snippet.description,
      thumbnail: channel.snippet.thumbnails.medium.url,
      subscribers: channel.statistics.subscriberCount || 'Private',
      videoCount: channel.statistics.videoCount,
      viewCount: channel.statistics.viewCount
    });
  } catch (error) {
    res.json({
      id: 'UCEFbnYCVxll7Q3OPKb1B6jQ',
      title: 'IFIX Academy',
      description: 'Repair education and tutorials from IFIX Academy.',
      thumbnail: '',
      subscribers: '367K+',
      videoCount: '3200+',
      viewCount: '5Cr+'
    });
  }
});

module.exports = router;
