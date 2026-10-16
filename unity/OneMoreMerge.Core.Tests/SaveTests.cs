using System;
using System.Collections.Generic;
using System.IO;
using OneMoreMerge.Core;
using Xunit;

namespace OneMoreMerge.Core.Tests
{
    public class SaveTests
    {
        static string Fixture(string name) { return File.ReadAllText(Path.Combine(AppContext.BaseDirectory, "fixtures", name)); }

        static void AssertMidgame(SaveData d)
        {
            var p = d.Progress;
            Assert.True(p.TutorialDone);
            Assert.True(p.HardUnlocked);
            Assert.Equal(41.2, p.BestTime);
            Assert.Equal(77.65, p.BestTimeHard);
            Assert.Equal(7, p.BestChain);
            Assert.Equal(58, p.Runs);
            Assert.Equal(31, p.Wins);
            Assert.Equal(412, p.Merges);
            Assert.Equal(1234, p.Bolts);
            Assert.Equal(17, p.Gems);
            Assert.Equal(7, p.LevelStars.Count);
            Assert.Equal(3, p.LevelStars["5"]);
            Assert.True(p.Medals["2"]);
            Assert.Equal(4, p.Units["cannon"].Level);
            Assert.Equal(5, p.Units["fan"].Cards);
            Assert.Equal(5, p.Mastery["cannon"]);
            Assert.Equal(2, p.BossMastery["boss1"]);
            Assert.Equal(new[] { "finish.brass", "stage.yard" }, p.Owned);
            Assert.Equal(new[] { "boss1" }, p.Trophies);
            Assert.True(p.Unlocks["events"]);
            Assert.False(p.UnlockSeen.ContainsKey("events"));
            Assert.True(p.Lessons["cards"]);
            Assert.True(p.Grants["welcome"]);
            Assert.True(d.Settings.Sound);
            Assert.False(d.Settings.Hints);
            Assert.False(d.Settings.Shake);
            Assert.Empty(d.Flags);
        }

        // ---------- import of the web save ----------

        [Fact]
        public void Imports_bare_meta_json()
        {
            var d = WebSaveImport.Import(Fixture("web_meta_midgame.json"));
            AssertMidgame(d);
            Assert.Equal(SaveData.CurrentVersion, d.Version);
        }

        [Fact]
        public void Imports_fresh_meta_with_defaults()
        {
            var d = WebSaveImport.Import(Fixture("web_meta_fresh.json"));
            Assert.False(d.Progress.TutorialDone);
            Assert.Null(d.Progress.BestTime);
            Assert.Empty(d.Progress.Units);
            Assert.True(d.Settings.Shake); // absent in web meta = on
        }

        [Theory]
        [InlineData("web_backup_plain.txt")]
        [InlineData("web_backup_deflate.txt")]
        public void Imports_web_backup_codes_made_by_the_ts_exporter(string file)
        {
            var d = WebSaveImport.Import(Fixture(file));
            AssertMidgame(d);
            Assert.Equal(1760000000000L, d.SavedAtMs);
        }

        [Fact]
        public void Imports_bundle_json_and_pasted_whitespace()
        {
            string bundle = "{\"v\":1,\"at\":5,\"run\":null,\"meta\":" + Fixture("web_meta_midgame.json") + "}";
            var d = WebSaveImport.Import(bundle);
            AssertMidgame(d);
            Assert.Equal(5L, d.SavedAtMs);
            string code = Fixture("web_backup_plain.txt").Trim();
            AssertMidgame(WebSaveImport.Import("  " + code.Insert(20, "\n ") + "\n"));
        }

        [Fact]
        public void Crc32_matches_check_value()
        {
            Assert.Equal(0xCBF43926u, WebSaveImport.Crc32("123456789"));
        }

        [Theory]
        [InlineData("")]
        [InlineData("hello")]
        [InlineData("[1,2]")]
        [InlineData("{not json")]
        [InlineData("OMM9j.e30=.00000000")]
        public void Rejects_bad_input(string input)
        {
            Assert.Throws<FormatException>(() => WebSaveImport.Import(input));
        }

        [Fact]
        public void Rejects_tampered_code()
        {
            string code = Fixture("web_backup_plain.txt").Trim();
            string tampered = code.Substring(0, 30) + (code[30] == 'A' ? 'B' : 'A') + code.Substring(31);
            Assert.Throws<FormatException>(() => WebSaveImport.Import(tampered));
            Assert.Throws<FormatException>(() => WebSaveImport.Import(code.Substring(0, code.Length - 12)));
        }

        [Fact]
        public void Repairs_wrong_typed_and_negative_values()
        {
            var d = WebSaveImport.Import("{\"bolts\":-5,\"gems\":\"x\",\"runs\":3.9,\"bestTime\":\"fast\",\"units\":{\"a\":{\"level\":0,\"cards\":-1},\"b\":7},\"levelStars\":{\"1\":2,\"2\":null},\"owned\":[\"a\",3]}");
            Assert.Equal(0, d.Progress.Bolts);
            Assert.Equal(0, d.Progress.Gems);
            Assert.Equal(3, d.Progress.Runs);
            Assert.Null(d.Progress.BestTime);
            Assert.Equal(1, d.Progress.Units["a"].Level);
            Assert.Equal(0, d.Progress.Units["a"].Cards);
            Assert.False(d.Progress.Units.ContainsKey("b"));
            Assert.Single(d.Progress.LevelStars);
            Assert.Equal(new[] { "a" }, d.Progress.Owned);
        }

        // ---------- round trip ----------

        [Fact]
        public void Json_round_trip_is_lossless_and_stable()
        {
            var d = WebSaveImport.Import(Fixture("web_meta_midgame.json"));
            d.Flags["qa.fast"] = true;
            d.Flags["qa.slow"] = false;
            d.Progress.Owned.Add("quote\"back\\slash é★\n");
            string a = SaveSerializer.ToJson(d);
            var back = SaveSerializer.FromJson(a);
            Assert.Equal(a, SaveSerializer.ToJson(back));
            Assert.True(back.Flags["qa.fast"]);
            Assert.False(back.Flags["qa.slow"]);
            Assert.Equal("quote\"back\\slash é★\n", back.Progress.Owned[2]);
            Assert.Equal(77.65, back.Progress.BestTimeHard);
            Assert.Equal(412, back.Progress.Merges);
        }

        [Fact]
        public void File_round_trip_keeps_backup_and_recovers_from_damage()
        {
            string dir = Path.Combine(Path.GetTempPath(), "omm-save-" + Guid.NewGuid().ToString("N"));
            string path = Path.Combine(dir, "sub", "save.json");
            try
            {
                Assert.False(File.Exists(path));
                Assert.False(SaveFile.Load(path).Progress.TutorialDone); // no file: fresh
                var d = WebSaveImport.Import(Fixture("web_meta_midgame.json"));
                SaveFile.Save(path, d);
                AssertMidgame(SaveFile.Load(path));
                d.Progress.Bolts = 99;
                SaveFile.Save(path, d); // second save moves the first to .bak
                Assert.True(File.Exists(path + ".bak"));
                Assert.Equal(99, SaveFile.Load(path).Progress.Bolts);
                File.WriteAllText(path, "{ truncated");
                Assert.Equal(1234, SaveFile.Load(path).Progress.Bolts); // damaged: previous save
                File.WriteAllText(path + ".bak", "garbage");
                Assert.False(SaveFile.Load(path).Progress.TutorialDone); // both damaged: fresh
            }
            finally
            {
                if (Directory.Exists(dir)) Directory.Delete(dir, true);
            }
        }

        // ---------- versioning and migration ----------

        [Fact]
        public void Rejects_newer_and_missing_versions()
        {
            Assert.Throws<FormatException>(() => SaveSerializer.FromJson("{\"version\":999}"));
            Assert.Throws<FormatException>(() => SaveSerializer.FromJson("{}"));
            Assert.Throws<FormatException>(() => SaveSerializer.FromJson("{\"version\":0}"));
            Assert.Throws<FormatException>(() => SaveSerializer.FromJson("{\"version\":1.5}"));
        }

        [Fact]
        public void Migration_hook_runs_each_step_in_order_before_reading()
        {
            var steps = new List<int>();
            var table = new Dictionary<int, SaveSerializer.Migration>
            {
                // v1 -> v2: rename progress.coins to progress.bolts
                [1] = root =>
                {
                    steps.Add(1);
                    var p = (Dictionary<string, object>)root["progress"];
                    p["bolts"] = p["coins"];
                    p.Remove("coins");
                },
                [2] = root => steps.Add(2),
            };
            var d = SaveSerializer.FromJson("{\"version\":1,\"progress\":{\"coins\":4}}", table, 3);
            Assert.Equal(new[] { 1, 2 }, steps);
            Assert.Equal(4, d.Progress.Bolts);
            Assert.Equal(3, d.Version);
        }

        [Fact]
        public void Migration_not_run_when_already_current_and_missing_step_is_an_error()
        {
            var calls = new List<int>();
            var table = new Dictionary<int, SaveSerializer.Migration> { [1] = r => calls.Add(1) };
            SaveSerializer.FromJson("{\"version\":2}", table, 2);
            Assert.Empty(calls);
            Assert.Throws<FormatException>(() => SaveSerializer.FromJson("{\"version\":1}", new Dictionary<int, SaveSerializer.Migration>(), 2));
        }

        [Fact]
        public void Real_migration_table_covers_every_version_below_current()
        {
            for (int v = 1; v < SaveData.CurrentVersion; v++) Assert.True(SaveSerializer.Migrations.ContainsKey(v), "missing migration from v" + v);
        }
    }
}
