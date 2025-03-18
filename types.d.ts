interface Window {
  YT: {
    Player: new (
      elementId: string,
      options: {
        height: string | number
        width: string | number
        videoId: string
        playerVars?: {
          [key: string]: any
        }
        events?: {
          onReady?: (event: any) => void
          onStateChange?: (event: any) => void
          onError?: (event: any) => void
        }
      },
    ) => YT.Player
    PlayerState: {
      UNSTARTED: number
      ENDED: number
      PLAYING: number
      PAUSED: number
      BUFFERING: number
      CUED: number
    }
  }
  onYouTubeIframeAPIReady: (() => void) | null
}

declare namespace YT {
  interface Player {
    playVideo(): void
    pauseVideo(): void
    stopVideo(): void
    seekTo(seconds: number, allowSeekAhead?: boolean): void
    getPlayerState(): number
    getCurrentTime(): number
    getDuration(): number
    getVideoUrl(): string
    getVideoData(): { video_id: string }
    destroy(): void
  }

  interface OnStateChangeEvent {
    data: number
    target: Player
  }
}

