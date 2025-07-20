graph TD
    A[Player Enters Game] --> B{Main Menu};
    B -->|Clicks 'Create Room'| C[Creates a New Room];
    B -->|Clicks 'Join Room'| D[Joins an Existing Room];
    
    subgraph RoomLobby [Room Lobby]
        direction LR
        C --> E{Waiting for Players...};
        D --> E;
        E -->|Minimum 2 players join| F[Host Clicks 'Start Game'];
    end

    F --> G(Game Arena - Round 1);
    G --> H[Round Ends];
    H --> I[Upgrade Screen];
    I -->|All players ready| J(Game Arena - Round 2);
    J --> K[...];
    K --> L[Final End Screen];
    L -->|Clicks 'Back to Lobby'| E;
    L -->|Clicks 'Exit to Main Menu'| B;

    subgraph GameBrowser [Joining a Game]
        direction TB
        M[New Player Enters] --> N{Main Menu};
        N -->|Sees list of rooms| O{Room List};
        O -->|Room 1 (Waiting)| P[Join];
        O -->|Room 2 (In Progress)| Q[Spectate or Wait];
        P --> D;
    end


Step-by-Step Breakdown of the New Flow
Main Menu:

A new player opens the game and is presented with a Main Menu.

They see a list of existing rooms with their status ('Waiting' or 'In Progress') and player count (e.g., "Room 1 - 2/8 players - Waiting").

They have two primary options: "Create Room" or "Join Room".

Creating a Room:

The player clicks "Create Room".

The server creates a new room, and the player is taken to that room's private Lobby. They are now the host.

Joining a Room:

The player sees a room in the list that is 'Waiting' and has space.

They click "Join", and are taken into that room's Lobby with the other players who are already there.

The Room Lobby:

Inside the lobby, players can see who else is in the same room.

The "Start Game" button is visible but disabled.

Once at least two players are in the room, the button becomes enabled only for the host.

The host clicks "Start Game" to begin the match for everyone in that specific room.

Gameplay and Post-Game:

The game proceeds through its rounds and upgrade screens as we previously designed.

After the final round, players are shown the end-game summary.

From here, they have two options:

"Back to Lobby": Returns them to their room's lobby to play again with the same group.

"Exit to Main Menu": Takes them out of the room and back to the main menu to join or create a different game.

Handling In-Progress Games:

If a new player arrives at the Main Menu and sees a room is 'In Progress', the "Join" button would be disabled.

Instead, it could show a "Spectate" button, allowing them to watch the ongoing game without participating. This provides a much better user experience than being locked out with no information.

This room-based system provides the structure needed for a scalable and much more enjoyable multiplayer experience. It gives players control over who they play with and ensures that games start under the right conditions.