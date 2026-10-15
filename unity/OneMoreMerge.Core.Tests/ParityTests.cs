using System;
using System.Collections.Generic;
using System.IO;
using OneMoreMerge.Core;
using Xunit;

namespace OneMoreMerge.Core.Tests
{
    /// <summary>Asserts the C# core reproduces unity/parity/cases.json (written by tools/export-parity-cases.ts from the TS core).</summary>
    public class ParityTests
    {
        static string RepoRoot()
        {
            var dir = new DirectoryInfo(AppContext.BaseDirectory);
            while (dir != null && !File.Exists(Path.Combine(dir.FullName, "package.json"))) dir = dir.Parent;
            if (dir == null) throw new InvalidOperationException("repo root (package.json) not found above " + AppContext.BaseDirectory);
            return dir.FullName;
        }

        static Dictionary<string, object> Cases()
        {
            string path = Path.Combine(RepoRoot(), "unity", "parity", "cases.json");
            return (Dictionary<string, object>)Json.Parse(File.ReadAllText(path));
        }

        static List<object> List(object o) { return (List<object>)o; }
        static Dictionary<string, object> Obj(object o) { return (Dictionary<string, object>)o; }

        [Fact]
        public void Rng_next_matches_ts()
        {
            var cases = List(Cases()["rng"]);
            Assert.NotEmpty(cases);
            foreach (var co in cases)
            {
                var c = Obj(co);
                uint seed = (uint)(double)c["seed"];
                var r = new Rng(seed);
                var expected = List(c["next"]);
                for (int i = 0; i < expected.Count; i++)
                    Assert.True((double)expected[i] == r.Next(), "seed " + seed + " step " + i);
                Assert.Equal((uint)(double)c["stateAfter"], r.State);
            }
        }

        [Fact]
        public void Rng_int_and_shuffle_match_ts()
        {
            foreach (var co in List(Cases()["rng"]))
            {
                var c = Obj(co);
                uint seed = (uint)(double)c["seed"];
                foreach (var io in List(c["ints"]))
                {
                    var ic = Obj(io);
                    int n = (int)(double)ic["n"];
                    var r = new Rng(seed);
                    var expected = List(ic["values"]);
                    for (int i = 0; i < expected.Count; i++) Assert.Equal((int)(double)expected[i], r.Int(n));
                }
                var arr = new List<int>();
                for (int i = 0; i < 12; i++) arr.Add(i);
                new Rng(seed).Shuffle(arr);
                var want = List(c["shuffle12"]);
                for (int i = 0; i < 12; i++) Assert.Equal((int)(double)want[i], arr[i]);
            }
        }

        [Fact]
        public void Level_init_state_hash_matches_ts()
        {
            var cases = Cases();
            var consts = Obj(cases["constants"]);
            Assert.Equal((double)Const.Rows, (double)consts["rows"]);
            Assert.Equal((double)Const.Cols, (double)consts["cols"]);
            Assert.Equal((double)Const.MaxRank, (double)consts["maxRank"]);

            // levels.json is read in place, never copied.
            var file = LevelLoader.Parse(File.ReadAllText(Path.Combine(RepoRoot(), "src", "content", "levels.json")));
            Assert.Equal(Const.Rows, file.BoardRows);
            Assert.Equal(Const.Cols, file.BoardColumns);

            var expected = List(cases["levelInit"]);
            var plainLevels = file.Levels.FindAll(LevelLoader.IsPlain);
            Assert.Equal(expected.Count, plainLevels.Count); // same "plain level" filter on both sides
            for (int i = 0; i < expected.Count; i++)
            {
                var e = Obj(expected[i]);
                var def = plainLevels[i];
                Assert.Equal((int)(double)e["level"], def.Level);
                Assert.Equal((uint)(double)e["seed"], def.Seed);
                string text = LevelLoader.InitText(file, def);
                Assert.Equal((string)e["text"], text);
                Assert.Equal((string)e["hash"], LevelLoader.HashText(text));
            }
        }

        [Fact]
        public void Golden_flags_off_entries_are_present()
        {
            var golden = Obj(Cases()["goldenFlagsOff"]);
            Assert.True(golden.ContainsKey("teach-L1"));
            Assert.True(golden.ContainsKey("_tuningDigest"));
        }
    }
}
