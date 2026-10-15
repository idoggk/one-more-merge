using System.Collections.Generic;

namespace OneMoreMerge.Core
{
    /// <summary>Unit rarity (src/content/units.ts Rarity).</summary>
    public enum Rarity { Common, Rare, Epic, Legendary }

    /// <summary>One row of src/content/units.ts UNITS (the flags-off collection: roster B units are not in this table).</summary>
    public sealed class UnitDef
    {
        public string Id;
        public string Role;   // SHOOTER / RELAY / MOVER / SUPPORT
        public Rarity Rarity;
        public string Slot;   // shooter / relay / helper
        public UnitDef(string id, string role, Rarity rarity, string slot) { Id = id; Role = role; Rarity = rarity; Slot = slot; }
    }

    /// <summary>Content tables the board reads: families (src/core/types.ts FAMILIES, same order), roles, UNITS, rank caps (src/content/tuning.ts MAX_RANK, game.ts capOf).</summary>
    public static class Content
    {
        public static readonly string[] Families =
        {
            "cannon", "coil", "bell", "magnet", "battery", "fan", "rocket", "mortar", "arc_welder", "horn", "fuse_box", "amplifier", "signal_beacon",
            "nail_gun", "jackhammer", "gear", "saw_blade",
            "wrench", "piston", "spring", "belt_drive",
            "blowtorch", "pipe", "blast_plate", "tesla_tower",
            "capacitor", "blueprint", "ladder", "rewind_crank",
            "crane", "dynamo", "wrecking_ball",
            "robot_arm", "tilt_lever",
            "rivet_gun", "vice", "router", "hydraulic_press", "lathe",
        };

        /// <summary>Flags-off UNITS (rosterB off: signal_beacon is Epic).</summary>
        public static readonly UnitDef[] Units =
        {
            new UnitDef("cannon", "SHOOTER", Rarity.Common, "shooter"),
            new UnitDef("coil", "RELAY", Rarity.Common, "relay"),
            new UnitDef("bell", "RELAY", Rarity.Common, "relay"),
            new UnitDef("horn", "RELAY", Rarity.Common, "relay"),
            new UnitDef("fan", "MOVER", Rarity.Common, "helper"),
            new UnitDef("rocket", "SHOOTER", Rarity.Rare, "shooter"),
            new UnitDef("mortar", "SHOOTER", Rarity.Rare, "shooter"),
            new UnitDef("fuse_box", "RELAY", Rarity.Rare, "relay"),
            new UnitDef("magnet", "MOVER", Rarity.Rare, "helper"),
            new UnitDef("battery", "SUPPORT", Rarity.Rare, "helper"),
            new UnitDef("amplifier", "SUPPORT", Rarity.Rare, "helper"),
            new UnitDef("arc_welder", "SHOOTER", Rarity.Epic, "shooter"),
            new UnitDef("signal_beacon", "SUPPORT", Rarity.Epic, "helper"),
        };

        public const int MaxRank = 6;
        public const int SagaRankCap = 8; // levels 21+ (newLevel: rankCap)

        static readonly HashSet<string> Shooters = new HashSet<string>
        {
            "cannon", "rocket", "mortar", "arc_welder", "nail_gun", "jackhammer", "saw_blade", "piston", "blowtorch", "tesla_tower",
            "wrecking_ball", "robot_arm", "rivet_gun", "hydraulic_press", "lathe",
        };
        static readonly HashSet<string> Relays = new HashSet<string>
        {
            "coil", "bell", "horn", "fuse_box", "gear", "spring", "belt_drive", "pipe", "capacitor", "ladder", "crane", "dynamo", "vice", "router",
        };

        /// <summary>types.ts isShooter.</summary>
        public static bool IsShooter(string family) { return Shooters.Contains(family); }
        /// <summary>types.ts isRelay.</summary>
        public static bool IsRelay(string family) { return Relays.Contains(family); }

        /// <summary>game.ts capOf: with no level (classic run) MaxRank; in a Saga level shooters and relays use the level's rank cap, everything else MaxRank.</summary>
        public static int CapOf(int? rankCap, string family)
        {
            if (rankCap == null) return MaxRank;
            return IsShooter(family) || IsRelay(family) ? rankCap.Value : MaxRank;
        }
    }
}
