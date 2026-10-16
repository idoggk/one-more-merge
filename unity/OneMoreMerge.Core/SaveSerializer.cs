using System;
using System.Collections.Generic;
using System.Globalization;
using System.Text;

namespace OneMoreMerge.Core
{
    /// <summary>
    /// SaveData &lt;-&gt; JSON text, with a version field and a migration hook.
    /// A migration upgrades the parsed JSON tree from version N to N+1 (key = N). Tolerant reading: wrong-typed or
    /// missing values fall back to defaults, negative counts clamp to 0.
    /// </summary>
    public static class SaveSerializer
    {
        public delegate void Migration(Dictionary<string, object> root);

        /// <summary>Real migrations (none yet: version 1 is the first).</summary>
        public static readonly Dictionary<int, Migration> Migrations = new Dictionary<int, Migration>();

        // ---------- write ----------

        public static string ToJson(SaveData d)
        {
            var sb = new StringBuilder();
            sb.Append("{\"version\":").Append(d.Version);
            sb.Append(",\"savedAtMs\":").Append(d.SavedAtMs.ToString(CultureInfo.InvariantCulture));
            sb.Append(",\"progress\":");
            WriteProgress(sb, d.Progress);
            sb.Append(",\"settings\":");
            WriteSettings(sb, d.Settings);
            sb.Append(",\"flags\":");
            WriteMap(sb, d.Flags, (b, v) => b.Append(v ? "true" : "false"));
            sb.Append('}');
            return sb.ToString();
        }

        static void WriteProgress(StringBuilder sb, Progress p)
        {
            sb.Append('{');
            sb.Append("\"tutorialDone\":").Append(Bool(p.TutorialDone));
            sb.Append(",\"hardUnlocked\":").Append(Bool(p.HardUnlocked));
            sb.Append(",\"bestTime\":").Append(Num(p.BestTime));
            sb.Append(",\"bestTimeHard\":").Append(Num(p.BestTimeHard));
            sb.Append(",\"bestChain\":").Append(p.BestChain);
            sb.Append(",\"runs\":").Append(p.Runs);
            sb.Append(",\"wins\":").Append(p.Wins);
            sb.Append(",\"merges\":").Append(p.Merges);
            sb.Append(",\"bolts\":").Append(p.Bolts);
            sb.Append(",\"gems\":").Append(p.Gems);
            sb.Append(",\"kits\":").Append(p.Kits);
            sb.Append(",\"capsules\":").Append(p.Capsules);
            sb.Append(",\"levelStars\":"); WriteMap(sb, p.LevelStars, (b, v) => b.Append(v));
            sb.Append(",\"medals\":"); WriteMap(sb, p.Medals, (b, v) => b.Append(Bool(v)));
            sb.Append(",\"units\":");
            WriteMap(sb, p.Units, (b, u) => b.Append("{\"level\":").Append(u.Level).Append(",\"cards\":").Append(u.Cards).Append('}'));
            sb.Append(",\"mastery\":"); WriteMap(sb, p.Mastery, (b, v) => b.Append(v));
            sb.Append(",\"bossMastery\":"); WriteMap(sb, p.BossMastery, (b, v) => b.Append(v));
            sb.Append(",\"owned\":"); WriteList(sb, p.Owned);
            sb.Append(",\"trophies\":"); WriteList(sb, p.Trophies);
            sb.Append(",\"unlocks\":"); WriteMap(sb, p.Unlocks, (b, v) => b.Append(Bool(v)));
            sb.Append(",\"unlockSeen\":"); WriteMap(sb, p.UnlockSeen, (b, v) => b.Append(Bool(v)));
            sb.Append(",\"tips\":"); WriteMap(sb, p.Tips, (b, v) => b.Append(Bool(v)));
            sb.Append(",\"lessons\":"); WriteMap(sb, p.Lessons, (b, v) => b.Append(Bool(v)));
            sb.Append(",\"grants\":"); WriteMap(sb, p.Grants, (b, v) => b.Append(Bool(v)));
            sb.Append('}');
        }

        static void WriteSettings(StringBuilder sb, Settings s)
        {
            sb.Append("{\"sound\":").Append(Bool(s.Sound));
            sb.Append(",\"music\":").Append(Bool(s.Music));
            sb.Append(",\"hints\":").Append(Bool(s.Hints));
            sb.Append(",\"shake\":").Append(Bool(s.Shake));
            sb.Append(",\"swapMismatch\":").Append(Bool(s.SwapMismatch));
            sb.Append(",\"playtestMode\":").Append(Bool(s.PlaytestMode));
            sb.Append('}');
        }

        static string Bool(bool b) { return b ? "true" : "false"; }
        static string Num(double? v) { return v.HasValue ? v.Value.ToString("R", CultureInfo.InvariantCulture) : "null"; }

        /// <summary>Keys sorted ordinally so the output is deterministic.</summary>
        static void WriteMap<T>(StringBuilder sb, Dictionary<string, T> map, Action<StringBuilder, T> value)
        {
            var keys = new List<string>(map.Keys);
            keys.Sort(StringComparer.Ordinal);
            sb.Append('{');
            for (int i = 0; i < keys.Count; i++)
            {
                if (i > 0) sb.Append(',');
                WriteString(sb, keys[i]);
                sb.Append(':');
                value(sb, map[keys[i]]);
            }
            sb.Append('}');
        }

        static void WriteList(StringBuilder sb, List<string> items)
        {
            sb.Append('[');
            for (int i = 0; i < items.Count; i++)
            {
                if (i > 0) sb.Append(',');
                WriteString(sb, items[i]);
            }
            sb.Append(']');
        }

        static void WriteString(StringBuilder sb, string s)
        {
            sb.Append('"');
            foreach (char c in s)
            {
                switch (c)
                {
                    case '"': sb.Append("\\\""); break;
                    case '\\': sb.Append("\\\\"); break;
                    case '\n': sb.Append("\\n"); break;
                    case '\r': sb.Append("\\r"); break;
                    case '\t': sb.Append("\\t"); break;
                    default:
                        if (c < 0x20) sb.Append("\\u").Append(((int)c).ToString("x4", CultureInfo.InvariantCulture));
                        else sb.Append(c);
                        break;
                }
            }
            sb.Append('"');
        }

        // ---------- read ----------

        /// <summary>Parses a save written by <see cref="ToJson"/> (any older version is migrated first).</summary>
        /// <exception cref="FormatException">Not JSON, not an object, no version, or a version newer than this build.</exception>
        public static SaveData FromJson(string json) { return FromJson(json, Migrations); }

        public static SaveData FromJson(string json, IDictionary<int, Migration> migrations)
        {
            return FromJson(json, migrations, SaveData.CurrentVersion);
        }

        /// <summary>Same, with an explicit target version (lets tests drive the migration loop before a real v2 exists).</summary>
        public static SaveData FromJson(string json, IDictionary<int, Migration> migrations, int targetVersion)
        {
            object parsed;
            try { parsed = Json.Parse(json ?? ""); }
            catch (Exception e) when (e is FormatException || e is IndexOutOfRangeException || e is ArgumentException || e is OverflowException)
            {
                throw new FormatException("Save is not valid JSON: " + e.Message);
            }
            var root = parsed as Dictionary<string, object>;
            if (root == null) throw new FormatException("Save is not a JSON object");
            if (!(root.TryGetValue("version", out var vo) && vo is double vd && vd >= 1 && vd == Math.Floor(vd)))
                throw new FormatException("Save has no valid version");
            int version = (int)vd;
            if (version > targetVersion) throw new FormatException("Save version " + version + " is newer than this build (" + targetVersion + ")");
            while (version < targetVersion)
            {
                if (!migrations.TryGetValue(version, out var step)) throw new FormatException("No migration from save version " + version);
                step(root);
                version++;
                root["version"] = (double)version;
            }
            return Read(root, targetVersion);
        }

        static SaveData Read(Dictionary<string, object> root, int version)
        {
            var d = new SaveData { Version = version,SavedAtMs = (long)Math.Max(0, Num(root, "savedAtMs", 0)) };
            ReadProgress(Obj(root, "progress"), d.Progress);
            ReadSettings(Obj(root, "settings"), d.Settings);
            d.Flags = BoolMap(Obj(root, "flags"));
            return d;
        }

        static void ReadProgress(Dictionary<string, object> o, Progress p)
        {
            p.TutorialDone = Bool(o, "tutorialDone", false);
            p.HardUnlocked = Bool(o, "hardUnlocked", false);
            p.BestTime = OptNum(o, "bestTime");
            p.BestTimeHard = OptNum(o, "bestTimeHard");
            p.BestChain = Count(o, "bestChain");
            p.Runs = Count(o, "runs");
            p.Wins = Count(o, "wins");
            p.Merges = Count(o, "merges");
            p.Bolts = Count(o, "bolts");
            p.Gems = Count(o, "gems");
            p.Kits = Count(o, "kits");
            p.Capsules = Count(o, "capsules");
            p.LevelStars = IntMap(Obj(o, "levelStars"));
            p.Medals = BoolMap(Obj(o, "medals"));
            foreach (var kv in Obj(o, "units"))
            {
                if (kv.Value is Dictionary<string, object> u)
                    p.Units[kv.Key] = new UnitRec { Level = Math.Max(1, Count(u, "level")), Cards = Count(u, "cards") };
            }
            p.Mastery = IntMap(Obj(o, "mastery"));
            p.BossMastery = IntMap(Obj(o, "bossMastery"));
            p.Owned = Strings(o, "owned");
            p.Trophies = Strings(o, "trophies");
            p.Unlocks = BoolMap(Obj(o, "unlocks"));
            p.UnlockSeen = BoolMap(Obj(o, "unlockSeen"));
            p.Tips = BoolMap(Obj(o, "tips"));
            p.Lessons = BoolMap(Obj(o, "lessons"));
            p.Grants = BoolMap(Obj(o, "grants"));
        }

        static void ReadSettings(Dictionary<string, object> o, Settings s)
        {
            s.Sound = Bool(o, "sound", true);
            s.Music = Bool(o, "music", true);
            s.Hints = Bool(o, "hints", true);
            s.Shake = Bool(o, "shake", true);
            s.SwapMismatch = Bool(o, "swapMismatch", false);
            s.PlaytestMode = Bool(o, "playtestMode", false);
        }

        // ---------- tolerant accessors (shared with WebSaveImport) ----------

        internal static Dictionary<string, object> Obj(Dictionary<string, object> o, string key)
        {
            return o != null && o.TryGetValue(key, out var v) && v is Dictionary<string, object> d ? d : new Dictionary<string, object>();
        }

        internal static bool Bool(Dictionary<string, object> o, string key, bool def)
        {
            return o != null && o.TryGetValue(key, out var v) && v is bool b ? b : def;
        }

        internal static double Num(Dictionary<string, object> o, string key, double def)
        {
            return o != null && o.TryGetValue(key, out var v) && v is double d && !double.IsNaN(d) && !double.IsInfinity(d) ? d : def;
        }

        internal static double? OptNum(Dictionary<string, object> o, string key)
        {
            return o != null && o.TryGetValue(key, out var v) && v is double d && !double.IsNaN(d) && !double.IsInfinity(d) ? d : (double?)null;
        }

        /// <summary>Non-negative whole number (floored), clamped to int range; anything else 0.</summary>
        internal static int Count(Dictionary<string, object> o, string key)
        {
            return ToCount(o != null && o.TryGetValue(key, out var v) ? v : null);
        }

        static int ToCount(object v)
        {
            if (!(v is double d) || double.IsNaN(d)) return 0;
            return (int)Math.Max(0, Math.Min(int.MaxValue, Math.Floor(d)));
        }

        internal static Dictionary<string, int> IntMap(Dictionary<string, object> o)
        {
            var r = new Dictionary<string, int>();
            foreach (var kv in o) if (kv.Value is double) r[kv.Key] = ToCount(kv.Value);
            return r;
        }

        internal static Dictionary<string, bool> BoolMap(Dictionary<string, object> o)
        {
            var r = new Dictionary<string, bool>();
            foreach (var kv in o) if (kv.Value is bool b) r[kv.Key] = b;
            return r;
        }

        internal static List<string> Strings(Dictionary<string, object> o, string key)
        {
            var r = new List<string>();
            if (o != null && o.TryGetValue(key, out var v) && v is List<object> l)
                foreach (var x in l) if (x is string s) r.Add(s);
            return r;
        }
    }
}
