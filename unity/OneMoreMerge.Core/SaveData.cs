using System.Collections.Generic;

namespace OneMoreMerge.Core
{
    /// <summary>A unit in the player's collection (web: meta.units[id]).</summary>
    public sealed class UnitRec
    {
        public int Level = 1;
        public int Cards;
    }

    /// <summary>Everything the player earned. Mirrors the progress part of the web Meta (src/game/meta.ts).</summary>
    public sealed class Progress
    {
        public bool TutorialDone;
        public bool HardUnlocked;
        public double? BestTime;
        public double? BestTimeHard;
        public int BestChain;
        public int Runs;
        public int Wins;
        public int Merges;
        public int Bolts;
        public int Gems;
        public int Kits;
        public int Capsules;
        /// <summary>Best stars per level number ("1".."N").</summary>
        public Dictionary<string, int> LevelStars = new Dictionary<string, int>();
        /// <summary>Chapter medals (chapter -> earned).</summary>
        public Dictionary<string, bool> Medals = new Dictionary<string, bool>();
        public Dictionary<string, UnitRec> Units = new Dictionary<string, UnitRec>();
        /// <summary>Highest rank ever created per family.</summary>
        public Dictionary<string, int> Mastery = new Dictionary<string, int>();
        public Dictionary<string, int> BossMastery = new Dictionary<string, int>();
        public List<string> Owned = new List<string>();
        public List<string> Trophies = new List<string>();
        /// <summary>Sticky feature unlocks and whether the player has seen them.</summary>
        public Dictionary<string, bool> Unlocks = new Dictionary<string, bool>();
        public Dictionary<string, bool> UnlockSeen = new Dictionary<string, bool>();
        /// <summary>One-time tips and lessons already shown.</summary>
        public Dictionary<string, bool> Tips = new Dictionary<string, bool>();
        public Dictionary<string, bool> Lessons = new Dictionary<string, bool>();
        /// <summary>One-time grants already paid.</summary>
        public Dictionary<string, bool> Grants = new Dictionary<string, bool>();
    }

    /// <summary>Player settings (pause menu toggles).</summary>
    public sealed class Settings
    {
        public bool Sound = true;
        public bool Music = true;
        public bool Hints = true;
        public bool Shake = true;
        public bool SwapMismatch;
        public bool PlaytestMode;
    }

    /// <summary>
    /// The whole save: progress, settings and flag state only. No rules and no run in progress.
    /// <see cref="Flags"/> holds on/off switch state by name (web QA flags); the web import leaves it empty.
    /// </summary>
    public sealed class SaveData
    {
        public const int CurrentVersion = 1;

        public int Version = CurrentVersion;
        /// <summary>Unix ms of the last save (0 = unknown).</summary>
        public long SavedAtMs;
        public Progress Progress = new Progress();
        public Settings Settings = new Settings();
        public Dictionary<string, bool> Flags = new Dictionary<string, bool>();
    }
}
