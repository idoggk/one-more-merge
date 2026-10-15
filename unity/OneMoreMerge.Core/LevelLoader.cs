using System;
using System.Collections.Generic;
using System.Globalization;
using System.Text;

namespace OneMoreMerge.Core
{
    /// <summary>Reads src/content/levels.json (the file is never copied; callers pass its text) and builds the first state hash.</summary>
    public static class LevelLoader
    {
        public static LevelFile Parse(string jsonText)
        {
            var root = (Dictionary<string, object>)Json.Parse(jsonText);
            var file = new LevelFile
            {
                BoardRows = (int)(double)root["board_rows"],
                BoardColumns = (int)(double)root["board_columns"],
                StartingCells = new Dictionary<string, List<int[]>>(),
                Levels = new List<LevelDef>(),
            };
            foreach (var kv in (Dictionary<string, object>)root["starting_cells"])
            {
                var cells = new List<int[]>();
                foreach (var c in (List<object>)kv.Value) { var p = (List<object>)c; cells.Add(new[] { (int)(double)p[0], (int)(double)p[1] }); }
                file.StartingCells[kv.Key] = cells;
            }
            foreach (var o in (List<object>)root["levels"]) file.Levels.Add(ParseLevel((Dictionary<string, object>)o));
            return file;
        }

        static LevelDef ParseLevel(Dictionary<string, object> d)
        {
            var teach = Opt(d, "teach") as Dictionary<string, object>;
            return new LevelDef
            {
                Level = (int)(double)d["level"],
                Monster = (string)d["monster"],
                Hp = (double)d["hp"],
                TimeSeconds = (double)d["time_seconds"],
                Modifier = (string)d["modifier"],
                BossNode = (bool)d["boss_node"],
                StartingRank = (int)(double)d["starting_rank"],
                Seed = (uint)(double)d["seed"],
                OrdinaryCopyRankCap = (int)(double)d["ordinary_copy_rank_cap"],
                Shooter = Opt(d, "shooter") as string,
                MiniBoss = Opt(d, "mini_boss") as string,
                HasWaves = Opt(d, "waves") != null,
                HasGoal = Opt(d, "goal") != null,
                StartExtra = Pieces(Opt(d, "start_extra")),
                TeachStart = teach == null ? null : Pieces(teach["start"]),
            };
        }

        static object Opt(Dictionary<string, object> d, string key) { object v; return d.TryGetValue(key, out v) ? v : null; }

        static List<StartPiece> Pieces(object o)
        {
            if (o == null) return null;
            var list = new List<StartPiece>();
            foreach (var item in (List<object>)o)
            {
                var a = (List<object>)item;
                list.Add(new StartPiece { Family = (string)a[0], Rank = (int)(double)a[1], Row = (int)(double)a[2], Col = (int)(double)a[3] });
            }
            return list;
        }

        /// <summary>True for levels whose start board is the plain one this spike reproduces (no modifier, boss, mini-boss, extra pieces or shooter override). Same filter as tools/export-parity-cases.ts.</summary>
        public static bool IsPlain(LevelDef d)
        {
            bool teach = d.TeachStart != null;
            return d.Modifier == "NONE" && (d.Level % 10 != 0 || teach) && d.MiniBoss == null && d.StartExtra == null && d.Shooter == null;
        }

        /// <summary>The text hashed for "level N after init" (same format as the TS export): scalars plus the 30-cell grid as family:rank or '-'.</summary>
        public static string InitText(LevelFile file, LevelDef d)
        {
            var grid = new string[Const.Rows * Const.Cols];
            if (d.TeachStart != null)
                foreach (var p in d.TeachStart) grid[p.Row * Const.Cols + p.Col] = p.Family + ":" + p.Rank.ToString(CultureInfo.InvariantCulture);
            else
                foreach (var kv in file.StartingCells)
                {
                    string fam = kv.Key == "shooter" ? "cannon" : kv.Key; // default squad: shooter = cannon, coil, bell
                    foreach (var rc in kv.Value) grid[rc[0] * Const.Cols + rc[1]] = fam + ":" + d.StartingRank.ToString(CultureInfo.InvariantCulture);
                }
            var sb = new StringBuilder();
            sb.Append('L').Append(d.Level.ToString(CultureInfo.InvariantCulture));
            sb.Append(";hp=").Append(Num(d.Hp));
            sb.Append(";time=").Append(Num(d.TimeSeconds));
            sb.Append(";copyCap=").Append(d.OrdinaryCopyRankCap.ToString(CultureInfo.InvariantCulture));
            sb.Append(";rankCap=").Append((d.Level >= 21 ? 8 : Const.MaxRank).ToString(CultureInfo.InvariantCulture));
            sb.Append(";target=").Append(Const.MonsterIndex(d.Monster).ToString(CultureInfo.InvariantCulture));
            sb.Append(";grid=");
            for (int i = 0; i < grid.Length; i++) { if (i > 0) sb.Append(','); sb.Append(grid[i] ?? "-"); }
            return sb.ToString();
        }

        static string Num(double v) { return v.ToString("R", CultureInfo.InvariantCulture); }

        /// <summary>FNV-1a over the UTF-16 code units, as hex8:length (same as roster4.stateHash's hash).</summary>
        public static string HashText(string text)
        {
            unchecked
            {
                uint h = 0x811c9dc5u;
                foreach (char c in text) { h ^= c; h *= 0x01000193u; }
                return h.ToString("x8", CultureInfo.InvariantCulture) + ":" + text.Length.ToString(CultureInfo.InvariantCulture);
            }
        }
    }
}
