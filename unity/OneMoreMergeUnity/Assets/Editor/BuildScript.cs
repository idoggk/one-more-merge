using System;
using System.IO;
using UnityEditor;
using UnityEditor.Build.Reporting;
using UnityEngine;

namespace OneMoreMerge.EditorTools
{
    // Batch build: Unity.exe -batchmode -nographics -quit -projectPath unity/OneMoreMergeUnity
    //   -executeMethod OneMoreMerge.EditorTools.BuildScript.BuildWindows [-buildOutput Builds/Win]
    public static class BuildScript
    {
        const string DefaultOutput = "Builds/Windows/OneMoreMerge.exe";

        public static void BuildWindows()
        {
            string output = DefaultOutput;
            string[] args = Environment.GetCommandLineArgs();
            for (int i = 0; i < args.Length - 1; i++)
                if (args[i] == "-buildOutput") output = args[i + 1];

            string dir = Path.GetDirectoryName(output);
            if (!string.IsNullOrEmpty(dir)) Directory.CreateDirectory(dir);

            string[] scenes = Array.ConvertAll(EditorBuildSettings.scenes, s => s.path);
            var options = new BuildPlayerOptions
            {
                scenes = scenes,
                locationPathName = output,
                target = BuildTarget.StandaloneWindows64,
                options = BuildOptions.None,
            };

            BuildReport report = BuildPipeline.BuildPlayer(options);
            BuildSummary summary = report.summary;
            Debug.Log("Build " + summary.result + ": " + summary.totalSize + " bytes -> " + output);
            if (summary.result != BuildResult.Succeeded)
                EditorApplication.Exit(1);
        }
    }
}
