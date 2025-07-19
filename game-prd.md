Overview
Orb Odyssey is a browser-based real-time multiplayer game where players control glowing orbs in a cosmic nebula, collecting crystals to level up and win rounds. Built with Phaser 3 (client rendering/physics) and Node.js/Socket.io (server sync). Focus: Low-latency multiplayer (2-8 players), progression (levels/abilities), engagement (storyline/chaos). Current: MVP with perf optimizations; expand to multi-round with upgrades.

Technical Architecture
Frontend (Client): Phaser 3 for canvas rendering, arcade physics (momentum orbs/collisions), input (keyboard/mouse/touch), scenes (Preloader/Lobby/GameArena/EndScreen). Utils: ObjectPool (particles reuse), AudioManager (music/sfx), PerformanceMonitor (FPS/memory/ping overlay, adaptive modes: high/medium/low).
Backend (Server): Node.js/Express/Socket.io for rooms, state sync (players/crystals), broadcasts (deltas for low bandwidth). In-memory state (players as {id, pos, level, ...}); no DB yet (add Supabase later for scores).
Data Flow: Client predicts moves (zero-lag), server validates/reconciles (50ms), broadcasts changes. Prediction/interpolation for smooth remotes.
Deployment: Local (node server.js), public (Render/Vercel for free; ngrok for temp). Prod: HTTPS, rate-limiting, env vars (.env for secrets).
Perf Optimizations: Pooling (particles/text), throttling (30-60 FPS adaptive), culling (off-screen hide), monitoring (F1 toggle; auto-mode switch on FPS<30). Stress testing (F4-F5 hotkeys simulate bots/particles).
Debugging: Logs (server.log), health endpoint (/health), try-catch globals, null checks. Fixes: Position validation, reconnection (5 attempts).
Game Mechanics
Core loop: Explore/collect/compete in 5-10 min rounds (best-of-5 series). Win series by most round victories.

Movement: Momentum physics (200px/s base; drag friction). Keyboard/WASD, mouse/touch drag. Mobile: Virtual joystick fallback.
Collection/Progression: Overlap crystals (20-30 spawns, respawn 5-15s). Thresholds: Lvl1 (0-19: small/base), Lvl2 (20: +size/speed), Lvl3 (50: Burst unlock), Lvl4 (80: Wall unlock, Core access). Win round: 100 crystals (test: 10) or Core control 30s. Rare power crystals (+5 extra).
Abilities (energy: 100 regen; higher lvls +10% efficiency):
Burst (Lvl3, 30 energy, 10s CD): Radial push (200px, drop enemy crystals).
Wall (Lvl4, 50 energy, 15s CD): Temp barrier (100px, 5s, destructible).
Interactions: Collisions (bounce; larger steals 5 crystals). Emotes (floating text). Disconnections: Freeze 10s then fade.
Rounds/Series: Best-of-5. Inter-round: Winner chooses upgrade (speed +20%, agility (turn rate +15%), size (+10% collision adv), CD reduction -10%). Loser gets random. OODA-inspired bots (if solo): Observe (scan crystals/enemies), Orient (prioritize threats), Decide (ability/move), Act (execute).
Win/Engage: Round end: Scores/leaderboard, story pop-ups ("Star rebirths!"). Series: Badges/totals. Events: Crystal storms (double spawns 30s).
Visuals/Audio
Theme: Cosmic (nebula bg scrolling, glowing orbs/crystals, particles: trails/explosions).
Audio: Ambient space music, sfx (collect "ding", collide "thud", abilities "whoosh"). Volume panel.
Responsive: Scale.resize on window change; camera follow orb.
Requirements Met
Multiplayer: Real-time sync, 2-8 players.
Perf: Low-lag (prediction, deltas), adaptive modes, pooling.
Platform: Browser (desktop/mobile).
Complexity: Levels/upgrades, Core zone.
Engagement: Story (nebula rebirth), chaos (steals/abilities), series progression.
Roadmap
Fix win freeze (broadcast pos for effects).
Add series (best-of-5, upgrades UI post-round).
Bots: OODA loop for AI (creative: adaptive decisions based on player style).
DB: Supabase for persistent scores/badges.
Polish: More audio, minimap, emotes.