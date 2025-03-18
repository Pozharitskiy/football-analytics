"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { PlusCircle, Trash2, ArrowRight, Youtube } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

type Player = {
  id: string
  name: string
  number: number
  team: "home" | "away"
}

export default function SetupPage() {
  const router = useRouter()
  const [youtubeId, setYoutubeId] = useState("")
  const [homeTeamName, setHomeTeamName] = useState("")
  const [awayTeamName, setAwayTeamName] = useState("")
  const [players, setPlayers] = useState<Player[]>([])
  const [newPlayerName, setNewPlayerName] = useState("")
  const [newPlayerNumber, setNewPlayerNumber] = useState("")
  const [activeTeam, setActiveTeam] = useState<"home" | "away">("home")

  const addPlayer = () => {
    if (!newPlayerName || !newPlayerNumber) return

    const newPlayer: Player = {
      id: `player_${Date.now()}`,
      name: newPlayerName,
      number: Number.parseInt(newPlayerNumber),
      team: activeTeam,
    }

    setPlayers([...players, newPlayer])
    setNewPlayerName("")
    setNewPlayerNumber("")
  }

  const removePlayer = (playerId: string) => {
    setPlayers(players.filter((player) => player.id !== playerId))
  }

  const startTracking = () => {
    if (!youtubeId || !homeTeamName || !awayTeamName || players.length < 2) {
      alert("Please fill in all required fields and add at least one player per team")
      return
    }

    // In a real app, you would save this data to Firebase/state management
    // and then navigate to the tracking page
    const matchData = {
      youtubeId,
      homeTeamName,
      awayTeamName,
      players,
    }

    // For demo purposes, we'll store in localStorage
    localStorage.setItem("matchSetup", JSON.stringify(matchData))

    // Navigate to the tracking page
    router.push("/track")
  }

  const homePlayers = players.filter((p) => p.team === "home")
  const awayPlayers = players.filter((p) => p.team === "away")

  return (
    <div className="container mx-auto py-10 px-4">
      <h1 className="text-3xl font-bold text-center mb-8">Football Match Analytics Setup</h1>

      <div className="grid gap-8 max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Match Video</CardTitle>
            <CardDescription>Enter the YouTube video ID of the football match you want to analyze</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              <div className="flex items-center gap-2">
                <Youtube className="h-5 w-5 text-red-500" />
                <Label htmlFor="youtube-id">YouTube Video ID</Label>
              </div>
              <Input
                id="youtube-id"
                placeholder="e.g. dQw4w9WgXcQ"
                value={youtubeId}
                onChange={(e) => setYoutubeId(e.target.value)}
              />
              <p className="text-sm text-muted-foreground">
                The ID is the part after "v=" in a YouTube URL (https://www.youtube.com/watch?v=
                <strong>dQw4w9WgXcQ</strong>)
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Team Setup</CardTitle>
            <CardDescription>Enter the names of both teams</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6">
              <div className="grid gap-2">
                <Label htmlFor="home-team">Home Team</Label>
                <Input
                  id="home-team"
                  placeholder="Home Team Name"
                  value={homeTeamName}
                  onChange={(e) => setHomeTeamName(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="away-team">Away Team</Label>
                <Input
                  id="away-team"
                  placeholder="Away Team Name"
                  value={awayTeamName}
                  onChange={(e) => setAwayTeamName(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Player Setup</CardTitle>
            <CardDescription>Add players for both teams with their jersey numbers</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTeam} onValueChange={(value) => setActiveTeam(value as "home" | "away")}>
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="home">{homeTeamName || "Home Team"}</TabsTrigger>
                <TabsTrigger value="away">{awayTeamName || "Away Team"}</TabsTrigger>
              </TabsList>

              <TabsContent value="home" className="space-y-4">
                <div className="flex items-end gap-2">
                  <div className="grid gap-2 flex-1">
                    <Label htmlFor="player-name-home">Player Name</Label>
                    <Input
                      id="player-name-home"
                      placeholder="Name"
                      value={activeTeam === "home" ? newPlayerName : ""}
                      onChange={(e) => setNewPlayerName(e.target.value)}
                    />
                  </div>
                  <div className="grid gap-2 w-24">
                    <Label htmlFor="player-number-home">Number</Label>
                    <Input
                      id="player-number-home"
                      placeholder="#"
                      type="number"
                      value={activeTeam === "home" ? newPlayerNumber : ""}
                      onChange={(e) => setNewPlayerNumber(e.target.value)}
                    />
                  </div>
                  <Button onClick={addPlayer} className="mb-0.5" size="icon">
                    <PlusCircle className="h-4 w-4" />
                  </Button>
                </div>

                {homePlayers.length > 0 ? (
                  <div className="border rounded-md">
                    <div className="grid grid-cols-[1fr_auto_auto] gap-2 p-3 font-medium text-sm">
                      <div>Name</div>
                      <div>Number</div>
                      <div></div>
                    </div>
                    {homePlayers.map((player) => (
                      <div key={player.id} className="grid grid-cols-[1fr_auto_auto] gap-2 p-3 border-t items-center">
                        <div>{player.name}</div>
                        <div className="font-mono">{player.number}</div>
                        <Button variant="ghost" size="icon" onClick={() => removePlayer(player.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">No players added yet</div>
                )}
              </TabsContent>

              <TabsContent value="away" className="space-y-4">
                <div className="flex items-end gap-2">
                  <div className="grid gap-2 flex-1">
                    <Label htmlFor="player-name-away">Player Name</Label>
                    <Input
                      id="player-name-away"
                      placeholder="Name"
                      value={activeTeam === "away" ? newPlayerName : ""}
                      onChange={(e) => setNewPlayerName(e.target.value)}
                    />
                  </div>
                  <div className="grid gap-2 w-24">
                    <Label htmlFor="player-number-away">Number</Label>
                    <Input
                      id="player-number-away"
                      placeholder="#"
                      type="number"
                      value={activeTeam === "away" ? newPlayerNumber : ""}
                      onChange={(e) => setNewPlayerNumber(e.target.value)}
                    />
                  </div>
                  <Button onClick={addPlayer} className="mb-0.5" size="icon">
                    <PlusCircle className="h-4 w-4" />
                  </Button>
                </div>

                {awayPlayers.length > 0 ? (
                  <div className="border rounded-md">
                    <div className="grid grid-cols-[1fr_auto_auto] gap-2 p-3 font-medium text-sm">
                      <div>Name</div>
                      <div>Number</div>
                      <div></div>
                    </div>
                    {awayPlayers.map((player) => (
                      <div key={player.id} className="grid grid-cols-[1fr_auto_auto] gap-2 p-3 border-t items-center">
                        <div>{player.name}</div>
                        <div className="font-mono">{player.number}</div>
                        <Button variant="ghost" size="icon" onClick={() => removePlayer(player.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">No players added yet</div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
          <CardFooter>
            <Button
              className="w-full"
              size="lg"
              onClick={startTracking}
              disabled={!youtubeId || !homeTeamName || !awayTeamName || players.length < 2}
            >
              Start Tracking <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}

