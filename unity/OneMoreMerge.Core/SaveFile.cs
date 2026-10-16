using System;
using System.IO;
using System.Text;

namespace OneMoreMerge.Core
{
    /// <summary>JSON file save. Writes are atomic (temp file then replace) and keep the previous file as ".bak".</summary>
    public static class SaveFile
    {
        static readonly UTF8Encoding Utf8 = new UTF8Encoding(false);

        public static void Save(string path, SaveData data)
        {
            string dir = Path.GetDirectoryName(Path.GetFullPath(path));
            if (!string.IsNullOrEmpty(dir)) Directory.CreateDirectory(dir);
            string tmp = path + ".tmp";
            File.WriteAllText(tmp, SaveSerializer.ToJson(data), Utf8);
            if (File.Exists(path)) File.Replace(tmp, path, path + ".bak");
            else File.Move(tmp, path);
        }

        /// <summary>The saved data, or a fresh SaveData when there is no file. A damaged file falls back to ".bak", then fresh.</summary>
        public static SaveData Load(string path)
        {
            return TryRead(path) ?? TryRead(path + ".bak") ?? new SaveData();
        }

        static SaveData TryRead(string path)
        {
            if (!File.Exists(path)) return null;
            try { return SaveSerializer.FromJson(File.ReadAllText(path, Utf8)); }
            catch (FormatException) { return null; }
        }
    }
}
