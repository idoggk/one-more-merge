using System;
using System.IO;
using UnityEditor;
using UnityEditor.Build;
using UnityEditor.Build.Reporting;
using UnityEngine;

namespace OneMoreMerge.EditorTools
{
    // Batch build: Unity.exe -batchmode -nographics -quit -projectPath unity/OneMoreMergeUnity
    //   -executeMethod OneMoreMerge.EditorTools.BuildScript.BuildWindows [-buildOutput Builds/Win]
    public static class BuildScript
    {
        const string DefaultOutput = "Builds/Windows/OneMoreMerge.exe";

        const string WebGlOutput = "../Builds/WebGL"; // relative to the project: unity/Builds/WebGL (git-ignored)

        static string Arg(string name, string fallback)
        {
            string[] args = Environment.GetCommandLineArgs();
            for (int i = 0; i < args.Length - 1; i++)
                if (args[i] == name) return args[i + 1];
            return fallback;
        }

        // iPhone Safari build that GitHub Pages can host (no custom headers, no threads, small start memory).
        //   ... -executeMethod OneMoreMerge.EditorTools.BuildScript.BuildWebGL [-buildOutput ../Builds/WebGL]
        //   [-webglCompression none|gzip]   none (default) = plain files; gzip = gzip + JS decompression fallback
        public static void BuildWebGL()
        {
            string output = Arg("-buildOutput", WebGlOutput);
            string compression = Arg("-webglCompression", "none");

            WebGlTestSceneBuilder.Build(); // regenerates the smoke-test scene and the build scene list

            PlayerSettings.WebGL.template = "PROJECT:OMMPortrait";
            PlayerSettings.WebGL.threadsSupport = false;
            PlayerSettings.WebGL.initialMemorySize = 256;
            PlayerSettings.WebGL.maximumMemorySize = 1024;
            PlayerSettings.WebGL.memoryGrowthMode = WebGLMemoryGrowthMode.Geometric;
            PlayerSettings.WebGL.exceptionSupport = WebGLExceptionSupport.ExplicitlyThrownExceptionsOnly;
            PlayerSettings.WebGL.dataCaching = true;
            if (compression == "gzip")
            {
                PlayerSettings.WebGL.compressionFormat = WebGLCompressionFormat.Gzip;
                PlayerSettings.WebGL.decompressionFallback = true;
            }
            else
            {
                PlayerSettings.WebGL.compressionFormat = WebGLCompressionFormat.Disabled;
                PlayerSettings.WebGL.decompressionFallback = false;
            }
            PlayerSettings.defaultInterfaceOrientation = UIOrientation.Portrait;
            PlayerSettings.runInBackground = false;

            Directory.CreateDirectory(output);
            var options = new BuildPlayerOptions
            {
                scenes = Array.ConvertAll(EditorBuildSettings.scenes, s => s.path),
                locationPathName = output,
                target = BuildTarget.WebGL,
                options = BuildOptions.None,
            };
            BuildReport report = BuildPipeline.BuildPlayer(options);
            Debug.Log("WebGL build " + report.summary.result + " (" + compression + "): "
                + report.summary.totalSize + " bytes -> " + output);
            if (report.summary.result != BuildResult.Succeeded)
                EditorApplication.Exit(1);
        }

        public static void BuildWindows()
        {
            string output = Arg("-buildOutput", DefaultOutput);

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
