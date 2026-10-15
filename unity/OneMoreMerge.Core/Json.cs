using System;
using System.Collections.Generic;
using System.Globalization;
using System.Text;

namespace OneMoreMerge.Core
{
    /// <summary>
    /// Tiny read-only JSON reader (objects, arrays, strings, numbers, true/false/null). Written by hand so the core needs no
    /// System.Text.Json or Newtonsoft package inside Unity. Numbers are doubles (JS numbers).
    /// Result types: Dictionary&lt;string,object&gt;, List&lt;object&gt;, string, double, bool, null.
    /// </summary>
    public static class Json
    {
        public static object Parse(string text)
        {
            int i = 0;
            object v = ReadValue(text, ref i);
            SkipWs(text, ref i);
            if (i != text.Length) throw new FormatException("Trailing JSON text at " + i);
            return v;
        }

        static void SkipWs(string s, ref int i) { while (i < s.Length && char.IsWhiteSpace(s[i])) i++; }

        static object ReadValue(string s, ref int i)
        {
            SkipWs(s, ref i);
            if (i >= s.Length) throw new FormatException("Unexpected end of JSON");
            char c = s[i];
            if (c == '{') return ReadObject(s, ref i);
            if (c == '[') return ReadArray(s, ref i);
            if (c == '"') return ReadString(s, ref i);
            if (Match(s, ref i, "true")) return true;
            if (Match(s, ref i, "false")) return false;
            if (Match(s, ref i, "null")) return null;
            return ReadNumber(s, ref i);
        }

        static bool Match(string s, ref int i, string word)
        {
            if (string.CompareOrdinal(s, i, word, 0, word.Length) != 0) return false;
            i += word.Length;
            return true;
        }

        static Dictionary<string, object> ReadObject(string s, ref int i)
        {
            var d = new Dictionary<string, object>();
            i++; // {
            SkipWs(s, ref i);
            if (s[i] == '}') { i++; return d; }
            while (true)
            {
                SkipWs(s, ref i);
                string key = ReadString(s, ref i);
                SkipWs(s, ref i);
                if (s[i++] != ':') throw new FormatException("Expected ':' at " + (i - 1));
                d[key] = ReadValue(s, ref i);
                SkipWs(s, ref i);
                char e = s[i++];
                if (e == '}') return d;
                if (e != ',') throw new FormatException("Expected ',' or '}' at " + (i - 1));
            }
        }

        static List<object> ReadArray(string s, ref int i)
        {
            var l = new List<object>();
            i++; // [
            SkipWs(s, ref i);
            if (s[i] == ']') { i++; return l; }
            while (true)
            {
                l.Add(ReadValue(s, ref i));
                SkipWs(s, ref i);
                char e = s[i++];
                if (e == ']') return l;
                if (e != ',') throw new FormatException("Expected ',' or ']' at " + (i - 1));
            }
        }

        static string ReadString(string s, ref int i)
        {
            if (s[i] != '"') throw new FormatException("Expected string at " + i);
            i++;
            var sb = new StringBuilder();
            while (true)
            {
                char c = s[i++];
                if (c == '"') return sb.ToString();
                if (c != '\\') { sb.Append(c); continue; }
                char e = s[i++];
                switch (e)
                {
                    case 'n': sb.Append('\n'); break;
                    case 't': sb.Append('\t'); break;
                    case 'r': sb.Append('\r'); break;
                    case 'b': sb.Append('\b'); break;
                    case 'f': sb.Append('\f'); break;
                    case 'u':
                        sb.Append((char)int.Parse(s.Substring(i, 4), NumberStyles.HexNumber, CultureInfo.InvariantCulture));
                        i += 4;
                        break;
                    default: sb.Append(e); break; // " \ /
                }
            }
        }

        static double ReadNumber(string s, ref int i)
        {
            int start = i;
            while (i < s.Length && "+-0123456789.eE".IndexOf(s[i]) >= 0) i++;
            if (i == start) throw new FormatException("Unexpected character '" + s[i] + "' at " + i);
            return double.Parse(s.Substring(start, i - start), NumberStyles.Float, CultureInfo.InvariantCulture);
        }
    }
}
