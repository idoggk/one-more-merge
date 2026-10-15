using System;
using System.Collections.Generic;

namespace OneMoreMerge.Core
{
    /// <summary>Port of src/core/rng.ts. Mulberry32: the whole state is one uint32. Must match the TS output bit for bit.</summary>
    public sealed class Rng
    {
        public uint State;

        public Rng(uint state) { State = state; }

        /// <summary>Double in [0,1), same value as the TS next().</summary>
        public double Next()
        {
            unchecked
            {
                State += 0x6d2b79f5u;
                uint t = State;
                t = (t ^ (t >> 15)) * (t | 1u);
                t ^= t + (t ^ (t >> 7)) * (t | 61u);
                return (t ^ (t >> 14)) / 4294967296.0;
            }
        }

        /// <summary>floor(next() * n), same as the TS int(n).</summary>
        public int Int(int n) { return (int)Math.Floor(Next() * n); }

        /// <summary>Fisher-Yates from the end, same draw order as the TS shuffle.</summary>
        public void Shuffle<T>(IList<T> a)
        {
            for (int i = a.Count - 1; i > 0; i--)
            {
                int j = Int(i + 1);
                T tmp = a[i]; a[i] = a[j]; a[j] = tmp;
            }
        }
    }
}
