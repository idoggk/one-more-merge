using System.IO;
using TMPro;
using UnityEditor;
using UnityEngine;
using UnityEngine.TextCore.LowLevel;

namespace OneMoreMerge.EditorTools
{
    // Builds the TextMeshPro SDF font asset for Lilita One (OFL, see Assets/Fonts/OFL-LilitaOne.txt).
    // Batch, two separate runs (the import finishes after the editor loop ticks):
    //   -executeMethod OneMoreMerge.EditorTools.FontAssetBuilder.ImportEssentials
    //   -executeMethod OneMoreMerge.EditorTools.FontAssetBuilder.Build
    public static class FontAssetBuilder
    {
        const string FontPath = "Assets/Fonts/LilitaOne-Regular.ttf";
        const string AssetPath = "Assets/Fonts/LilitaOne SDF.asset";
        const string Chars = " !\"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~×•";

        [MenuItem("One More Merge/Import TMP essentials")]
        public static void ImportEssentials()
        {
            string pkg = Path.GetFullPath("Packages/com.unity.ugui/Package Resources/TMP Essential Resources.unitypackage");
            // Run WITHOUT -quit: exit only once the async import has finished.
            AssetDatabase.importPackageCompleted += _ => EditorApplication.Exit(0);
            AssetDatabase.importPackageFailed += (_, e) => { Debug.LogError(e); EditorApplication.Exit(1); };
            AssetDatabase.ImportPackage(pkg, false);
        }

        [MenuItem("One More Merge/Build Lilita One font asset")]
        public static void Build()
        {
            if (File.Exists(AssetPath)) AssetDatabase.DeleteAsset(AssetPath);
            var font = AssetDatabase.LoadAssetAtPath<Font>(FontPath);
            var fa = TMP_FontAsset.CreateFontAsset(font, 90, 9, GlyphRenderMode.SDFAA, 1024, 1024, AtlasPopulationMode.Dynamic, true);
            fa.name = "LilitaOne SDF";
            AssetDatabase.CreateAsset(fa, AssetPath);
            fa.TryAddCharacters(Chars, out string missing);
            if (!string.IsNullOrEmpty(missing)) Debug.LogWarning("Font asset missing glyphs: " + missing);
            fa.material.name = "LilitaOne SDF Material";
            AssetDatabase.AddObjectToAsset(fa.material, fa);
            foreach (var tex in fa.atlasTextures)
            {
                tex.name = "LilitaOne SDF Atlas";
                AssetDatabase.AddObjectToAsset(tex, fa);
            }
            EditorUtility.SetDirty(fa);
            AssetDatabase.SaveAssets();

            var so = new SerializedObject(Resources.Load<TMP_Settings>("TMP Settings"));
            so.FindProperty("m_defaultFontAsset").objectReferenceValue = fa;
            so.ApplyModifiedPropertiesWithoutUndo();
            AssetDatabase.SaveAssets();
            Debug.Log("Built " + AssetPath);
        }
    }
}
