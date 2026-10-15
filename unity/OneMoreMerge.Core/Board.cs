using System;
using System.Collections.Generic;
using System.Globalization;
using System.Text;

namespace OneMoreMerge.Core
{
    /// <summary>A board part (types.ts Gadget, only the fields the board slice needs: id, family, rank). Cooldowns, marks, items come with the cascade step.</summary>
    public sealed class Gadget
    {
        public int Id;
        public string Family;
        public int Rank;
    }

    /// <summary>TUNING.mergeRule (sandwich.ts MergeRule). Default Today = the live game.</summary>
    public enum MergeRule { Today, Sandwich2, SandwichBonus }

    /// <summary>sandwich.ts SandwichPlan.</summary>
    public sealed class SandwichPlan
    {
        public int Cell0, Cell1;  // the two absorbed neighbour cells
        public int Rank;          // rank of the merged part
        public int Plus;          // ranks gained over the merging pair
        public bool Bonus;        // sandwichBonus: pays Overdrive (the Overdrive amount itself is not ported yet)
    }

    public enum DropKind { Refused, Merge, Move, Swap }

    /// <summary>Result of Board.Drop (game.ts CommandResult, reduced to the board effect).</summary>
    public sealed class DropResult
    {
        public bool Ok;
        public DropKind Kind;
        public int Land = -1;            // cell the dragged part ended on (merge: the merge cell)
        public Gadget Created;           // merge: the new part
        public SandwichPlan Sandwich;    // merge: the sandwich used, or null
    }

    /// <summary>
    /// The board of one Saga level: grid, id counter, locked (masked) cells, rank cap. Port of the board part of src/core/game.ts
    /// (newLevel start grid, makeGadget, capOf, canMerge, drop = merge / move / swap) and src/core/sandwich.ts.
    /// NOT here yet: cascade, damage, supply, waves, boss attacks, support cards, tools (later steps, see unity/PORT_ORDER.md).
    /// </summary>
    public sealed class Board
    {
        public readonly Gadget[] Grid = new Gadget[Const.Rows * Const.Cols];
        public int NextId = 1;
        public int Level;
        public int RankCap = Content.MaxRank;
        public string Shooter = "cannon";
        public readonly List<int> Masked = new List<int>(); // GAPS / CORNERS cells: no drop from or onto them (game.ts locked())
        public MergeRule Rule = MergeRule.Today;

        public static int IdxOf(int r, int c) { return r * Const.Cols + c; }

        public Gadget MakeGadget(string family, int rank)
        {
            return new Gadget { Id = NextId++, Family = family, Rank = rank };
        }

        public int CapOf(string family) { return Content.CapOf(RankCap, family); }

        /// <summary>game.ts canMerge (no tools in this slice): same family and rank; below the cap, or exactly at the cap (Saga levels compact two cap parts into one).</summary>
        public bool CanMerge(Gadget a, Gadget b)
        {
            if (a == null || b == null || a.Family != b.Family || a.Rank != b.Rank) return false;
            return a.Rank <= CapOf(a.Family);
        }

        /// <summary>game.ts newLevel, grid part only: starting squad / teaching start, Jumpstart, extra pieces, GAPS / CORNERS masks, boss second squad.
        /// Layout A only (TUNING.variedOpenings is off), no helper/roster flags, no toys.</summary>
        public static Board NewLevel(LevelFile file, LevelDef d, bool jumpstart = false)
        {
            var b = new Board { Level = d.Level, RankCap = d.Level >= 21 ? Content.SagaRankCap : Content.MaxRank, Shooter = d.Shooter ?? "cannon" };
            if (d.TeachStart != null)
                foreach (var p in d.TeachStart) b.Grid[IdxOf(p.Row, p.Col)] = b.MakeGadget(p.Family == "cannon" ? b.Shooter : p.Family, p.Rank);
            else
                foreach (var kv in file.StartingCells)
                    foreach (var rc in kv.Value) b.Grid[IdxOf(rc[0], rc[1])] = b.MakeGadget(b.SquadFam(kv.Key), d.StartingRank);
            if (jumpstart)
            {
                var shooters = file.StartingCells["shooter"];
                for (int i = 0; i < 2 && i < shooters.Count; i++)
                {
                    var g = b.Grid[IdxOf(shooters[i][0], shooters[i][1])];
                    if (g != null) g.Rank = Math.Min(b.CapOf(g.Family), g.Rank + 1);
                }
            }
            if (d.StartExtra != null)
                foreach (var p in d.StartExtra) b.Grid[IdxOf(p.Row, p.Col)] = b.MakeGadget(p.Family == "cannon" ? b.Shooter : p.Family, p.Rank);
            if (d.Modifier == "GAPS") b.Mask(IdxOf(2, 1), IdxOf(2, 3));
            else if (d.Modifier == "CORNERS_2") b.Mask(IdxOf(0, 0), IdxOf(5, 4));
            else if (d.Modifier == "CORNERS_4") b.Mask(IdxOf(0, 0), IdxOf(0, 4), IdxOf(5, 0), IdxOf(5, 4));
            // SUCTION / JAM / ROW_GAPS (remix) do not touch the start grid and are not in levels.json; the drop locks they cause come with the remix step.
            if ((d.Level % 10 == 0 && d.TeachStart == null) || d.MiniBoss != null)
            {
                b.Masked.Clear(); // boss levels drop the mask (the masked cells stay empty)
                var extra = new List<string>();
                foreach (var kv in file.StartingCells) for (int k = 0; k < kv.Value.Count; k++) extra.Add(b.SquadFam(kv.Key));
                var rng = new Rng(d.Seed ^ 0xb055u);
                var empties = new List<int>();
                for (int i = 0; i < b.Grid.Length; i++) if (b.Grid[i] == null) empties.Add(i);
                rng.Shuffle(empties);
                for (int k = 0; k < extra.Count; k++)
                    if (k < empties.Count) b.Grid[empties[k]] = b.MakeGadget(extra[k], d.StartingRank);
            }
            return b;
        }

        /// <summary>game.ts squadFam with the default squad: shooter / cannon = the level's shooter, coil and bell stay.</summary>
        string SquadFam(string f) { return f == "shooter" || f == "cannon" ? Shooter : f; }

        void Mask(params int[] cells)
        {
            Masked.Clear();
            Masked.AddRange(cells);
            foreach (var c in cells) Grid[c] = null;
        }

        /// <summary>Replace the whole grid (tests / exported setups): parts get ids 1.. in list order, like newLevel's makeGadget.</summary>
        public void Override(IEnumerable<KeyValuePair<int, KeyValuePair<string, int>>> parts)
        {
            Array.Clear(Grid, 0, Grid.Length);
            NextId = 1;
            foreach (var p in parts) Grid[p.Key] = MakeGadget(p.Value.Key, p.Value.Value);
        }

        // ---------- sandwich.ts ----------

        static readonly int[][] Dirs = { new[] { -1, 0 }, new[] { 0, 1 }, new[] { 1, 0 }, new[] { 0, -1 } };

        /// <summary>sandwich.ts sandwichNeighbours: orthogonal neighbours of `to` (never `from`, never blocked) with a's family and rank, in U/R/D/L order.</summary>
        public List<int> SandwichNeighbours(Gadget a, int from, int to, ICollection<int> blocked)
        {
            var outList = new List<int>();
            int r = to / Const.Cols, c = to % Const.Cols;
            foreach (var d in Dirs)
            {
                int rr = r + d[0], cc = c + d[1];
                if (rr < 0 || rr >= Const.Rows || cc < 0 || cc >= Const.Cols) continue;
                int n = rr * Const.Cols + cc;
                var g = Grid[n];
                if (n == from || blocked.Contains(n) || g == null || g.Family != a.Family || g.Rank != a.Rank) continue;
                outList.Add(n);
            }
            return outList;
        }

        /// <summary>sandwich.ts pickPair: an opposite pair if there is one (vertical first), else the first two.</summary>
        public static int[] PickPair(List<int> cands, int to)
        {
            if (cands.Contains(to - Const.Cols) && cands.Contains(to + Const.Cols)) return new[] { to - Const.Cols, to + Const.Cols };
            int left = to % Const.Cols > 0 ? to - 1 : -1, right = to % Const.Cols < Const.Cols - 1 ? to + 1 : -1;
            if (left >= 0 && right >= 0 && cands.Contains(left) && cands.Contains(right)) return new[] { right, left };
            return new[] { cands[0], cands[1] };
        }

        /// <summary>sandwich.ts planSandwich with cap = this family's cap here.</summary>
        public SandwichPlan PlanSandwich(int from, int to, ICollection<int> blocked, MergeRule rule)
        {
            if (rule == MergeRule.Today) return null;
            var a = Grid[from]; var b = Grid[to];
            if (a == null || b == null || a.Family != b.Family || a.Rank != b.Rank) return null;
            int cap = CapOf(a.Family);
            if (a.Rank >= cap) return null; // cap compaction stays as today
            var cands = SandwichNeighbours(a, from, to, blocked);
            if (cands.Count < 2) return null;
            int rank = Math.Min(a.Rank + 2, cap);
            var pair = PickPair(cands, to);
            return new SandwichPlan { Cell0 = pair[0], Cell1 = pair[1], Rank = rank, Plus = rank - a.Rank, Bonus = rule == MergeRule.SandwichBonus };
        }

        /// <summary>game.ts sandwichFor for a playing, non-puzzle board (cells a sandwich may never absorb = the masked ones; no boss yet).</summary>
        public SandwichPlan SandwichFor(int from, int to)
        {
            return Grid[from] == null ? null : PlanSandwich(from, to, Masked, Rule);
        }

        // ---------- game.ts drop / merge ----------

        /// <summary>game.ts drop (board effect only): refuse, merge, move or swap. A merge frees the `from` cell, makes one new part at `to` with a new id
        /// (rank+1 capped, or the sandwich rank), keeps the family. Move / swap never change a rank. Cascade, damage, supply and boss effects are not applied.</summary>
        public DropResult Drop(int from, int to, int fromId)
        {
            var refused = new DropResult { Ok = false, Kind = DropKind.Refused };
            if (from == to || from < 0 || to < 0 || from >= Grid.Length || to >= Grid.Length) return refused;
            var a = Grid[from];
            if (a == null || a.Id != fromId) return refused;
            if (Masked.Contains(from) || Masked.Contains(to)) return refused;
            var b = Grid[to];
            if (CanMerge(a, b))
            {
                var sw = SandwichFor(from, to);
                var g = MakeGadget(a.Family, sw != null ? sw.Rank : Math.Min(a.Rank + 1, CapOf(a.Family)));
                Grid[from] = null;
                Grid[to] = g;
                if (sw != null) { Grid[sw.Cell0] = null; Grid[sw.Cell1] = null; }
                return new DropResult { Ok = true, Kind = DropKind.Merge, Land = to, Created = g, Sandwich = sw };
            }
            Grid[to] = a;
            Grid[from] = b;
            return new DropResult { Ok = true, Kind = b != null ? DropKind.Swap : DropKind.Move, Land = to };
        }

        // ---------- state hash ----------

        /// <summary>Text hashed for the board parity checks: level, id counter, masked cells, then every cell as family:rank#id or '-'.</summary>
        public string StateText()
        {
            var sb = new StringBuilder();
            sb.Append('L').Append(Level.ToString(CultureInfo.InvariantCulture));
            sb.Append(";next=").Append(NextId.ToString(CultureInfo.InvariantCulture));
            sb.Append(";masked=").Append(string.Join("|", Masked.ConvertAll(m => m.ToString(CultureInfo.InvariantCulture))));
            sb.Append(";grid=");
            for (int i = 0; i < Grid.Length; i++)
            {
                if (i > 0) sb.Append(',');
                var g = Grid[i];
                if (g == null) sb.Append('-');
                else sb.Append(g.Family).Append(':').Append(g.Rank.ToString(CultureInfo.InvariantCulture)).Append('#').Append(g.Id.ToString(CultureInfo.InvariantCulture));
            }
            return sb.ToString();
        }

        public string StateHash() { return LevelLoader.HashText(StateText()); }
    }
}
