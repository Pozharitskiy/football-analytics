// This is a placeholder for the Firebase service
// In a real application, you would implement the actual Firebase integration here

import { initializeApp } from "firebase/app"
import { getFirestore, collection, addDoc, getDocs, query, where, writeBatch, doc, updateDoc, getDoc } from "firebase/firestore"

// Your Firebase configuration
const firebaseConfig = {
  // Replace with your actual Firebase config
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
}

// Initialize Firebase
const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

// Match types
export type Player = {
  id: string
  name: string
  number: number
  team: "home" | "away"
}

export type Match = {
  id?: string
  youtubeId: string
  homeTeamName: string
  awayTeamName: string
  date: Date
  players: Player[]
}

export type MatchEvent = {
  id?: string
  matchId: string
  timestamp: number
  timeString: string
  playerId: string
  eventType: string
  additionalData?: any
}

// Firebase service functions
export const getMatchByYoutubeId = async (youtubeId: string): Promise<Match | null> => {
  try {
    const matchesRef = collection(db, "matches");
    const q = query(matchesRef, where("youtubeId", "==", youtubeId));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      return null;
    }

    const matchDoc = querySnapshot.docs[0];
    const data = matchDoc.data();
    const { events, ...matchData } = data;
    
    return {
      id: matchDoc.id,
      ...matchData,
      date: data.date.toDate(),
    } as Match;
  } catch (error) {
    console.error("Error getting match:", error);
    throw error;
  }
};

export const createOrUpdateMatch = async (match: Match, events: MatchEvent[] = []): Promise<string> => {
  try {
    const matchesRef = collection(db, "matches");
    const q = query(matchesRef, where("youtubeId", "==", match.youtubeId));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      // Match exists, update it
      const matchDoc = querySnapshot.docs[0];
      const matchRef = doc(db, "matches", matchDoc.id);
      
      await updateDoc(matchRef, {
        ...match,
        updatedAt: new Date(),
        events: events.length > 0 ? events.map(event => ({
          ...event,
          matchId: matchDoc.id,
          updatedAt: new Date()
        })) : matchDoc.data().events || []
      });
      
      return matchDoc.id;
    }

    // Create new match if it doesn't exist
    const docRef = await addDoc(matchesRef, {
      ...match,
      createdAt: new Date(),
      updatedAt: new Date(),
      events: events.map(event => ({
        ...event,
        matchId: match.id,
        createdAt: new Date()
      }))
    });

    // Update events with the new match ID if they don't have one
    if (events.length > 0) {
      await updateDoc(docRef, {
        events: events.map(event => ({
          ...event,
          matchId: docRef.id,
          createdAt: new Date()
        }))
      });
    }

    return docRef.id;
  } catch (error) {
    console.error("Error creating/updating match:", error);
    throw error;
  }
};

export const getMatchEvents = async (matchId: string): Promise<MatchEvent[]> => {
  try {
    const matchDoc = await getDoc(doc(db, "matches", matchId));
    if (!matchDoc.exists()) {
      throw new Error("Match not found");
    }
    const matchData = matchDoc.data();
    return (matchData.events || []).map((event: any) => ({
      ...event,
      matchId: matchDoc.id
    }));
  } catch (error) {
    console.error("Error getting match events:", error);
    throw error;
  }
};

export const getMatches = async (): Promise<Match[]> => {
  try {
    const querySnapshot = await getDocs(collection(db, "matches"));

    return querySnapshot.docs.map((doc) => {
      const data = doc.data();
      // Remove events from the returned match data to keep it lightweight
      const { events, ...matchData } = data;
      return {
        id: doc.id,
        ...matchData,
        date: data.date.toDate(),
      } as Match;
    });
  } catch (error) {
    console.error("Error getting matches:", error);
    throw error;
  }
};

