using System.Collections.Generic;

namespace OneMoreMerge.Core
{
    /// <summary>Subset of src/core/types.ts + src/content/tuning.ts + src/content/levels.ts needed by the loader and the first state hash.</summary>
    public static class Const
    {
        public const int Rows = 6;
        public const int Cols = 5;
        public const int MaxRank = 6;
        /// <summary>Monster name -> target index (levels.ts MONSTER_INDEX); unknown names map to 0.</summary>
        public static int MonsterIndex(string monster)
        {
            switch (monster)
            {
                case "tin_can": return 0;
                case "mad_fridge": return 1;
                case "junkzilla": return 2;
                case "vacuum_viper": return 3;
                case "toaster_twins": return 4;
                case "grand_piano_saurus": return 5;
                default: return 0;
            }
        }
    }

    /// <summary>A start piece: [family, rank, row, col] in levels.json.</summary>
    public sealed class StartPiece
    {
        public string Family;
        public int Rank;
        public int Row;
        public int Col;
    }

    /// <summary>One level row of levels.json (only the fields the spike reads).</summary>
    public sealed class LevelDef
    {
        public int Level;
        public string Monster;
        public double Hp;
        public double TimeSeconds;
        public string Modifier;
        public bool BossNode;
        public int StartingRank;
        public uint Seed;
        public int OrdinaryCopyRankCap;
        public string Shooter;           // null when absent
        public string MiniBoss;          // null when absent
        public bool HasWaves;            // "waves" present (multi-machine stage: first machine's HP differs from hp)
        public bool HasGoal;             // "goal" present (goal level: no finite HP)
        public List<StartPiece> StartExtra; // null when absent
        public List<StartPiece> TeachStart; // null when the level is not a teaching level
    }

    /// <summary>The whole levels.json file (only the fields the spike reads).</summary>
    public sealed class LevelFile
    {
        public int BoardRows;
        public int BoardColumns;
        /// <summary>"shooter" / "coil" / "bell" -> list of (row, col). Insertion order of the JSON is kept (hash order depends on it only through the grid index).</summary>
        public Dictionary<string, List<int[]>> StartingCells;
        public List<LevelDef> Levels;
    }
}
