using System.IO;
using OneMoreMerge.Game;
using TMPro;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.EventSystems;
using UnityEngine.SceneManagement;
using UnityEngine.UI;

namespace OneMoreMerge.EditorTools
{
    // Creates Assets/Scenes/WebGlTest.unity (coloured screen, button, cannon hop) and puts it in the build list.
    // Run from the menu or: -executeMethod OneMoreMerge.EditorTools.WebGlTestSceneBuilder.Build
    public static class WebGlTestSceneBuilder
    {
        public const string ScenePath = "Assets/Scenes/WebGlTest.unity";
        const string FontPath = "Assets/Fonts/LilitaOne SDF.asset";

        [MenuItem("One More Merge/Build WebGL test scene")]
        public static void Build()
        {
            Directory.CreateDirectory("Assets/Scenes");
            Scene scene = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);

            var cam = new GameObject("Main Camera", typeof(Camera));
            cam.tag = "MainCamera";
            Camera c = cam.GetComponent<Camera>();
            c.clearFlags = CameraClearFlags.SolidColor;
            c.backgroundColor = Color.black;
            c.orthographic = true;

            var canvasGo = new GameObject("Canvas", typeof(Canvas), typeof(CanvasScaler), typeof(GraphicRaycaster));
            canvasGo.GetComponent<Canvas>().renderMode = RenderMode.ScreenSpaceOverlay;
            var scaler = canvasGo.GetComponent<CanvasScaler>();
            scaler.uiScaleMode = CanvasScaler.ScaleMode.ScaleWithScreenSize;
            scaler.referenceResolution = new Vector2(1080, 1920);
            scaler.matchWidthOrHeight = 0.5f;
            var root = (RectTransform)canvasGo.transform;

            Image bg = MakeImage("Background", root, Color.black);
            Stretch(bg.rectTransform);

            var plates = new RectTransform[5];
            for (int i = 0; i < plates.Length; i++)
            {
                Image p = MakeImage("Plate" + i, root, new Color(0.85f, 0.65f, 0.25f));
                p.rectTransform.sizeDelta = new Vector2(260, 90);
                p.rectTransform.anchoredPosition = new Vector2(i % 2 == 0 ? -160 : 160, -520 + i * 230);
                plates[i] = p.rectTransform;
            }

            Image cannon = MakeImage("Cannon", root, new Color(0.85f, 0.15f, 0.12f));
            cannon.rectTransform.sizeDelta = new Vector2(130, 130);

            TMP_FontAsset font = AssetDatabase.LoadAssetAtPath<TMP_FontAsset>(FontPath);
            TMP_Text label = MakeText("HopCount", root, font, "Hops: 0", 90);
            label.rectTransform.anchorMin = label.rectTransform.anchorMax = new Vector2(0.5f, 1f);
            label.rectTransform.anchoredPosition = new Vector2(0, -170);
            label.rectTransform.sizeDelta = new Vector2(800, 140);

            Image btn = MakeImage("HopButton", root, new Color(0.95f, 0.7f, 0.15f));
            btn.rectTransform.anchorMin = btn.rectTransform.anchorMax = new Vector2(0.5f, 0f);
            btn.rectTransform.anchoredPosition = new Vector2(0, 230);
            btn.rectTransform.sizeDelta = new Vector2(620, 220);
            var button = btn.gameObject.AddComponent<Button>();
            button.targetGraphic = btn;
            TMP_Text btnText = MakeText("Text", btn.rectTransform, font, "HOP", 110);
            Stretch(btnText.rectTransform);
            btnText.color = new Color(0.2f, 0.1f, 0.05f);

            var test = canvasGo.AddComponent<CannonHopTest>();
            test.cannon = cannon.rectTransform;
            test.plates = plates;
            test.background = bg;
            test.label = label;
            UnityEditor.Events.UnityEventTools.AddPersistentListener(button.onClick, test.Hop);

            new GameObject("EventSystem", typeof(EventSystem), typeof(StandaloneInputModule));

            EditorSceneManager.SaveScene(scene, ScenePath);
            EditorBuildSettings.scenes = new[] { new EditorBuildSettingsScene(ScenePath, true) };
            Debug.Log("Saved " + ScenePath);
        }

        static Image MakeImage(string name, Transform parent, Color color)
        {
            var go = new GameObject(name, typeof(RectTransform), typeof(Image));
            go.transform.SetParent(parent, false);
            var img = go.GetComponent<Image>();
            img.color = color;
            return img;
        }

        static TMP_Text MakeText(string name, Transform parent, TMP_FontAsset font, string text, float size)
        {
            var go = new GameObject(name, typeof(RectTransform), typeof(TextMeshProUGUI));
            go.transform.SetParent(parent, false);
            var t = go.GetComponent<TextMeshProUGUI>();
            if (font != null) t.font = font;
            t.text = text;
            t.fontSize = size;
            t.alignment = TextAlignmentOptions.Center;
            t.color = Color.white;
            t.raycastTarget = false;
            return t;
        }

        static void Stretch(RectTransform rt)
        {
            rt.anchorMin = Vector2.zero;
            rt.anchorMax = Vector2.one;
            rt.offsetMin = rt.offsetMax = Vector2.zero;
        }
    }
}
