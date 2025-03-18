"use client"

import { useEffect, useState } from "react"
import { ArrowLeft, Save, Edit, Trash2 } from "lucide-react"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createOrUpdateMatch } from "../firebase-service"
import VideoPlayer from "../components/video-player"

type Player = {
  id: string
  name: string
  number: number
  team: "home" | "away"
}

type Event = {
  id: string
  timestamp: number
  timeString: string
  playerId: string
  playerName: string
  playerNumber: number
  eventType: string
}

export default function TrackPage() {
  const [matchData, setMatchData] = useState<{
    youtubeId: string
    homeTeamName: string
    awayTeamName: string
    players: Player[]
  } | null>(null)

  const [events, setEvents] = useState<Event[]>([])
  const [currentTime, setCurrentTime] = useState(0)
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null)
  const [selectedEventType, setSelectedEventType] = useState<string>("")
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [currentEditEvent, setCurrentEditEvent] = useState<Event | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

  // Load match data and events from localStorage
  useEffect(() => {
    const savedMatchData = localStorage.getItem("matchSetup")
    if (savedMatchData) {
      setMatchData(JSON.parse(savedMatchData))
    }

    const savedEvents = localStorage.getItem("matchEvents")
    if (savedEvents) {
      setEvents(JSON.parse(savedEvents))
    }
  }, [])

  // Save events to localStorage whenever they change
  useEffect(() => {
    if (events.length > 0) {
      localStorage.setItem("matchEvents", JSON.stringify(events))
    }
  }, [events])

  const handleVideoPause = (time: number) => {
    console.log("Video paused at:", time)
    setCurrentTime(time)
  }

  const handleTimeUpdate = (time: number) => {
    setCurrentTime(time)
  }

  const formatTimeForDisplay = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  const parseTimeString = (timeString: string): number => {
    const [minutes, seconds] = timeString.split(":").map(Number)
    return minutes * 60 + seconds
  }

  const trackEvent = () => {
    if (!selectedPlayer || !selectedEventType) return

    try {
      const timeString = formatTimeForDisplay(currentTime)
      const newEvent: Event = {
        id: `event_${Date.now()}`,
        timestamp: currentTime,
        timeString,
        playerId: selectedPlayer.id,
        playerName: selectedPlayer.name,
        playerNumber: selectedPlayer.number,
        eventType: selectedEventType,
      }

      // Add event to state (which will trigger the useEffect to save to localStorage)
      setEvents((prevEvents) => [...prevEvents, newEvent])

      // Keep the selected player but reset the event type for quick consecutive logging
      setSelectedEventType("")
    } catch (error) {
      console.error("Error tracking event:", error)
    }
  }

  const deleteEvent = (eventId: string) => {
    setEvents(events.filter((event) => event.id !== eventId))
  }

  const openEditDialog = (event: Event) => {
    setCurrentEditEvent(event)
    setIsEditDialogOpen(true)
  }

  const saveEditedEvent = () => {
    if (!currentEditEvent) return

    setEvents((prevEvents) => prevEvents.map((event) => (event.id === currentEditEvent.id ? currentEditEvent : event)))

    setIsEditDialogOpen(false)
    setCurrentEditEvent(null)
  }

  const submitEventsToFirebase = async () => {
    if (events.length === 0 || !matchData) return;

    try {
      setIsSaving(true);

      // Create a temporary ID for new matches
      const tempMatchId = `temp_${matchData.youtubeId}`;

      // Prepare events for Firebase
      const firebaseEvents = events.map((event) => ({
        matchId: tempMatchId,
        timestamp: event.timestamp,
        timeString: event.timeString,
        playerId: event.playerId,
        eventType: event.eventType,
        additionalData: {
          playerName: event.playerName,
          playerNumber: event.playerNumber,
        },
      }));

      // Create or update match with events
      await createOrUpdateMatch({
        youtubeId: matchData.youtubeId,
        homeTeamName: matchData.homeTeamName,
        awayTeamName: matchData.awayTeamName,
        date: new Date(),
        players: matchData.players
      }, firebaseEvents);

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error("Error saving to Firebase:", error);
      alert("Failed to save match data to Firebase. See console for details.");
    } finally {
      setIsSaving(false);
    }
  };

  if (!matchData) {
    return (
      <div className="container mx-auto py-10 px-4 text-center">
        <h1 className="text-3xl font-bold mb-4">No match data found</h1>
        <p className="mb-6">Please set up a match first</p>
        <Button asChild>
          <Link href="/">Go to Setup</Link>
        </Button>
      </div>
    )
  }

  const { homeTeamName, awayTeamName, players } = matchData
  const homePlayers = players.filter((p) => p.team === "home")
  const awayPlayers = players.filter((p) => p.team === "away")

  const eventTypes = [
    "Pass",
    "Bad pass",
    "Receiving",
    "Bad receiving",
    "Shot on target",
    "Shot off target",
    "Dribble",
    "Goal",
    "Assist",
    "Defense",
  ]

  return (
    <div className="w-full px-4 mx-auto grid gap-4 md:gap-6 pb-10">
      <header className="py-4">
        <div className="container flex items-center">
          <Button variant="outline" size="icon" asChild>
            <Link href="/">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-2xl font-bold ml-4">Football Match Tracker</h1>
        </div>
      </header>

      <main className="container grid md:grid-cols-6 gap-10 items-start">
        <div className="col-span-4 grid gap-4">
          <div className="grid gap-2">
            {matchData.youtubeId && (
              <VideoPlayer
                videoId={matchData.youtubeId}
                players={players}
                onPause={handleVideoPause}
                onTimeUpdate={handleTimeUpdate}
              />
            )}
            <div className="flex justify-between items-center">
              <div className="text-sm text-muted-foreground">Current time: {formatTimeForDisplay(currentTime)}</div>
              <div className="flex items-center gap-2">
                {selectedPlayer && (
                  <div className="text-sm font-medium">
                    Selected: {selectedPlayer.name} ({selectedPlayer.number})
                  </div>
                )}
                <Select value={selectedEventType} onValueChange={setSelectedEventType}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Select event" />
                  </SelectTrigger>
                  <SelectContent>
                    {eventTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button onClick={trackEvent} disabled={!selectedPlayer || !selectedEventType}>
                  Track Event
                </Button>
              </div>
            </div>
          </div>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Tracked Events</CardTitle>
              <Button onClick={submitEventsToFirebase} disabled={events.length === 0 || isSaving} className="ml-auto">
                <Save className="mr-2 h-4 w-4" />
                {isSaving ? "Saving..." : "Send to Firebase"}
              </Button>
            </CardHeader>
            <CardContent>
              {saveSuccess && (
                <div className="mb-4 p-2 bg-green-100 text-green-800 rounded-md">
                  Events successfully saved to Firebase!
                </div>
              )}

              {events.length > 0 ? (
                <div className="space-y-2">
                  {events.map((event) => (
                    <div key={event.id} className="flex items-center gap-4 p-3 border rounded-md">
                      <div className="w-24 font-mono">{event.timeString}</div>
                      <div className="flex-1">
                        {event.playerName} ({event.playerNumber}) - {event.eventType}
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="icon" onClick={() => openEditDialog(event)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="icon" onClick={() => deleteEvent(event.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">No events tracked yet</div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="col-span-2 grid gap-6">
          <div>
            <h2 className="text-xl font-bold mb-4">{homeTeamName}</h2>
            <div className="grid grid-cols-3 gap-2">
              {homePlayers.map((player) => (
                <div
                  key={player.id}
                  className={`border rounded-md p-2 text-center cursor-pointer transition-colors ${
                    selectedPlayer?.id === player.id ? "bg-primary text-primary-foreground" : "hover:bg-accent"
                  }`}
                  onClick={() => setSelectedPlayer(player)}
                >
                  <div className="text-lg font-bold">{player.number}</div>
                  <div className="text-sm truncate">{player.name}</div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-xl font-bold mb-4">{awayTeamName}</h2>
            <div className="grid grid-cols-3 gap-2">
              {awayPlayers.map((player) => (
                <div
                  key={player.id}
                  className={`border rounded-md p-2 text-center cursor-pointer transition-colors ${
                    selectedPlayer?.id === player.id ? "bg-primary text-primary-foreground" : "hover:bg-accent"
                  }`}
                  onClick={() => setSelectedPlayer(player)}
                >
                  <div className="text-lg font-bold">{player.number}</div>
                  <div className="text-sm truncate">{player.name}</div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-lg font-bold mb-2">Event Types</h2>
            <div className="grid grid-cols-2 gap-2">
              {eventTypes.map((eventType) => (
                <Button
                  key={eventType}
                  variant={selectedEventType === eventType ? "default" : "outline"}
                  className="justify-start"
                  onClick={() => setSelectedEventType(eventType)}
                >
                  {eventType}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </main>

      {/* Edit Event Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Event</DialogTitle>
          </DialogHeader>

          {currentEditEvent && (
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="event-time">Time (MM:SS)</Label>
                <Input
                  id="event-time"
                  type="text"
                  pattern="[0-9]{1,2}:[0-9]{2}"
                  placeholder="00:00"
                  value={currentEditEvent.timeString}
                  onChange={(e) => {
                    const newTimeString = e.target.value
                    // Only update if it matches the MM:SS format
                    if (/^[0-9]{1,2}:[0-9]{2}$/.test(newTimeString)) {
                      const newTimestamp = parseTimeString(newTimeString)
                      setCurrentEditEvent({
                        ...currentEditEvent,
                        timestamp: newTimestamp,
                        timeString: newTimeString,
                      })
                    } else if (newTimeString.length <= 5) {
                      // Allow partial input while typing
                      setCurrentEditEvent({
                        ...currentEditEvent,
                        timeString: newTimeString,
                      })
                    }
                  }}
                />
                <p className="text-sm text-muted-foreground">Format: MM:SS (e.g., 12:34)</p>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="event-player">Player</Label>
                <Select
                  value={currentEditEvent.playerId}
                  onValueChange={(value) => {
                    const player = players.find((p) => p.id === value)
                    if (player) {
                      setCurrentEditEvent({
                        ...currentEditEvent,
                        playerId: player.id,
                        playerName: player.name,
                        playerNumber: player.number,
                      })
                    }
                  }}
                >
                  <SelectTrigger id="event-player">
                    <SelectValue placeholder="Select player" />
                  </SelectTrigger>
                  <SelectContent>
                    {players.map((player) => (
                      <SelectItem key={player.id} value={player.id}>
                        {player.name} ({player.number}) - {player.team === "home" ? homeTeamName : awayTeamName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="event-type">Event Type</Label>
                <Select
                  value={currentEditEvent.eventType}
                  onValueChange={(value) =>
                    setCurrentEditEvent({
                      ...currentEditEvent,
                      eventType: value,
                    })
                  }
                >
                  <SelectTrigger id="event-type">
                    <SelectValue placeholder="Select event type" />
                  </SelectTrigger>
                  <SelectContent>
                    {eventTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveEditedEvent}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

