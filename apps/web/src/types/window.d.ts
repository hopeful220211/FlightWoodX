interface CaptureScreenshotsResult {
  main: string
  top: string
  side: string
}

interface Window {
  captureScreenshots?: () => CaptureScreenshotsResult
}
