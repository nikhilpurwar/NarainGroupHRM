Face Recognition Mobile Integration

Quick notes for developers:

- Dependencies:
  - expo-video-thumbnails (used to extract frames from short videos)
  - expo-face-detector (optional on-device face prefilter to reduce uploads)

- Enroll flow:
  1. User records a short 3–5s video using the Record button in `FaceEnrollmentScreen1.js`.
  2. The app extracts up to ~100 frames using `expo-video-thumbnails` and filters frames using `expo-face-detector` (eyes-open threshold default: 0.3).
  3. Frames are uploaded to the backend `/employees/enroll-face` with optional fields: `selectTop`, `weights`, `preview`, `previewImages`.
  4. Server responds with `selectedIndices`, `selectedScores`, and optional `selectedPreviews` when `previewImages=true`.

- Recognition feedback:
  - On a positive match, user sees "Did I recognize you?" If user confirms, the app sends the captured image to `/employees/confirm-recognition` to update the stored template via EMA.

- Notes:
  - Tune on-device prefilter thresholds and server scoring weights for best results in your deployment.
