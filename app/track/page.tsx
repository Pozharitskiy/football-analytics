"use client"

import { useEffect, useState } from "react"
import { ArrowLeft, Save, Edit, Trash2, UserPlus, Pencil } from "lucide-react"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createOrUpdateMatch, getMatchByYoutubeId, getMatchEvents, type Match, type MatchEvent } from "../firebase-service"
import { useToast } from "@/components/ui/use-toast"
import VideoPlayer from "../components/video-player"

type Player = {
  id: string
  name: string
  number: number
  team: "home" | "away"
}

type Event = MatchEvent & {
  playerName: string
  playerNumber: number
}

export default function TrackPage() {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [matchData, setMatchData] = useState<Match | null>(null)

  const [events, setEvents] = useState<Event[]>([])
  const [currentTime, setCurrentTime] = useState(0)
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null)
  const [selectedEventType, setSelectedEventType] = useState<string>("")
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [currentEditEvent, setCurrentEditEvent] = useState<Event | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [isAddPlayerDialogOpen, setIsAddPlayerDialogOpen] = useState(false)
  const [newPlayerData, setNewPlayerData] = useState({
    name: "",
    number: "",
    team: "home" as "home" | "away"
  })
  const [isEditPlayerDialogOpen, setIsEditPlayerDialogOpen] = useState(false)
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null)

  // Load match data and events
  useEffect(() => {
    const loadMatchData = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const youtubeId = urlParams.get('youtubeId');
      
      if (!youtubeId) {
        toast({
          title: "Error",
          description: "No YouTube ID provided",
          variant: "destructive"
        });
        return;
      }

      setIsLoading(true);

      try {
        // Get latest data from Firebase
        const match = await getMatchByYoutubeId(youtubeId);
        if (!match) {
          toast({
            title: "Error",
            description: "Match not found",
            variant: "destructive"
          });
          return;
        }

        setMatchData(match);

        if (match.id) {
          try {
            // Get events for the match
            const matchEvents = await getMatchEvents(match.id);
            const eventsWithPlayerInfo: Event[] = matchEvents.map(event => {
              const player = match.players.find(p => p.id === event.playerId);
              return {
                ...event,
                playerName: player?.name || "Unknown Player",
                playerNumber: player?.number || 0
              };
            });
            setEvents(eventsWithPlayerInfo);
          } catch (error) {
            console.error("Error loading match events:", error);
            toast({
              title: "Error",
              description: "Failed to load match events",
              variant: "destructive"
            });
          }
        }
      } catch (error) {
        console.error("Error loading match data:", error);
        toast({
          title: "Error",
          description: "Failed to load match data",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadMatchData();
  }, [toast]);

  // Save events to Firebase whenever they change
  useEffect(() => {
    if (!matchData || !events.length) return;

    const saveEvents = async () => {
      try {
        await createOrUpdateMatch(matchData, events);
      } catch (error) {
        console.error("Error saving events:", error);
        toast({
          title: "Error",
          description: "Failed to save events to Firebase",
          variant: "destructive"
        });
      }
    };

    const debounceTimer = setTimeout(saveEvents, 1000);
    return () => clearTimeout(debounceTimer);
  }, [events, matchData, toast]);

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
    if (!selectedPlayer || !selectedEventType || !matchData) return;

    try {
      const timeString = formatTimeForDisplay(currentTime)
      const newEvent: Event = {
        id: `event_${Date.now()}`,
        matchId: matchData.id || `temp_${matchData.youtubeId}`,
        timestamp: currentTime,
        timeString,
        playerId: selectedPlayer.id,
        playerName: selectedPlayer.name,
        playerNumber: selectedPlayer.number,
        eventType: selectedEventType,
      }

      setEvents((prevEvents) => [...prevEvents, newEvent])
      setSelectedEventType("")
    } catch (error) {
      console.error("Error tracking event:", error)
    }
  }

  const deleteEvent = (eventId: string) => {
    if (!eventId) return;
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
    if (!matchData) {
      toast({
        title: "Error",
        description: "Cannot save events: No match data available",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsSaving(true);
      const savedMatchId = await createOrUpdateMatch(matchData, events);
      
      // Update local match data with the saved ID
      setMatchData(prev => prev ? { ...prev, id: savedMatchId } : null);
      
      // Update events with the new match ID
      setEvents(prev => prev.map(event => ({
        ...event,
        matchId: savedMatchId
      })));
      
      setSaveSuccess(true);
      toast({
        title: "Success",
        description: "Events saved to Firebase successfully"
      });
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error("Error saving to Firebase:", error);
      toast({
        title: "Error",
        description: "Failed to save events to Firebase",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const addNewPlayer = async () => {
    if (!matchData || !newPlayerData.name || !newPlayerData.number) return;

    const newPlayer: Player = {
      id: `player_${Date.now()}`,
      name: newPlayerData.name,
      number: parseInt(newPlayerData.number),
      team: newPlayerData.team
    };

    const updatedMatchData = {
      ...matchData,
      players: [...matchData.players, newPlayer]
    };

    try {
      await createOrUpdateMatch(updatedMatchData, events);
      setMatchData(updatedMatchData);
      
      // Reset form
      setNewPlayerData({
        name: "",
        number: "",
        team: "home"
      });
      setIsAddPlayerDialogOpen(false);

      toast({
        title: "Success",
        description: "Player added successfully"
      });
    } catch (error) {
      console.error("Error adding player:", error);
      toast({
        title: "Error",
        description: "Failed to add player",
        variant: "destructive"
      });
    }
  };

  const openEditPlayerDialog = (player: Player) => {
    setEditingPlayer(player)
    setIsEditPlayerDialogOpen(true)
  }

  const deletePlayer = async (playerId: string) => {
    if (!matchData) return;

    // Check if player has associated events
    const hasEvents = events.some(event => event.playerId === playerId);
    if (hasEvents) {
      if (!confirm("This player has associated events. Deleting them will also delete their events. Continue?")) {
        return;
      }
      // Remove events for this player
      const updatedEvents = events.filter(event => event.playerId !== playerId);
      setEvents(updatedEvents);
    }

    const updatedMatchData = {
      ...matchData,
      players: matchData.players.filter(p => p.id !== playerId)
    };

    try {
      await createOrUpdateMatch(updatedMatchData, events);
      setMatchData(updatedMatchData);
      
      // If the deleted player was selected, deselect them
      if (selectedPlayer?.id === playerId) {
        setSelectedPlayer(null);
      }

      toast({
        title: "Success",
        description: "Player deleted successfully"
      });
    } catch (error) {
      console.error("Error deleting player:", error);
      toast({
        title: "Error",
        description: "Failed to delete player",
        variant: "destructive"
      });
    }
  };

  const saveEditedPlayer = async () => {
    if (!matchData || !editingPlayer) return;

    const updatedPlayers = matchData.players.map(player =>
      player.id === editingPlayer.id ? editingPlayer : player
    );

    const updatedMatchData = {
      ...matchData,
      players: updatedPlayers
    };

    // Update events with new player info
    const updatedEvents = events.map(event => {
      if (event.playerId === editingPlayer.id) {
        return {
          ...event,
          playerName: editingPlayer.name,
          playerNumber: editingPlayer.number
        };
      }
      return event;
    });

    try {
      await createOrUpdateMatch(updatedMatchData, updatedEvents);
      setMatchData(updatedMatchData);
      setEvents(updatedEvents);
      
      // Update selected player if it was the edited one
      if (selectedPlayer?.id === editingPlayer.id) {
        setSelectedPlayer(editingPlayer);
      }

      setIsEditPlayerDialogOpen(false);
      setEditingPlayer(null);

      toast({
        title: "Success",
        description: "Player updated successfully"
      });
    } catch (error) {
      console.error("Error updating player:", error);
      toast({
        title: "Error",
        description: "Failed to update player",
        variant: "destructive"
      });
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
        <div className="container flex items-center justify-between">
          <div className="flex items-center">
            <Button variant="outline" size="icon" asChild>
              <Link href="/">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <h1 className="text-2xl font-bold ml-4">Football Match Tracker</h1>
          </div>
          <Button onClick={() => setIsAddPlayerDialogOpen(true)} variant="outline">
            <UserPlus className="h-4 w-4 mr-2" />
            Add Player
          </Button>
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
                        <Button variant="outline" size="icon" onClick={() => event.id && deleteEvent(event.id)}>
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
                  className={`relative border rounded-md p-2 text-center cursor-pointer transition-colors ${
                    selectedPlayer?.id === player.id ? "bg-primary text-primary-foreground" : "hover:bg-accent"
                  }`}
                  onClick={() => setSelectedPlayer(player)}
                >
                  <div className="absolute top-1 right-1 flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={(e) => {
                        e.stopPropagation();
                        openEditPlayerDialog(player);
                      }}
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={(e) => {
                        e.stopPropagation();
                        deletePlayer(player.id);
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
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
                  className={`relative border rounded-md p-2 text-center cursor-pointer transition-colors ${
                    selectedPlayer?.id === player.id ? "bg-primary text-primary-foreground" : "hover:bg-accent"
                  }`}
                  onClick={() => setSelectedPlayer(player)}
                >
                  <div className="absolute top-1 right-1 flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={(e) => {
                        e.stopPropagation();
                        openEditPlayerDialog(player);
                      }}
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={(e) => {
                        e.stopPropagation();
                        deletePlayer(player.id);
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
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

      {/* Add Player Dialog */}
      <Dialog open={isAddPlayerDialogOpen} onOpenChange={setIsAddPlayerDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Player</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="player-name">Player Name</Label>
              <Input
                id="player-name"
                value={newPlayerData.name}
                onChange={(e) => setNewPlayerData({ ...newPlayerData, name: e.target.value })}
                placeholder="Enter player name"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="player-number">Jersey Number</Label>
              <Input
                id="player-number"
                type="number"
                value={newPlayerData.number}
                onChange={(e) => setNewPlayerData({ ...newPlayerData, number: e.target.value })}
                placeholder="Enter jersey number"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="player-team">Team</Label>
              <Select
                value={newPlayerData.team}
                onValueChange={(value: "home" | "away") => setNewPlayerData({ ...newPlayerData, team: value })}
              >
                <SelectTrigger id="player-team">
                  <SelectValue placeholder="Select team" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="home">{homeTeamName}</SelectItem>
                  <SelectItem value="away">{awayTeamName}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddPlayerDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={addNewPlayer}>Add Player</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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

      {/* Edit Player Dialog */}
      <Dialog open={isEditPlayerDialogOpen} onOpenChange={setIsEditPlayerDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Player</DialogTitle>
          </DialogHeader>

          {editingPlayer && (
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-player-name">Player Name</Label>
                <Input
                  id="edit-player-name"
                  value={editingPlayer.name}
                  onChange={(e) => setEditingPlayer({ ...editingPlayer, name: e.target.value })}
                  placeholder="Enter player name"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="edit-player-number">Jersey Number</Label>
                <Input
                  id="edit-player-number"
                  type="number"
                  value={editingPlayer.number}
                  onChange={(e) => setEditingPlayer({ ...editingPlayer, number: parseInt(e.target.value) })}
                  placeholder="Enter jersey number"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="edit-player-team">Team</Label>
                <Select
                  value={editingPlayer.team}
                  onValueChange={(value: "home" | "away") => setEditingPlayer({ ...editingPlayer, team: value })}
                >
                  <SelectTrigger id="edit-player-team">
                    <SelectValue placeholder="Select team" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="home">{homeTeamName}</SelectItem>
                    <SelectItem value="away">{awayTeamName}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditPlayerDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveEditedPlayer}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

