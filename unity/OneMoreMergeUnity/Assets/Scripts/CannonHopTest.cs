using TMPro;
using UnityEngine;
using UnityEngine.UI;

namespace OneMoreMerge.Game
{
    // WebGL smoke test: a red "cannon" hops up a column of plates each time the button is pressed
    // (mouse click or touch), and the background colour changes. Wired up by WebGlTestSceneBuilder.
    public class CannonHopTest : MonoBehaviour
    {
        public RectTransform cannon;
        public RectTransform[] plates;
        public Image background;
        public TMP_Text label;
        public float hopSeconds = 0.45f;
        public float hopHeight = 140f;

        static readonly Color[] Backgrounds =
        {
            new Color(0.11f, 0.15f, 0.25f), new Color(0.16f, 0.30f, 0.22f),
            new Color(0.32f, 0.18f, 0.30f), new Color(0.35f, 0.26f, 0.12f),
        };

        int index;
        int hops;
        float t = 1f;
        Vector2 from, to;

        void Start()
        {
            cannon.anchoredPosition = plates[0].anchoredPosition;
            background.color = Backgrounds[0]; // scene file stores black; show the intended colour from frame 1
            Refresh();
        }

        public void Hop()
        {
            if (t < 1f) return;
            from = cannon.anchoredPosition;
            index = (index + 1) % plates.Length;
            to = plates[index].anchoredPosition;
            t = 0f;
            hops++;
            background.color = Backgrounds[hops % Backgrounds.Length];
            Refresh();
        }

        void Update()
        {
            if (t >= 1f) return;
            t = Mathf.Min(1f, t + Time.deltaTime / hopSeconds);
            Vector2 p = Vector2.Lerp(from, to, t);
            p.y += Mathf.Sin(t * Mathf.PI) * hopHeight;
            cannon.anchoredPosition = p;
        }

        void Refresh() { if (label != null) label.text = "Hops: " + hops; }
    }
}
