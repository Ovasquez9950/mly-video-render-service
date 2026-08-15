const express = require('express');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');

const app = express();
app.use(express.json({ limit: '2mb' }));

const TMP = '/tmp';

app.get('/health', (req, res) => res.json({ ok: true }));

app.post('/render', async (req, res) => {
  const jobId = uuidv4();
  const imgPath = path.join(TMP, jobId + '.png');
  let audioPath = null;
  const outPath = path.join(TMP, jobId + '.mp4');
  try {
    const { imageUrl, audioUrl, ctaText, durationSeconds, apiKey } = req.body || {};
    if (process.env.RENDER_API_KEY && apiKey !== process.env.RENDER_API_KEY) {
      return res.status(401).json({ error: 'unauthorized' });
    }
    if (!imageUrl) return res.status(400).json({ error: 'imageUrl is required' });
    const duration = durationSeconds || 10;

    await downloadFile(imageUrl, imgPath);
    if (audioUrl) {
      audioPath = path.join(TMP, jobId + '.mp3');
      await downloadFile(audioUrl, audioPath);
    }

    const safeText = (ctaText || '').replace(/:/g, '\\:').replace(/'/g, "\\\\'");
    const drawtext = "drawtext=text='" + safeText + "':fontcolor=white:fontsize=42:box=1:boxcolor=black@0.55:boxborderw=16:x=(w-text_w)/2:y=h-th-60";

    const args = ['-y', '-loop', '1', '-i', imgPath];
    if (audioPath) args.push('-i', audioPath);
    args.push('-t', String(duration), '-vf', 'scale=1080:1080,' + drawtext, '-c:v', 'libx264', '-pix_fmt', 'yuv420p');
    if (audioPath) { args.push('-c:a', 'aac', '-shortest'); } else { args.push('-an'); }
    args.push(outPath);

    await new Promise((resolve, reject) => {
      execFile('ffmpeg', args, { maxBuffer: 1024 * 1024 * 50 }, (err, stdout, stderr) => {
        if (err) return reject(new Error(stderr || err.message));
        resolve();
      });
    });

    res.setHeader('Content-Type', 'video/mp4');
    const stream = fs.createReadStream(outPath);
    stream.pipe(res);
    stream.on('close', () => cleanup());
    stream.on('error', () => cleanup());
  } catch (err) {
    console.error(err);
    cleanup();
    res.status(500).json({ error: (err && err.message) || 'render failed' });
  }

  function cleanup() {
    [imgPath, audioPath, outPath].filter(Boolean).forEach((p) => fs.unlink(p, () => {}));
  }
});

function downloadFile(url, dest) {
  return fetch(url).then((r) => {
    if (!r.ok) throw new Error('Failed to download ' + url + ': ' + r.status);
    return new Promise((resolve, reject) => {
      const stream = fs.createWriteStream(dest);
      const reader = r.body.getReader();
      function pump() {
        reader.read().then(({ done, value }) => {
          if (done) { stream.end(); return resolve(); }
          stream.write(Buffer.from(value));
          pump();
        }).catch(reject);
      }
      pump();
    });
  });
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Render service listening on ' + PORT));
