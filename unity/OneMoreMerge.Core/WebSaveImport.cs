using System;
using System.Collections.Generic;
using System.IO;
using System.IO.Compression;
using System.Text;
using System.Text.RegularExpressions;

namespace OneMoreMerge.Core
{
    /// <summary>
    /// Imports a save from the web game (src/platform/backup.ts). Accepted input, as a string:
    ///  1. the backup code "OMM1j.&lt;base64&gt;.&lt;crc32&gt;" (j = plain JSON, z = deflate-raw), checksum verified;
    ///  2. the bundle JSON {"v":1,"at":..,"meta":{..},"run":..};
    ///  3. the bare meta JSON stored under localStorage "omm.meta.v1".
    /// Only progress, settings and flag state are taken. The run in progress ("omm.save.v1") is dropped.
    /// </summary>
    public static class WebSaveImport
    {
        /// <summary>Highest web backup code version understood (BACKUP_VERSION in backup.ts).</summary>
        public const int WebBackupVersion = 1;

        static readonly Regex CodeRe = new Regex(@"^OMM(\d+)([zj])\.([A-Za-z0-9+/]+=*)\.([0-9a-f]{8})$");

        /// <exception cref="FormatException">Empty, foreign, newer, damaged or not a save.</exception>
        public static SaveData Import(string input)
        {
            string text = (input ?? "").Trim();
            if (text.Length == 0) throw new FormatException("Nothing to import");
            long at = 0;
            Dictionary<string, object> meta;
            if (text[0] == '{')
            {
                var root = ParseObject(text);
                if (root.ContainsKey("meta") && root["meta"] is Dictionary<string, object> m)
                {
                    meta = m;
                    at = (long)SaveSerializer.Num(root, "at", 0);
                }
                else meta = root;
            }
            else
            {
                var bundle = DecodeCode(Regex.Replace(text, @"\s+", ""));
                meta = SaveSerializer.Obj(bundle, "meta");
                if (!(bundle.TryGetValue("meta", out var mo) && mo is Dictionary<string, object>))
                    throw new FormatException("Backup code has no meta");
                at = (long)SaveSerializer.Num(bundle, "at", 0);
            }
            return FromMeta(meta, at);
        }

        static Dictionary<string, object> ParseObject(string json)
        {
            object o;
            try { o = Json.Parse(json); }
            catch (Exception e) when (e is FormatException || e is IndexOutOfRangeException || e is ArgumentException || e is OverflowException)
            {
                throw new FormatException("Web save is not valid JSON: " + e.Message);
            }
            return o as Dictionary<string, object> ?? throw new FormatException("Web save is not a JSON object");
        }

        static Dictionary<string, object> DecodeCode(string code)
        {
            var ver = Regex.Match(code, @"^OMM(\d+)");
            if (!ver.Success) throw new FormatException("Not a One More Merge save code");
            int v = int.TryParse(ver.Groups[1].Value, out var pv) ? pv : int.MaxValue;
            if (v > WebBackupVersion) throw new FormatException("Save code is from a newer version");
            var m = CodeRe.Match(code);
            string head = m.Success ? code.Substring(0, code.LastIndexOf('.')) : null;
            if (!m.Success || Crc32(head) != Convert.ToUInt32(m.Groups[4].Value, 16))
                throw new FormatException("Save code looks damaged or cut off");
            byte[] bytes;
            try
            {
                bytes = Convert.FromBase64String(m.Groups[3].Value);
                if (m.Groups[2].Value == "z") bytes = Inflate(bytes);
            }
            catch (Exception e) when (e is FormatException || e is InvalidDataException)
            {
                throw new FormatException("Save code looks damaged");
            }
            var root = ParseObject(new UTF8Encoding(false, true).GetString(bytes));
            if (!(root.TryGetValue("v", out var vo) && vo is double vd && (int)vd == v)) throw new FormatException("Save code version mismatch");
            return root;
        }

        static byte[] Inflate(byte[] data)
        {
            using (var input = new MemoryStream(data))
            using (var z = new DeflateStream(input, CompressionMode.Decompress))
            using (var output = new MemoryStream())
            {
                z.CopyTo(output);
                return output.ToArray();
            }
        }

        /// <summary>CRC-32 (IEEE) of an ASCII string, same as crc32() in backup.ts.</summary>
        public static uint Crc32(string s)
        {
            uint c = 0xFFFFFFFF;
            foreach (char ch in s)
            {
                c ^= (byte)ch;
                for (int k = 0; k < 8; k++) c = (c & 1) != 0 ? 0xEDB88320 ^ (c >> 1) : c >> 1;
            }
            return c ^ 0xFFFFFFFF;
        }

        /// <summary>Maps the web Meta record (src/game/meta.ts) onto SaveData. Unknown keys are ignored.</summary>
        public static SaveData FromMeta(Dictionary<string, object> m, long savedAtMs)
        {
            var d = new SaveData { SavedAtMs = Math.Max(0, savedAtMs) };
            var p = d.Progress;
            p.TutorialDone = SaveSerializer.Bool(m, "tutorialDone", false);
            p.HardUnlocked = SaveSerializer.Bool(m, "hardUnlocked", false);
            p.BestTime = SaveSerializer.OptNum(m, "bestTime");
            p.BestTimeHard = SaveSerializer.OptNum(m, "bestTimeHard");
            p.BestChain = SaveSerializer.Count(m, "bestChain");
            p.Runs = SaveSerializer.Count(m, "runs");
            p.Wins = SaveSerializer.Count(m, "wins");
            p.Merges = SaveSerializer.Count(m, "merges");
            p.Bolts = SaveSerializer.Count(m, "bolts");
            p.Gems = SaveSerializer.Count(m, "gems");
            p.Kits = SaveSerializer.Count(m, "kits");
            p.Capsules = SaveSerializer.Count(m, "capsules");
            p.LevelStars = SaveSerializer.IntMap(SaveSerializer.Obj(m, "levelStars"));
            p.Medals = SaveSerializer.BoolMap(SaveSerializer.Obj(m, "medals"));
            foreach (var kv in SaveSerializer.Obj(m, "units"))
            {
                if (kv.Value is Dictionary<string, object> u)
                    p.Units[kv.Key] = new UnitRec { Level = Math.Max(1, SaveSerializer.Count(u, "level")), Cards = SaveSerializer.Count(u, "cards") };
            }
            p.Mastery = SaveSerializer.IntMap(SaveSerializer.Obj(m, "mastery"));
            p.BossMastery = SaveSerializer.IntMap(SaveSerializer.Obj(m, "bossMastery"));
            p.Owned = SaveSerializer.Strings(m, "owned");
            p.Trophies = SaveSerializer.Strings(m, "trophies");
            p.Unlocks = SaveSerializer.BoolMap(SaveSerializer.Obj(m, "unlocks"));
            p.UnlockSeen = SaveSerializer.BoolMap(SaveSerializer.Obj(m, "unlockSeen"));
            p.Tips = SaveSerializer.BoolMap(SaveSerializer.Obj(m, "tips"));
            p.Lessons = SaveSerializer.BoolMap(SaveSerializer.Obj(m, "lessons"));
            p.Grants = SaveSerializer.BoolMap(SaveSerializer.Obj(m, "grants"));
            var s = d.Settings;
            s.Sound = SaveSerializer.Bool(m, "sound", true);
            s.Music = SaveSerializer.Bool(m, "music", true);
            s.Hints = SaveSerializer.Bool(m, "hints", true);
            s.Shake = SaveSerializer.Bool(m, "shake", true);
            s.SwapMismatch = SaveSerializer.Bool(m, "swapMismatch", false);
            s.PlaytestMode = SaveSerializer.Bool(m, "playtestMode", false);
            return d;
        }
    }
}
