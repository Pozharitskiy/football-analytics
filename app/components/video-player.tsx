"use client"

import React from "react"
import YouTube, { type YouTubeProps } from "react-youtube"

type Player = {
  id: string
  name: string
  number: number
  team: "home" | "away"
}

interface VideoPlayerProps {
  videoId: string
  players: Player[]
  onPause: (currentTime: number) => void
  onTimeUpdate: (currentTime: number) => void
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({ videoId, players, onPause, onTimeUpdate }) => {
  const playerRef = React.useRef<any>(null)

  const onPlayerReady: YouTubeProps["onReady"] = (event) => {
    console.log("Player is ready")
    playerRef.current = event.target

    // Start time update interval
    const interval = setInterval(() => {
      if (playerRef.current) {
        try {
          const currentTime = playerRef.current.getCurrentTime()
          onTimeUpdate(currentTime)
        } catch (error) {
          console.error("Error getting current time:", error)
        }
      }
    }, 100)

    // Clean up interval on component unmount
    return () => clearInterval(interval)
  }

  const onPlayerPause: YouTubeProps["onPause"] = async (event) => {
    const currentTime = await event.target.getCurrentTime()
    onPause(currentTime) // Update current time in parent component
  }

  const opts: YouTubeProps["opts"] = {
    height: "390",
    width: "100%",
    playerVars: {
      autoplay: 0,
      modestbranding: 1,
      rel: 0,
    },
  }

  return (
    <div className="video-container rounded-xl overflow-hidden aspect-video bg-muted">
      <YouTube videoId={videoId} opts={opts} onReady={onPlayerReady} onPause={onPlayerPause} className="w-full" />
    </div>
  )
}

export default VideoPlayer

