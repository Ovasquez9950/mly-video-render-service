# mly-video-render-service

Small FFmpeg render microservice for Mandy's Laundry. Takes a static image + optional music track, burns in a CTA text overlay, and outputs a 10-second MP4.

## Endpoints
- `GET /health` - health check
- `POST /render` - body: `{ imageUrl, audioUrl?, ctaText?, durationSeconds?, apiKey }` -> streams back an `mp4`

## Deploy
Deployed on Railway from this repo. Set env var `RENDER_API_KEY` and pass the same value as `apiKey` in requests.
