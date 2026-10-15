using System;
using System.Collections.Generic;
using System.IO;
using OneMoreMerge.Core;
using Xunit;

namespace OneMoreMerge.Core.Tests
{
    /// <summary>Step 2: the board slice (tables, start boards, placing, plain merge, sandwich) must reproduce unity/parity/cases2.json (tools/export-parity-board.ts, from the TS core).</summary>
    public class BoardParityTests
    {
        static string RepoRoot()
        {
            var dir = new DirectoryInfo(AppContext.BaseDirectory);
            while (dir != null && !File.Exists(Path.Combine(dir.FullName, "package.json"))) dir = dir.Parent;
            if (dir == null) throw new InvalidOperationException("repo root (package.json) not found above " + AppContext.BaseDirectory);
            return dir.FullName;
        }

        static Dictionary<string, object> Cases() { return (Dictionary<string, object>)Json.Parse(File.ReadAllText(Path.Combine(RepoRoot(), "unity", "parity", "cases2.json"))); }
        static LevelFile Levels() { return LevelLoader.Parse(File.ReadAllText(Path.Combine(RepoRoot(), "src", "content", "levels.json"))); }
        static List<object> L(object o) { return (List<object>)o; }
        static Dictionary<string, object> O(object o) { return (Dictionary<string, object>)o; }
        static int I(object o) { return (int)(double)o; }

        static MergeRule Rule(string s)
        {
            switch (s) { case "today": return MergeRule.Today; case "sandwich2": return MergeRule.Sandwich2; case "sandwichBonus": return MergeRule.SandwichBonus; default: throw new ArgumentException(s); }
        }

        [Fact]
        public void Tables_match_ts()
        {
            var c = Cases();
            var consts = O(c["constants"]);
            Assert.Equal(Const.Rows, I(consts["rows"]));
            Assert.Equal(Const.Cols, I(consts["cols"]));
            Assert.Equal(Content.MaxRank, I(consts["maxRank"]));

            var t = O(c["tables"]);
            var families = L(t["families"]);
            Assert.Equal(families.Count, Content.Families.Length);
            for (int i = 0; i < families.Count; i++) Assert.Equal((string)families[i], Content.Families[i]);

            var shooters = new HashSet<string>(); foreach (var f in L(t["shooters"])) shooters.Add((string)f);
            var relays = new HashSet<string>(); foreach (var f in L(t["relays"])) relays.Add((string)f);
            var cap6 = L(t["cap6"]); var cap8 = L(t["cap8"]); var capNone = L(t["capNoLevel"]);
            for (int i = 0; i < Content.Families.Length; i++)
            {
                string f = Content.Families[i];
                Assert.Equal(shooters.Contains(f), Content.IsShooter(f));
                Assert.Equal(relays.Contains(f), Content.IsRelay(f));
                Assert.Equal(I(cap6[i]), Content.CapOf(6, f));
                Assert.Equal(I(cap8[i]), Content.CapOf(8, f));
                Assert.Equal(I(capNone[i]), Content.CapOf(null, f));
            }

            var units = L(t["units"]);
            Assert.Equal(units.Count, Content.Units.Length);
            for (int i = 0; i < units.Count; i++)
            {
                var u = O(units[i]);
                Assert.Equal((string)u["id"], Content.Units[i].Id);
                Assert.Equal((string)u["role"], Content.Units[i].Role);
                Assert.Equal((string)u["rarity"], Content.Units[i].Rarity.ToString().ToLowerInvariant());
                Assert.Equal((string)u["slot"], Content.Units[i].Slot);
            }
        }

        [Fact]
        public void All_80_level_start_boards_match_ts()
        {
            var file = Levels();
            var boards = L(Cases()["levelBoards"]);
            Assert.Equal(file.Levels.Count, boards.Count);
            for (int i = 0; i < boards.Count; i++)
            {
                var e = O(boards[i]);
                var def = file.Levels[i];
                Assert.Equal(I(e["level"]), def.Level);
                var board = Board.NewLevel(file, def);
                Assert.Equal((string)e["text"], board.StateText());
                Assert.Equal((string)e["hash"], board.StateHash());
            }
        }

        [Fact]
        public void Scripted_drops_match_ts_after_every_step()
        {
            var file = Levels();
            var cases = L(Cases()["cases"]);
            Assert.NotEmpty(cases);
            int steps = 0, merges = 0, sandwiches = 0;
            foreach (var co in cases)
            {
                var c = O(co);
                string name = (string)c["name"];
                var def = file.Levels.Find(d => d.Level == I(c["level"]));
                var board = Board.NewLevel(file, def, (bool)c["jumpstart"]);
                board.Rule = Rule((string)c["rule"]);
                if (c["override"] != null)
                {
                    var parts = new List<KeyValuePair<int, KeyValuePair<string, int>>>();
                    foreach (var po in L(c["override"])) { var p = L(po); parts.Add(new KeyValuePair<int, KeyValuePair<string, int>>(I(p[0]), new KeyValuePair<string, int>((string)p[1], I(p[2])))); }
                    board.Override(parts);
                    if (c["masked"] != null) { board.Masked.Clear(); foreach (var m in L(c["masked"])) board.Masked.Add(I(m)); }
                }
                Assert.Equal((string)c["initText"], board.StateText());
                Assert.Equal((string)c["initHash"], board.StateHash());

                int k = 0;
                foreach (var so in L(c["steps"]))
                {
                    var st = O(so);
                    string at = name + " step " + k++;
                    int from = I(st["from"]), to = I(st["to"]);
                    var r = board.Drop(from, to, I(st["id"]));
                    Assert.True((bool)st["ok"] == r.Ok, at + " ok");
                    Assert.Equal(((string)st["kind"]).ToLowerInvariant(), r.Kind.ToString().ToLowerInvariant());
                    Assert.Equal(I(st["land"]), r.Land);
                    if (r.Kind == DropKind.Merge)
                    {
                        merges++;
                        Assert.Equal(I(st["newRank"]), r.Created.Rank);
                        var sw = st["sandwich"] == null ? null : O(st["sandwich"]);
                        Assert.Equal(sw != null, r.Sandwich != null);
                        if (sw != null)
                        {
                            sandwiches++;
                            var cells = L(sw["cells"]);
                            Assert.Equal(I(cells[0]), r.Sandwich.Cell0);
                            Assert.Equal(I(cells[1]), r.Sandwich.Cell1);
                            Assert.Equal(I(sw["rank"]), r.Sandwich.Rank);
                            Assert.Equal(I(sw["plus"]), r.Sandwich.Plus);
                            Assert.True((bool)sw["bonus"] == r.Sandwich.Bonus, at + " bonus");
                        }
                    }
                    Assert.Equal((string)st["hash"], board.StateHash());
                    steps++;
                }
            }
            Assert.True(steps > 1000 && merges > 100 && sandwiches > 5, "coverage: " + steps + " steps, " + merges + " merges, " + sandwiches + " sandwiches");
        }

        // Invariants from CLAUDE.md that the board slice must keep, independent of the TS export.
        [Fact]
        public void Merge_frees_one_cell_keeps_family_and_move_never_changes_rank()
        {
            var file = Levels();
            var board = Board.NewLevel(file, file.Levels[0]);
            board.Override(new[] { new KeyValuePair<int, KeyValuePair<string, int>>(0, new KeyValuePair<string, int>("bell", 2)), new KeyValuePair<int, KeyValuePair<string, int>>(1, new KeyValuePair<string, int>("bell", 2)), new KeyValuePair<int, KeyValuePair<string, int>>(7, new KeyValuePair<string, int>("coil", 2)) });
            int occ = Count(board);
            var mv = board.Drop(7, 8, board.Grid[7].Id);
            Assert.Equal(DropKind.Move, mv.Kind);
            Assert.Equal(2, board.Grid[8].Rank);
            var mg = board.Drop(0, 1, board.Grid[0].Id);
            Assert.Equal(DropKind.Merge, mg.Kind);
            Assert.Equal(occ - 1, Count(board));
            Assert.Equal("bell", board.Grid[1].Family);
            Assert.Equal(3, board.Grid[1].Rank);
            Assert.False(board.Drop(1, 8, board.Grid[1].Id).Kind == DropKind.Merge); // bell vs coil: swap, never a merge
        }

        static int Count(Board b) { int n = 0; foreach (var g in b.Grid) if (g != null) n++; return n; }
    }
}
